// QuoteCyberInsurance.com - Backend API Server
// Node.js + Express

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Database connection (PostgreSQL)
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Anthropic Claude client for AI risk scoring
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('../')); // Serve frontend files

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// ============================================================================
// API ENDPOINTS
// ============================================================================

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Submit assessment
app.post('/api/assessment/submit', async (req, res) => {
    try {
        const assessmentData = req.body;
        console.log('Assessment submission:', assessmentData.email);

        // 1. Calculate AI risk score
        const riskAnalysis = await calculateRiskScore(assessmentData);
        console.log('Risk analysis complete:', riskAnalysis.score);

        // 2. Calculate lead quality score
        const leadScore = calculateLeadScore(assessmentData, riskAnalysis);
        console.log('Lead score:', leadScore.total);

        // 3. Estimate premium range
        const premiumEstimate = estimatePremium(assessmentData, riskAnalysis);
        console.log('Premium estimate:', premiumEstimate);

        // 4. Save to database
        const leadResult = await db.query(`
            INSERT INTO leads (
                email, first_name, last_name, phone, company_name,
                industry, revenue_range, employee_count_range, location_state,
                assessment_data, risk_score, risk_level,
                estimated_premium_low, estimated_premium_high,
                lead_quality, urgency_score, fit_score,
                assessment_completed, ip_address, user_agent, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW())
            RETURNING id
        `, [
            assessmentData.email,
            assessmentData.firstName,
            assessmentData.lastName,
            assessmentData.phone || null,
            assessmentData.companyName,
            assessmentData.industry,
            assessmentData.revenue,
            assessmentData.employees,
            assessmentData.state,
            JSON.stringify(assessmentData),
            riskAnalysis.score,
            riskAnalysis.level,
            premiumEstimate.low,
            premiumEstimate.high,
            leadScore.quality,
            leadScore.urgency,
            leadScore.fit,
            true,
            req.ip,
            req.get('user-agent'),
        ]);

        const leadId = leadResult.rows[0].id;
        console.log('Lead saved:', leadId);

        // 5. Sync to Close CRM (async, don't wait)
        syncToCloseCRM(leadId, assessmentData, riskAnalysis, premiumEstimate, leadScore)
            .catch(err => console.error('Close CRM sync error:', err));

        // 6. Send email report (async, don't wait)
        sendAssessmentEmail(assessmentData, riskAnalysis, premiumEstimate, leadId)
            .catch(err => console.error('Email send error:', err));

        // 7. Distribute lead to appropriate team member
        const leadDistribution = require('./lead-distribution');
        const assignedTo = leadDistribution.assignLead({
            state: assessmentData.state,
            revenue: assessmentData.revenue,
            industry: assessmentData.industry,
            urgency: assessmentData.timeframe === 'immediate' ? 'high' : 'normal'
        });
        
        // Notify assigned team member if qualified/hot lead
        if (leadScore.quality === 'qualified' || leadScore.quality === 'hot') {
            notifyTeamMember(assignedTo, leadId, assessmentData, riskAnalysis, leadScore)
                .catch(err => console.error('Team notification error:', err));
        }

        // Return success
        res.json({
            success: true,
            leadId: leadId,
            riskScore: riskAnalysis.score,
            riskLevel: riskAnalysis.level,
            insights: riskAnalysis.insights,
            premiumEstimate: premiumEstimate,
            leadQuality: leadScore.quality
        });

    } catch (error) {
        console.error('Assessment submission error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process assessment. Please try again.'
        });
    }
});

// Get assessment results (for results page)
app.get('/api/assessment/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(`
            SELECT id, company_name, risk_score, risk_level,
                   estimated_premium_low, estimated_premium_high,
                   assessment_data, lead_quality, created_at
            FROM leads
            WHERE id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Assessment not found' });
        }

        const lead = result.rows[0];
        const assessmentData = lead.assessment_data;

        // Re-generate insights (or retrieve from DB if stored)
        const riskAnalysis = await calculateRiskScore(assessmentData);

        res.json({
            success: true,
            leadId: lead.id,
            companyName: lead.company_name,
            riskScore: lead.risk_score,
            riskLevel: lead.risk_level,
            insights: riskAnalysis.insights,
            premiumLow: lead.estimated_premium_low,
            premiumHigh: lead.estimated_premium_high,
            leadQuality: lead.lead_quality,
            createdAt: lead.created_at
        });

    } catch (error) {
        console.error('Get assessment error:', error);
        res.status(500).json({ error: 'Failed to retrieve assessment' });
    }
});

// ============================================================================
// AI RISK SCORING FUNCTION
// ============================================================================

