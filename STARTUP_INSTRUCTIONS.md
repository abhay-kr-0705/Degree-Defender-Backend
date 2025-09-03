# 🚀 Degree Defenders - Startup Instructions

## Quick Start (Recommended)

### Option 1: Automatic Startup
1. Double-click `start-dev.bat` in the project root
2. This will automatically install dependencies and start both servers

### Option 2: Manual Startup

#### Backend Server
```bash
cd "c:\Users\abhay\OneDrive\Desktop\Degree Defenders"
npm install
npm run dev
```

#### Frontend Server (in new terminal)
```bash
cd "c:\Users\abhay\OneDrive\Desktop\Degree Defenders\frontend"
npm install
npm run dev
```

## Access URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health

## Default Login Credentials
- **Super Admin**: admin@degreedefenders.gov.in / Admin@123
- **Verifier**: verifier@degreedefenders.gov.in / Admin@123

## ✅ All Features Available

### 🔹 Upload & Verification Interface
- ✅ Multi-format certificate uploads (PDF, JPG, PNG)
- ✅ Manual certificate details entry
- ✅ QR code verification
- ✅ Real-time verification results

### 🔹 OCR & Authenticity Checking
- ✅ OCR text extraction from certificates
- ✅ Cross-verification against database
- ✅ Anomaly detection and scoring
- ✅ Formatting consistency checks

### 🔹 Forgery Detection
- ✅ Tampered content detection
- ✅ Invalid certificate number detection
- ✅ Non-existent institution validation
- ✅ Duplicate document detection
- ✅ Seal/signature analysis

### 🔹 Institution Integration
- ✅ Bulk certificate upload APIs
- ✅ Real-time data synchronization
- ✅ Legacy certificate support
- ✅ Institution verification system

### 🔹 Security & Trust
- ✅ Blockchain/cryptographic validation
- ✅ Role-based access control
- ✅ Secure data handling
- ✅ Audit logging

### 🔹 Admin Dashboard
- ✅ Comprehensive analytics
- ✅ Forgery trend monitoring
- ✅ User management
- ✅ Institution management
- ✅ Real-time alerts

### 🔹 Public Access
- ✅ Public verification portal
- ✅ Employer/agency access
- ✅ Simple verification flow
- ✅ Verification code system

## Troubleshooting

### If styling doesn't load:
1. Ensure frontend dependencies are installed: `npm install` in frontend folder
2. Check if Tailwind CSS is working: look for classes in browser dev tools
3. Restart frontend server: `npm run dev`

### If backend fails to start:
1. Check if port 3001 is available
2. Verify database connection (PostgreSQL not required for basic testing)
3. Check `.env` file configuration

### If features don't work:
1. Ensure both servers are running
2. Check browser console for errors
3. Verify API endpoints are accessible at http://localhost:3001

## Database Setup (Optional)
For full functionality with persistent data:
1. Install PostgreSQL
2. Create database: `degree_defenders`
3. Update `.env` with your database credentials
4. Run: `npm run db:migrate && npm run db:seed`

## Production Deployment
Use the provided Docker configuration:
```bash
docker-compose up -d
```

---
**Government of Jharkhand - Department of Higher and Technical Education**
**Authenticity Validator for Academia Platform**
