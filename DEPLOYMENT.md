# QuoteCyber Deployment Guide

## Deployment Options

### Option 1: Deploy with GitHub (Recommended)

1. **Create GitHub Personal Access Token**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes: `repo`, `read:org`, `workflow`
   - Copy the token

2. **Push to GitHub**
   ```bash
   gh auth login
   # Paste your token when prompted
   
   gh repo create quotecyberinsurance --public --source=. --remote=origin --push
   ```

3. **Connect to Vercel**
   - Go to https://vercel.com/new
   - Import GitHub repository
   - Configure environment variables (see below)
   - Deploy!

### Option 2: Direct Deploy to Vercel (No GitHub)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   cd quotecyberinsurance-mvp
   vercel --prod
   ```

3. **Follow prompts**
   - Create new project
   - Set environment variables
   - Deploy!

### Option 3: Deploy to Railway

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   ```

2. **Deploy**
   ```bash
   railway login
   railway init
   railway up
   ```

## Required Environment Variables

Add these to your deployment platform:

```env
# Database (Supabase recommended)
DATABASE_URL=postgresql://user:password@host:5432/dbname
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# API Keys
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
CLOSE_API_KEY=api_xxxxx
SENDGRID_API_KEY=SG.xxxxx

# Auth
JWT_SECRET=your-random-secret-key-min-32-chars
BCRYPT_ROUNDS=10

# App Config
NODE_ENV=production
FRONTEND_URL=https://quotecyberinsurance.com
API_URL=https://quotecyberinsurance.com/api

# Optional: Monitoring
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

## Domain Setup

### For quotecyberinsurance.com:

1. **Add to Vercel**
   - Go to Vercel Dashboard → Domains
   - Add `quotecyberinsurance.com`
   - Update DNS records:
     ```
     Type: A
     Name: @
     Value: 76.76.21.21
     
     Type: CNAME
     Name: www
     Value: cname.vercel-dns.com
     ```

2. **SSL Certificate**
   - Automatic via Vercel (Let's Encrypt)
   - No action needed

## Database Setup (Supabase)

1. **Create Account**
   - Go to https://supabase.com
   - Create new project (free tier works)

2. **Run Schema**
   ```sql
   -- Copy contents of backend/schema.sql
   -- Run in Supabase SQL Editor
   ```

3. **Get Credentials**
   - Project Settings → API
   - Copy URL and anon key

## Post-Deployment Checklist

- [ ] Test landing page loads
- [ ] Test assessment flow
- [ ] Test API endpoints
- [ ] Verify email sending
- [ ] Check database writes
- [ ] Test lead capture
- [ ] Monitor error logs
- [ ] Set up monitoring alerts

## Quick Deploy Script

```bash
#!/bin/bash
# Save as deploy.sh

echo "🚀 Deploying QuoteCyber..."

# Check for Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm i -g vercel
fi

# Deploy
vercel --prod

echo "✅ Deployment complete!"
echo "Visit your site at: https://quotecyberinsurance.vercel.app"
```

## Monitoring & Analytics

1. **Vercel Analytics** (built-in)
2. **Supabase Dashboard** (database monitoring)
3. **Sentry** (error tracking - optional)
4. **Google Analytics** (add to HTML)

## Troubleshooting

**Issue: API not working**
- Check environment variables in Vercel
- Verify API routes in vercel.json
- Check backend logs

**Issue: Database connection failed**
- Verify DATABASE_URL format
- Check Supabase project status
- Ensure schema is created

**Issue: Emails not sending**
- Verify SendGrid API key
- Check sender domain verification
- Review email templates

## Support

Need help? Options:
1. Check Vercel docs: https://vercel.com/docs
2. Supabase docs: https://supabase.com/docs
3. Ask Rook for assistance