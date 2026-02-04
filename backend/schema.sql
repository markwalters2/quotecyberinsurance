-- QuoteCyberInsurance.com Database Schema
-- PostgreSQL

-- Main leads table
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contact info
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    company_name VARCHAR(255),
    
    -- Business profile
    industry VARCHAR(100),
    revenue_range VARCHAR(50),
    employee_count_range VARCHAR(50),
    location_state VARCHAR(2),
    location_city VARCHAR(100),
    website VARCHAR(255),
    
    -- Cyber risk assessment data (full JSON)
    assessment_data JSONB,
    
    -- AI scoring results
    risk_score INTEGER, -- 0-100
    risk_level VARCHAR(20), -- low, medium, high, critical
    ai_insights TEXT,
    ai_recommendations TEXT,
    recommended_coverage INTEGER, -- suggested limit
    estimated_premium_low INTEGER,
    estimated_premium_high INTEGER,
    
    -- Lead qualification
    lead_quality VARCHAR(20), -- cold, warm, hot, qualified
    urgency_score INTEGER, -- 0-10
    fit_score INTEGER, -- 0-50
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'new', -- new, contacted, quoted, won, lost, nurture
    close_crm_id VARCHAR(100), -- Close.com lead ID
    assigned_to VARCHAR(100) DEFAULT 'Mark', -- Mark's user ID
    
    -- Engagement tracking
    page_views INTEGER DEFAULT 1,
    assessment_started BOOLEAN DEFAULT false,
    assessment_completed BOOLEAN DEFAULT false,
    email_opened BOOLEAN DEFAULT false,
    email_clicked BOOLEAN DEFAULT false,
    call_scheduled BOOLEAN DEFAULT false,
    quote_sent BOOLEAN DEFAULT false,
    
    -- UTM tracking (marketing attribution)
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    utm_content VARCHAR(100),
    utm_term VARCHAR(100),
    
    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer TEXT,
    
    CONSTRAINT unique_email_per_assessment UNIQUE (email, created_at)
);

-- Email log table
CREATE TABLE IF NOT EXISTS email_log (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    email_type VARCHAR(50), -- assessment_report, nurture_1, nurture_2, quote_sent, etc.
    subject VARCHAR(255),
    status VARCHAR(20), -- sent, delivered, opened, clicked, bounced, failed
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    bounced_at TIMESTAMP,
    error_message TEXT
);

-- Assessment responses table (detailed breakdown)
CREATE TABLE IF NOT EXISTS assessment_responses (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    question_id VARCHAR(100),
    question_text TEXT,
    answer TEXT,
    risk_weight INTEGER, -- how this answer affects risk score
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notes table (for Mark's internal notes)
CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100), -- user ID
    note_text TEXT,
    note_type VARCHAR(50) -- general, call, meeting, quote, etc.
);

-- Quotes table (when Mark sends actual quotes)
CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    carrier VARCHAR(100), -- Coalition, At-Bay, Cowbell, etc.
    coverage_limit INTEGER,
    annual_premium INTEGER,
    deductible INTEGER,
    quote_pdf_url TEXT,
    status VARCHAR(50), -- sent, accepted, declined, expired
    expires_at TIMESTAMP,
    accepted_at TIMESTAMP,
    declined_at TIMESTAMP,
    declined_reason TEXT
);

-- Policies table (when quote becomes active policy)
CREATE TABLE IF NOT EXISTS policies (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id),
    quote_id INTEGER REFERENCES quotes(id),
    policy_number VARCHAR(100),
    carrier VARCHAR(100),
    coverage_limit INTEGER,
    annual_premium INTEGER,
    commission_amount INTEGER,
    commission_percent DECIMAL(5,2),
    effective_date DATE,
    expiration_date DATE,
    status VARCHAR(50), -- active, cancelled, expired, renewed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT
);

-- Indexes for performance
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_lead_quality ON leads(lead_quality);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_close_crm_id ON leads(close_crm_id);
CREATE INDEX idx_email_log_lead_id ON email_log(lead_id);
CREATE INDEX idx_email_log_status ON email_log(status);
CREATE INDEX idx_notes_lead_id ON notes(lead_id);
CREATE INDEX idx_quotes_lead_id ON quotes(lead_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_policies_lead_id ON policies(lead_id);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_effective_date ON policies(effective_date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing (optional)
-- INSERT INTO leads (email, first_name, last_name, company_name, industry, revenue_range, employee_count_range, risk_score, risk_level, lead_quality)
-- VALUES ('test@example.com', 'John', 'Doe', 'Test Corp', 'Technology', '1M-5M', '10-50', 65, 'medium', 'hot');

-- View for Mark's dashboard (qualified leads only)
CREATE OR REPLACE VIEW qualified_leads AS
SELECT 
    id, company_name, first_name, last_name, email, phone,
    industry, revenue_range, employee_count_range,
    risk_score, risk_level, estimated_premium_low, estimated_premium_high,
    lead_quality, urgency_score, status, created_at
FROM leads
WHERE lead_quality IN ('qualified', 'hot')
    AND status NOT IN ('lost', 'won')
ORDER BY urgency_score DESC, created_at DESC;

-- View for pipeline analytics
CREATE OR REPLACE VIEW pipeline_stats AS
SELECT 
    status,
    lead_quality,
    COUNT(*) as count,
    AVG(risk_score) as avg_risk_score,
    AVG(estimated_premium_low) as avg_premium_low,
    AVG(estimated_premium_high) as avg_premium_high
FROM leads
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY status, lead_quality
ORDER BY status, lead_quality;
