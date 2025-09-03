# Quick Start Guide - Degree Defenders

## Manual Startup Instructions

### 1. Install Dependencies

**Backend:**
```bash
cd "c:\Users\abhay\OneDrive\Desktop\Degree Defenders"
npm install
```

**Frontend:**
```bash
cd "c:\Users\abhay\OneDrive\Desktop\Degree Defenders\frontend"
npm install
```

### 2. Start Servers

**Start Backend (Terminal 1):**
```bash
cd "c:\Users\abhay\OneDrive\Desktop\Degree Defenders"
npm run dev
```
Backend will run on: http://localhost:3001

**Start Frontend (Terminal 2):**
```bash
cd "c:\Users\abhay\OneDrive\Desktop\Degree Defenders\frontend"
npm run dev
```
Frontend will run on: http://localhost:3000

### 3. Access Application

- **Main Application:** http://localhost:3000
- **Backend API:** http://localhost:3001/api
- **Health Check:** http://localhost:3001/health

### 4. Test Pages

- **Home:** http://localhost:3000
- **Login:** http://localhost:3000/login
- **Register:** http://localhost:3000/register
- **Verify Certificate:** http://localhost:3000/verify

### 5. Troubleshooting

**If styling doesn't appear:**
1. Check browser console for errors
2. Verify Tailwind CSS is loading in Network tab
3. Clear browser cache and refresh
4. Ensure PostCSS config exists in frontend folder

**If backend connection fails:**
1. Check backend is running on port 3001
2. Verify .env file exists with correct settings
3. Check firewall/antivirus blocking ports

### 6. Default Credentials

**Super Admin:**
- Email: admin@degreedefenders.gov.in
- Password: SecureAdmin123!

**Test Institution Admin:**
- Email: admin@ranchiuniversity.ac.in
- Password: RanchiAdmin123!

### 7. Key Features to Test

1. **Certificate Verification** - Upload/verify certificates
2. **User Registration** - Create new accounts
3. **Admin Dashboard** - View analytics and manage users
4. **Institution Management** - Add/manage institutions
5. **Blockchain Validation** - Test certificate authenticity