async function calculateRiskScore(data) {
    const prompt = `You are a cyber insurance underwriter. Analyze this business profile and provide a risk assessment.

Business Profile:
- Company: ${data.companyName}
- Industry: ${data.industry}
- Revenue: ${data.revenue}
- Employees: ${data.employees}
- Data handled: ${data.dataTypes?.join(', ') || 'None specified'}
- Record count: ${data.recordCount}
- Payment processing: ${data.paymentProcessing}
- MFA enabled: ${data.mfa}
- Security training: ${data.training}
- Security tools: ${data.securityTools?.join(', ') || 'None'}
- IT support: ${data.itSupport}
- Timeline: ${data.timeline}
- Motivation: ${data.motivation}

Provide a comprehensive risk assessment in JSON format:
{
    "riskScore": <0-100>,
    "riskLevel": "<low|medium|high|critical>",
    "topRiskFactors": ["factor1", "factor2", "factor3"],
    "strengths": ["strength1", "strength2"],
    "recommendations": ["rec1", "rec2", "rec3"],
    "leadQuality": "<cold|warm|hot|qualified>",
    "urgencyScore": <0-10>,
    "reasoning": "Brief explanation of the assessment"
}

Be specific and actionable in your recommendations.`;

    try {
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4',
            max_tokens: 1024,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        const responseText = message.content[0].text;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const response = JSON.parse(jsonMatch[0]);

        return {
            score: response.riskScore,
            level: response.riskLevel,
            insights: response.topRiskFactors,
            strengths: response.strengths,
            recommendations: response.recommendations,
            leadQuality: response.leadQuality,
            urgency: response.urgencyScore,
            reasoning: response.reasoning
        };

    } catch (error) {
        console.error('AI risk scoring error:', error);
        // Fallback to rule-based scoring if AI fails
        return fallbackRiskScoring(data);
    }
}

// Fallback rule-based risk scoring
function fallbackRiskScoring(data) {
    let score = 50; // baseline

    // Industry risk
    const highRiskIndustries = ['Healthcare', 'Financial Services', 'Technology'];
    if (highRiskIndustries.includes(data.industry)) score += 15;

    // Data exposure
    if (data.dataTypes?.includes('payment_cards')) score += 10;
    if (data.dataTypes?.includes('healthcare')) score += 10;
    if (data.dataTypes?.includes('ssn')) score += 10;

    // Security posture
    if (data.mfa === 'no' || data.mfa === 'not_sure') score += 15;
    if (data.training === 'no') score += 12;
    if (data.securityTools?.length === 0 || data.securityTools?.includes('none')) score += 15;
    if (data.itSupport === 'none') score += 10;

    // Protective factors
    if (data.mfa === 'yes_everywhere') score -= 8;
    if (data.training === 'quarterly') score -= 7;
    if (data.securityTools?.includes('backup')) score -= 6;
    if (data.itSupport === 'internal' || data.itSupport === 'msp') score -= 8;

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    let level = 'medium';
    if (score < 30) level = 'low';
    else if (score < 60) level = 'medium';
    else if (score < 80) level = 'high';
    else level = 'critical';

    return {
        score,
        level,
        insights: [
            data.mfa === 'no' ? 'No multi-factor authentication' : null,
            data.training === 'no' ? 'No employee training' : null,
            data.securityTools?.length === 0 ? 'Minimal security tools' : null
        ].filter(Boolean),
        strengths: [],
        recommendations: [],
        urgency: 5
    };
}

// ============================================================================
// LEAD SCORING FUNCTION
// ============================================================================

function calculateLeadScore(data, risk) {
    let fitScore = 0;
    let urgencyScore = 0;

    // FIT SCORE (0-50)
    // Revenue
    const revenueScores = {
        '<500K': 5,
        '500K-1M': 10,
        '1M-5M': 15,
        '5M-20M': 20,
        '20M-50M': 20,
        '50M+': 15
    };
    fitScore += revenueScores[data.revenue] || 10;

    // Employees
    const employeeScores = {
        '1-5': 5,
        '5-10': 10,
        '10-50': 15,
        '50-200': 15,
        '200+': 10
    };
    fitScore += employeeScores[data.employees] || 10;

    // Industry
    const industryScores = {
        'Technology': 15,
        'Healthcare': 15,
        'Financial Services': 15,
        'Professional Services': 12,
        'Retail': 12,
        'Manufacturing': 8,
        'Construction': 5
    };
    fitScore += industryScores[data.industry] || 8;

    // URGENCY SCORE (0-30)
    // Timeline
    const timelineScores = {
        'immediately': 20,
        '30_days': 15,
        '30-90_days': 10,
        '90+_days': 5,
        'just_looking': 3
    };
    urgencyScore += timelineScores[data.timeline] || 5;

    // Motivation
    const motivationScores = {
        'contract': 10,
        'compliance': 10,
        'incident': 8,
        'proactive': 7,
        'shopping': 5,
        'inquiry': 2
    };
    urgencyScore += motivationScores[data.motivation] || 5;

    // Calculate total and quality
    const totalScore = fitScore + urgencyScore;

    let quality = 'cold';
    if (totalScore >= 70) quality = 'qualified';
    else if (totalScore >= 50) quality = 'hot';
    else if (totalScore >= 30) quality = 'warm';

    return {
        total: totalScore,
        fit: fitScore,
        urgency: urgencyScore,
        quality: quality
    };
}

