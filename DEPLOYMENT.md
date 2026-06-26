# 🚀 Deployment Guide

Complete guide to deploying LifeLink to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment Options](#deployment-options)
3. [Frontend Deployment](#frontend-deployment)
4. [Backend Setup](#backend-setup)
5. [Environment Variables](#environment-variables)
6. [Domain Configuration](#domain-configuration)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Accounts

- GitHub account
- Supabase account (or self-hosted instance)
- Domain registrar (optional, for custom domain)
- Deployment platform account:
  - Vercel (recommended)
  - Netlify
  - Cloudflare Pages
  - AWS/Google Cloud/Azure

### Required Tools

```bash
# Node.js 18+
node --version

# npm
npm --version

# Git
git --version

# Supabase CLI (optional but recommended)
npm install -g supabase
```

## Deployment Options

### Option 1: Deploy via Lovable (Fastest)

1. Open project in Lovable
2. Click "Publish" button
3. Your app is live at `yourapp.lovable.app`
4. Connect custom domain in settings (optional)

### Option 2: Deploy to Vercel

#### Automatic Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel auto-detects Vite configuration
   - Click "Deploy"

3. **Configure Environment Variables**
   - In Vercel dashboard → Settings → Environment Variables
   - Add all variables from [Environment Variables](#environment-variables) section

4. **Deploy**
   - Vercel automatically deploys on every git push
   - Preview deployments for pull requests
   - Production at `yourapp.vercel.app`

#### Manual Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Option 3: Deploy to Netlify

#### Via GitHub

1. Connect repository to Netlify
2. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Add environment variables
4. Deploy

#### Via CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Initialize
netlify init

# Deploy
netlify deploy --prod
```

### Option 4: Self-Hosted (Docker)

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Build and run
docker build -t lifelink-rapid-response .
docker run -p 80:80 lifelink-rapid-response
```

### Option 5: Deploy to AWS S3 + CloudFront

```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

## Backend Setup

### Supabase Cloud

1. **Create Project**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose region close to your users
   - Save database password securely

2. **Run Migrations**
   ```bash
   # Connect to project
   supabase link --project-ref your-project-ref
   
   # Push migrations
   supabase db push
   ```

3. **Configure Auth**
   - Go to Authentication → Providers
   - Enable Email provider
   - Configure email templates
   - Set Site URL to your domain

4. **Configure Storage**
   - Go to Storage → Policies
   - Create buckets: `avatars`, `sos-photos`
   - Set up RLS policies

5. **Get API Keys**
   - Go to Settings → API
   - Copy `anon` key and `URL`
   - Add to environment variables

### Self-Hosted Supabase

```bash
# Clone Supabase
git clone --depth 1 https://github.com/supabase/supabase

# Start with Docker
cd supabase/docker
cp .env.example .env
docker compose up -d

# Access at http://localhost:8000
```

## Environment Variables

Create `.env` file (never commit this!):

```bash
# Supabase
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
VITE_SUPABASE_PROJECT_ID=your_project_id

# Optional: Analytics
VITE_GA_TRACKING_ID=G-XXXXXXXXXX

# Optional: Error Tracking
VITE_SENTRY_DSN=your_sentry_dsn

# Optional: Maps
VITE_MAP_STYLE_URL=https://your-custom-map-style

# Optional: Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_NOTIFICATIONS=true
```

### Production vs Development

```bash
# .env.development
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=your_local_key

# .env.production
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_prod_key
```

## Domain Configuration

### Custom Domain on Vercel

1. Go to project settings → Domains
2. Add your domain: `yourdomain.com`
3. Configure DNS:
   ```
   Type: CNAME
   Name: @
   Value: cname.vercel-dns.com
   ```
4. Wait for SSL certificate (automatic)

### Custom Domain on Netlify

1. Go to Domain settings → Add custom domain
2. Configure DNS:
   ```
   Type: A
   Name: @
   Value: 75.2.60.5
   ```
3. Enable HTTPS (automatic with Let's Encrypt)

### Configure Supabase URL

Update redirect URLs in Supabase:
1. Settings → Auth → URL Configuration
2. Site URL: `https://yourdomain.com`
3. Redirect URLs: `https://yourdomain.com/**`

## Post-Deployment Checklist

### Security

- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] API keys not exposed in client code
- [ ] RLS policies tested
- [ ] CORS configured correctly
- [ ] CSP headers set

### Performance

- [ ] Assets minified and compressed
- [ ] Images optimized
- [ ] CDN configured
- [ ] Caching headers set
- [ ] Service Worker registered
- [ ] Lighthouse score > 90

### Functionality

- [ ] Authentication working
- [ ] Database queries working
- [ ] Real-time updates working
- [ ] File uploads working
- [ ] Maps rendering correctly
- [ ] All routes accessible
- [ ] Mobile responsive
- [ ] Offline mode working

### Monitoring

- [ ] Error tracking configured (Sentry)
- [ ] Analytics configured (GA4)
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Performance monitoring (Web Vitals)
- [ ] Database monitoring (Supabase dashboard)

## Monitoring

### Uptime Monitoring

```bash
# Use UptimeRobot, Pingdom, or similar
# Monitor these endpoints:
- https://yourdomain.com (main site)
- https://yourproject.supabase.co (database)
```

### Error Tracking with Sentry

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay(),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
  });
}
```

### Analytics

```typescript
// src/lib/analytics.ts
import ReactGA from "react-ga4";

if (import.meta.env.VITE_GA_TRACKING_ID) {
  ReactGA.initialize(import.meta.env.VITE_GA_TRACKING_ID);
}

export const trackPageView = (path: string) => {
  ReactGA.send({ hitType: "pageview", page: path });
};
```

## Continuous Deployment

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
          
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## Troubleshooting

### Build Fails

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Environment Variables Not Working

- Ensure variables start with `VITE_`
- Restart dev server after changing `.env`
- Check for typos in variable names
- Verify variables are set in deployment platform

### Supabase Connection Issues

- Check API URL and key are correct
- Verify RLS policies allow access
- Check CORS settings in Supabase
- Ensure redirect URLs are configured

### Maps Not Rendering

- Check MapLibre GL JS is loaded
- Verify map style URL is accessible
- Check console for CORS errors
- Ensure geolocation permissions granted

### Real-time Not Working

- Check WebSocket connection
- Verify RLS policies on tables
- Check subscription code
- Monitor Supabase logs

## Rollback

If deployment fails:

```bash
# Vercel
vercel rollback

# Netlify
netlify rollback

# Manual
git revert HEAD
git push origin main
```

## Scaling

### Frontend Scaling

- Use CDN (Cloudflare, Fastly)
- Enable compression (gzip, brotli)
- Implement code splitting
- Lazy load components
- Cache aggressively

### Backend Scaling

- Upgrade Supabase plan
- Add read replicas
- Enable connection pooling
- Optimize database queries
- Use Redis for caching

## Cost Estimation

### Supabase (Free Tier)

- Database: 500MB
- Storage: 1GB
- Bandwidth: 2GB
- Edge Functions: 500K invocations

### Supabase (Pro Tier) - $25/month

- Database: 8GB
- Storage: 100GB
- Bandwidth: 250GB
- No pauses

### Hosting

- Vercel Pro: $20/month
- Netlify Pro: $19/month
- AWS: Pay-as-you-go
- Self-hosted: $5-50/month (VPS)

## Support

For deployment help:
- 📧 Email: deploy@lifelinkasia.org
- 💬 Discord: [Join our community]
- 📖 Docs: [Full documentation]

---

**Last Updated**: January 2025  
**Maintainer**: @withkevinm
