# Testing Guide - Degree Defenders Certificate Verification

## Overview
This guide provides comprehensive testing instructions for the authentication-protected certificate verification system.

## Prerequisites
- Node.js and npm installed
- Backend server running on port 3001
- Frontend server running on port 3000
- Database configured and seeded with test data

## Testing Scenarios

### 1. Authentication Flow Testing

#### Scenario A: Unauthenticated User Access
1. **Navigate to homepage** (`http://localhost:3000`)
2. **Click "Verify Certificate"** in navigation
3. **Expected Result**: Redirected to `/public-verify` page
4. **Verify**: Page shows benefits, features, and sign-up prompts
5. **Click "Get Started"** or "Create Free Account"
6. **Expected Result**: Redirected to `/register` page
7. **Click "Sign In"** buttons
8. **Expected Result**: Redirected to `/login` page

#### Scenario B: User Registration Flow
1. **Navigate to** `/register`
2. **Fill registration form** with valid data:
   - Email: `test@example.com`
   - Password: `TestPassword123!`
   - First Name: `John`
   - Last Name: `Doe`
   - Phone: `+1234567890`
3. **Submit form**
4. **Expected Result**: User logged in and redirected to dashboard
5. **Verify**: Header shows user name and logout option

#### Scenario C: User Login Flow
1. **Navigate to** `/login`
2. **Enter credentials** from registration
3. **Submit form**
4. **Expected Result**: User logged in and redirected to dashboard
5. **Verify**: Authentication state persisted across page refreshes

### 2. Certificate Verification Testing

#### Scenario D: Authenticated Certificate Verification
1. **Login as authenticated user**
2. **Click "Verify Certificate"** in navigation
3. **Expected Result**: Access to full `/verify` page
4. **Verify**: Form fields auto-populated with user information
5. **Test Manual Verification**:
   - Certificate Number: `CERT123456`
   - Student Name: `Jane Smith`
   - Purpose: `Employment verification`
6. **Submit form**
7. **Expected Result**: Verification request processed (may show "not found" if no test data)

#### Scenario E: File Upload Verification
1. **On authenticated `/verify` page**
2. **Select "Upload File" method**
3. **Upload test certificate** (PDF/JPG/PNG)
4. **Click "Process Certificate"**
5. **Expected Result**: File processed without 500 error
6. **Verify**: OCR extraction attempted and results displayed

#### Scenario F: Navigation State Testing
1. **While authenticated**, navigate to `/verify`
2. **Logout** using header menu
3. **Click "Verify Certificate"** again
4. **Expected Result**: Redirected to `/public-verify`
5. **Login again**
6. **Click "Verify Certificate"**
7. **Expected Result**: Access to authenticated `/verify` page

### 3. Error Handling Testing

#### Scenario G: Invalid Authentication
1. **Manually remove auth token** from browser cookies
2. **Try to access** `/verify` directly
3. **Expected Result**: Redirected to `/login`
4. **Enter invalid credentials**
5. **Expected Result**: Error message displayed

#### Scenario H: File Upload Errors
1. **On authenticated verify page**
2. **Try uploading invalid file** (e.g., .txt file)
3. **Expected Result**: File type validation error
4. **Try uploading oversized file** (>10MB)
5. **Expected Result**: File size validation error

### 4. UI/UX Testing

#### Scenario I: Responsive Design
1. **Test on different screen sizes**:
   - Desktop (1920x1080)
   - Tablet (768x1024)
   - Mobile (375x667)
2. **Verify**: All pages responsive and functional
3. **Test mobile navigation menu**
4. **Verify**: Hamburger menu works correctly

#### Scenario J: Loading States
1. **Monitor loading indicators** during:
   - Login/registration
   - Certificate verification
   - File upload processing
2. **Verify**: Appropriate loading states shown
3. **Test form validation** with invalid inputs
4. **Verify**: Error messages displayed correctly

## Backend API Testing

### Test Endpoints
```bash
# Test public verification (should work without auth)
curl -X POST http://localhost:3001/api/public/verify \
  -H "Content-Type: application/json" \
  -d '{"certificateNumber":"TEST123","studentName":"Test User","requestedBy":"Tester","requestorEmail":"test@example.com"}'

# Test authenticated verification (requires auth token)
curl -X POST http://localhost:3001/api/verifications/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"certificateNumber":"TEST123","studentName":"Test User","requestedBy":"Tester","requestorEmail":"test@example.com"}'

# Test file upload (requires auth token)
curl -X POST http://localhost:3001/api/public/verify-file \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "certificate=@test-certificate.pdf" \
  -F "requestedBy=Tester" \
  -F "requestorEmail=test@example.com"
```

## Expected Results Summary

### ✅ Working Features
- [x] Unauthenticated users redirected to public verify page
- [x] Public verify page shows benefits and sign-up prompts
- [x] Authentication flow (login/register) works correctly
- [x] Authenticated users can access full verification features
- [x] File upload processing works without 500 errors
- [x] OCR service extracts text from images and PDFs
- [x] Form auto-population with user data
- [x] Navigation updates based on authentication state
- [x] Protected routes redirect to login when needed
- [x] User session persistence across page refreshes

### 🔧 Configuration Requirements
- Backend environment variables properly set
- Frontend API URL configured correctly
- CORS settings allow frontend domain
- Database contains test certificate data
- OCR dependencies (Tesseract) properly installed

## Troubleshooting

### Common Issues
1. **500 Error on File Upload**: Check OCR service initialization
2. **CORS Errors**: Verify backend CORS_ORIGIN includes frontend URL
3. **Authentication Issues**: Check JWT_SECRET and token expiration
4. **Database Errors**: Ensure database connection and schema are correct

### Debug Commands
```bash
# Check backend logs
npm run dev # in backend directory

# Check frontend console
# Open browser dev tools and monitor console for errors

# Test database connection
npm run db:test # if available
```

## Performance Testing
- Test with various file sizes (1MB, 5MB, 10MB)
- Monitor memory usage during OCR processing
- Test concurrent verification requests
- Verify response times are acceptable (<5 seconds for file processing)

## Security Testing
- Verify protected routes require authentication
- Test token expiration handling
- Ensure sensitive data not exposed in client
- Verify file upload restrictions work correctly
