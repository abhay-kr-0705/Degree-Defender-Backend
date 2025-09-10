# Deployment Checklist - Degree Defenders

## Pre-Deployment Verification

### Frontend Configuration
- [ ] Update `NEXT_PUBLIC_API_URL` in environment variables
- [ ] Verify `NEXT_PUBLIC_VERCEL_URL` matches your deployment URL
- [ ] Test build process: `npm run build`
- [ ] Verify all pages render correctly in production build

### Backend Configuration
- [ ] Update `FRONTEND_URL` to match your frontend deployment
- [ ] Update `CORS_ORIGIN` to include your frontend domain
- [ ] Verify database connection string is correct
- [ ] Test OCR service initialization
- [ ] Verify all required environment variables are set

### Database Setup
- [ ] Run database migrations: `npx prisma db push`
- [ ] Seed database with test data: `npm run db:seed`
- [ ] Verify database connectivity from backend

## Deployment Steps

### Backend Deployment (Render)
1. **Environment Variables**: Set all required variables in Render dashboard
2. **Build Command**: `npm install && npx prisma generate && npm run db:manual-deploy`
3. **Start Command**: `npm start`
4. **Health Check**: Verify `/api/health` endpoint responds

### Frontend Deployment (Vercel)
1. **Connect Repository**: Link your GitHub repository
2. **Environment Variables**: Set `NEXT_PUBLIC_API_URL` to your backend URL
3. **Build Settings**: Use default Next.js settings
4. **Domain Configuration**: Set up custom domain if needed

## Post-Deployment Testing

### Critical Path Testing
- [ ] Homepage loads correctly
- [ ] Public verify page accessible to unauthenticated users
- [ ] Registration flow works end-to-end
- [ ] Login flow works end-to-end
- [ ] Authenticated users can access verification features
- [ ] File upload and processing works without errors
- [ ] Navigation between authenticated/unauthenticated states

### API Endpoints Testing
```bash
# Replace YOUR_BACKEND_URL with actual deployment URL
curl -X GET https://YOUR_BACKEND_URL/api/health
curl -X GET https://YOUR_BACKEND_URL/api/public/stats
```

### Performance Verification
- [ ] Page load times < 3 seconds
- [ ] File upload processing < 10 seconds
- [ ] API response times < 2 seconds
- [ ] No memory leaks during OCR processing

## Security Checklist
- [ ] HTTPS enabled on both frontend and backend
- [ ] Secure headers configured (CORS, CSP, etc.)
- [ ] Authentication tokens properly secured
- [ ] File upload restrictions enforced
- [ ] Database credentials secured
- [ ] No sensitive data in client-side code

## Monitoring Setup
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Performance monitoring enabled
- [ ] Database monitoring active
- [ ] Log aggregation configured
- [ ] Uptime monitoring setup

## Rollback Plan
- [ ] Previous deployment tagged and accessible
- [ ] Database backup created before deployment
- [ ] Rollback procedure documented
- [ ] Team notified of deployment window
