# Degree Defenders Deployment Guide

## Database Configuration

### New Neon Database Connection
```bash
DATABASE_URL="postgresql://neondb_owner:npg_Vn2AteHPuN7B@ep-wild-resonance-a1cqzct2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DATABASE_URL_UNPOOLED="postgresql://neondb_owner:npg_Vn2AteHPuN7B@ep-wild-resonance-a1cqzct2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

## Deployment Steps

### 1. Test Database Connection Locally
```bash
npm run db:test
```

### 2. Deploy Schema and Seed Data
```bash
npm run db:deploy
npm run db:seed
```

### 3. Health Check
```bash
npm run db:health
```

### 4. Push to GitHub and Deploy
```bash
git add .
git commit -m "Update to new Neon database with connection fixes"
git push origin main
```

## Render Configuration

The `render.yaml` file includes:
- New Neon database connection string
- Connection pooling settings
- Health checks during build
- Automatic schema deployment
- Seed data initialization

## Environment Variables

Required environment variables in Render:
- `DATABASE_URL`: Pooled connection
- `DATABASE_URL_UNPOOLED`: Direct connection
- `JWT_SECRET`: Auto-generated
- `BCRYPT_ROUNDS`: 12
- `NODE_ENV`: production
- `PORT`: 10000 (Render default)

## Troubleshooting

### Connection Issues
1. Check database URL format
2. Verify SSL settings (`sslmode=require&channel_binding=require`)
3. Test connection with `npm run db:test`
4. Check Render logs for detailed error messages

### Schema Issues
1. Run `npm run db:deploy` to create tables
2. Verify with `npm run db:health`
3. Check if all tables exist in Neon dashboard

### Build Failures
1. Ensure all environment variables are set
2. Check build logs in Render dashboard
3. Verify Prisma client generation succeeds

## Monitoring

- Health endpoint: `/health` - Shows database connection status
- API status: `/` - Shows API information and endpoints
- Logs: Available in Render dashboard

## Next Steps After Deployment

1. Test user registration/login
2. Verify certificate operations
3. Test blockchain integration
4. Monitor connection stability
5. Set up alerts for database issues