// ============================================================================
// PREMIUM ESTIMATION FUNCTION
// ============================================================================

function estimatePremium(data, risk) {
    let basePremium = 1500; // minimum

    // Revenue multiplier
    const revenueMultipliers = {
        '<500K': 1.0,
        '500K-1M': 1.2,
        '1M-5M': 1.5,
        '5M-20M': 2.5,
        '20M-50M': 4.0,
        '50M+': 6.0
    };
    basePremium *= (revenueMultipliers[data.revenue] || 1.5);

    // Risk score multiplier
    basePremium *= (1 + (risk.score / 100));

    // Industry modifier
    const industryModifiers = {
        'Technology': 1.3,
        'Healthcare': 1.4,
        'Financial Services': 1.5,
        'Retail': 1.2,
        'Professional Services': 1.1,
        'Manufacturing': 1.0,
        'Construction': 0.9
    };
    basePremium *= (industryModifiers[data.industry] || 1.0);

    // Coverage limit modifier
    const limitModifiers = {
        '1M': 1.0,
        '2M': 1.4,
        '5M': 2.2,
        '10M+': 3.5
    };
    basePremium *= (limitModifiers[data.coverageLimit] || 1.4);

    // Return range (±20%)
    return {
        low: Math.round(basePremium * 0.8),
        high: Math.round(basePremium * 1.2),
        estimate: Math.round(basePremium)
    };
}

// ============================================================================
// CLOSE CRM INTEGRATION
// ============================================================================

async function syncToCloseCRM(leadId, data, risk, premium, leadScore) {
    const closeApiKey = process.env.CLOSE_API_KEY;
    if (!closeApiKey) {
        console.log('Close API key not configured, skipping CRM sync');
        return;
    }

    const leadData = {
        name: data.companyName,
        description: `${data.industry} • ${data.revenue} revenue • ${data.employees} employees`,
        contacts: [{
            name: `${data.firstName} ${data.lastName}`,
            emails: [{ email: data.email, type: 'office' }],
            phones: data.phone ? [{ phone: data.phone, type: 'office' }] : []
        }],
        custom: {
            'Risk Score': risk.score,
            'Risk Level': risk.level,
            'Estimated Premium': `$${premium.low}-${premium.high}`,
            'Lead Quality': leadScore.quality,
            'Urgency Score': leadScore.urgency,
            'Timeline': data.timeline,
            'Motivation': data.motivation,
            'Assessment ID': leadId.toString()
        }
    };

    try {
        const response = await fetch('https://api.close.com/api/v1/lead/', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(closeApiKey + ':').toString('base64')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(leadData)
        });

        const closeData = await response.json();
        console.log('Synced to Close CRM:', closeData.id);

        // Update our DB with Close ID
        await db.query(
            'UPDATE leads SET close_crm_id = $1 WHERE id = $2',
            [closeData.id, leadId]
        );

    } catch (error) {
        console.error('Close CRM sync error:', error);
    }
}

// ============================================================================
// EMAIL FUNCTIONS
// ============================================================================

async function sendAssessmentEmail(data, risk, premium, leadId) {
    console.log('TODO: Send assessment email to:', data.email);
    // Integration with SendGrid/Resend would go here
    // This would send the personalized risk report
}

async function notifyMark(leadId, data, risk, leadScore) {
    console.log('TODO: Notify Mark about qualified lead:', data.companyName);
    // Send SMS/email to Mark about qualified lead
    // Could use Twilio for SMS, SendGrid for email
}

// ============================================================================
// ADMIN ENDPOINTS (for Mark)
// ============================================================================

// Simple auth middleware (replace with proper auth in production)
const adminAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey === process.env.ADMIN_API_KEY) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Get all leads
app.get('/api/admin/leads', adminAuth, async (req, res) => {
    try {
        const { status, quality, limit = 50 } = req.query;

        let query = 'SELECT * FROM leads WHERE 1=1';
        const params = [];

        if (status) {
            params.push(status);
            query += ` AND status = $${params.length}`;
        }

        if (quality) {
            params.push(quality);
            query += ` AND lead_quality = $${params.length}`;
        }

        query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
        params.push(limit);

        const result = await db.query(query, params);
        res.json({ success: true, leads: result.rows });

    } catch (error) {
        console.error('Get leads error:', error);
        res.status(500).json({ error: 'Failed to retrieve leads' });
    }
});

// Update lead status
app.patch('/api/admin/leads/:id/status', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        await db.query(
            'UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2',
            [status, id]
        );

        res.json({ success: true });

    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(port, () => {
    console.log(`🚀 QuoteCyberInsurance API running on port ${port}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
    console.log(`   Anthropic: ${process.env.ANTHROPIC_API_KEY ? 'Configured' : 'Not configured'}`);
    console.log(`   Close CRM: ${process.env.CLOSE_API_KEY ? 'Configured' : 'Not configured'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    db.end();
    process.exit(0);
});
