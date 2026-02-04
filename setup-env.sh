#!/bin/bash

# QuoteCyber Environment Setup Script
echo "🔧 Setting up QuoteCyber environment..."

# Create .env file for local development
cat > backend/.env << 'EOF'
# Database (Update with your Supabase credentials)
DATABASE_URL=postgresql://postgres:password@localhost:5432/quotecyber
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# API Keys (Add your real keys)
ANTHROPIC_API_KEY=sk-ant-api03-your-key
CLOSE_API_KEY=api_your-close-key
SENDGRID_API_KEY=SG.your-sendgrid-key

# Auth
JWT_SECRET=$(openssl rand -base64 32)
BCRYPT_ROUNDS=10

# App Config
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3001/api

# Port
PORT=3001
EOF

echo "✅ Created backend/.env file"
echo ""
echo "⚠️  IMPORTANT: Update the .env file with your actual API keys!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your API keys"
echo "2. Set up Supabase database (free at supabase.com)"
echo "3. Run: cd backend && npm install"
echo "4. Run: npm start"
echo ""
echo "For production deployment, see DEPLOYMENT.md"