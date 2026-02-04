// Lead Distribution System for QuoteCyber
// Automatically routes leads to Mark, David, or Jason based on geography

const leadDistribution = {
    // Team member configurations
    team: {
        mark: {
            name: 'Mark Walters',
            email: 'mark@joinalliancerisk.com',
            phone: '312-XXX-XXXX',
            location: 'Chicago',
            territories: ['IL', 'WI', 'IN', 'MI', 'OH', 'IA', 'MO', 'MN', 'ND', 'SD', 'NE', 'KS', 
                         'MT', 'WY', 'CO', 'NM', 'UT', 'ID', 'WA', 'OR', 'CA', 'NV', 'AZ', 
                         'AK', 'HI'], // Midwest & West
            timezone: 'America/Chicago'
        },
        david: {
            name: 'David',
            email: 'david@joinalliancerisk.com', // UPDATE WITH REAL EMAIL
            phone: '212-321-7475',
            location: 'New York',
            territories: ['NY', 'CT', 'NJ', 'PA', 'MA', 'VT', 'NH', 'ME', 'RI', 'DE', 'MD', 'DC'],
            timezone: 'America/New_York'
        },
        jason: {
            name: 'Jason',
            email: 'jason@joinalliancerisk.com', // UPDATE WITH REAL EMAIL
            phone: '305-XXX-XXXX', // UPDATE WITH REAL PHONE
            location: 'Miami',
            territories: ['FL', 'GA', 'SC', 'NC', 'VA', 'WV', 'KY', 'TN', 'AL', 'MS', 'LA', 
                         'AR', 'TX', 'OK'],
            timezone: 'America/New_York'
        }
    },

    // Determine which team member gets the lead
    assignLead(leadData) {
        const { state, revenue, industry, urgency } = leadData;

        // Special rules for high-value leads ($10M+ revenue)
        if (revenue >= 10000000) {
            // High-value leads always go to Mark for now
            // Can be customized later
            return this.team.mark;
        }

        // Geographic assignment
        for (const [key, member] of Object.entries(this.team)) {
            if (member.territories.includes(state)) {
                return member;
            }
        }

        // Default to Mark if state not found
        return this.team.mark;
    },

    // Round-robin assignment (alternative method)
    roundRobinAssign(lastAssignee = 'mark') {
        const order = ['mark', 'david', 'jason'];
        const currentIndex = order.indexOf(lastAssignee);
        const nextIndex = (currentIndex + 1) % order.length;
        return this.team[order[nextIndex]];
    },

    // Time-based assignment (during business hours)
    timeBasedAssign() {
        const now = new Date();
        const hour = now.getHours();
        
        // Eastern time (8am-6pm) -> David or Jason
        if (hour >= 8 && hour <= 18) {
            // Check if it's East Coast business hours
            const eastCoastHour = hour + (now.getTimezoneOffset() / 60) - 5;
            if (eastCoastHour >= 8 && eastCoastHour <= 18) {
                // Alternate between David and Jason for East Coast hours
                return Math.random() > 0.5 ? this.team.david : this.team.jason;
            }
        }
        
        // Default to geographic assignment
        return null;
    },

    // Format lead assignment notification
    formatNotification(lead, assignee) {
        return {
            to: assignee.email,
            subject: `New Cyber Insurance Lead: ${lead.companyName} - ${lead.state}`,
            body: `
                New lead assigned to you:
                
                Company: ${lead.companyName}
                Contact: ${lead.contactName}
                Email: ${lead.email}
                Phone: ${lead.phone}
                State: ${lead.state}
                Revenue: $${(lead.revenue / 1000000).toFixed(1)}M
                Industry: ${lead.industry}
                Employees: ${lead.employees}
                
                Risk Score: ${lead.riskScore}/100
                Coverage Requested: $${lead.coverageLimit}
                Urgency: ${lead.urgency}
                
                Lead Source: QuoteCyberInsurance.com
                Timestamp: ${new Date().toISOString()}
                
                View in CRM: [Link to Close.com lead]
            `,
            sms: assignee.phone ? `New ${lead.state} lead: ${lead.companyName} ($${(lead.revenue / 1000000).toFixed(1)}M revenue). Check email for details.` : null
        };
    },

    // Get assignment statistics
    getStats() {
        // This would connect to database to get actual stats
        return {
            totalLeads: {
                mark: 0,
                david: 0,
                jason: 0
            },
            todayLeads: {
                mark: 0,
                david: 0,
                jason: 0
            },
            conversionRate: {
                mark: 0,
                david: 0,
                jason: 0
            }
        };
    }
};

module.exports = leadDistribution;