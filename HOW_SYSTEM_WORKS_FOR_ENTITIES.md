# How Degree Defenders Works for Verified Entities

## 🎯 System Overview

Degree Defenders is a **secure, enterprise-grade certificate verification system** designed exclusively for **verified organizations** including employers, educational institutions, government agencies, and verification agencies.

**Key Principle:** Access is **NOT public**. Only verified, trusted entities can use the system.

---

## 🏢 Who Can Access the System?

### 1. **Employers & Recruitment Agencies**
**Use Case:** Verify candidate certificates during hiring

**Access Level:** Verifier Role
- Submit verification requests
- Upload candidate certificates
- View verification results
- Download verification reports
- Track verification history

**Example Organizations:**
- TCS, Infosys, Wipro (IT companies)
- HDFC, ICICI (Banks)
- Naukri.com, LinkedIn (Job portals)
- ABC Consultancy (Recruitment agencies)

---

### 2. **Educational Institutions**
**Use Case:** Issue certificates & verify for admissions

**Access Level:** University Admin Role
- Upload certificates (bulk/individual)
- Generate PDF certificates with QR codes
- Verify certificates for admission
- Monitor fraud attempts on their certificates
- Manage institution users

**Example Organizations:**
- Ranchi University
- BIT Mesra
- IIT Dhanbad
- State universities and colleges

---

### 3. **Government Agencies**
**Use Case:** Verify certificates for scholarships/schemes

**Access Level:** Government Agency Role
- Verify certificates for eligibility
- Bulk verification for schemes
- Access fraud statistics
- Report suspicious patterns
- Blacklist fraudulent entities

**Example Organizations:**
- Department of Higher Education, Jharkhand
- UGC (University Grants Commission)
- AICTE (Technical Education)
- Scholarship departments

---

### 4. **Verification Agencies**
**Use Case:** Background verification services

**Access Level:** Verifier Role
- Verify certificates for clients
- API integration for automation
- Bulk verification requests
- Detailed verification reports
- Client-specific access

**Example Organizations:**
- First Advantage
- AuthBridge
- SpringVerify
- Background check companies

---

## 🔐 How Entities Get Access

### Step 1: Registration Application

**Entity submits online application with:**

```
Organization Information:
├── Legal Name: ABC Technologies Pvt Ltd
├── Registration Number: CIN U72900JH2020PTC123456
├── Type: Employer / Institution / Agency
├── Address: Complete registered address
├── Contact: Phone, Email, Website
└── GST Number: 20AAAAA0000A1Z5

Authorized Person Details:
├── Name: John Doe
├── Designation: HR Manager / Registrar
├── Email: john.doe@abc.com
├── Mobile: +91-9876543210
├── ID Proof: Aadhaar / PAN / Passport
└── Authorization Letter: On company letterhead

Supporting Documents (Upload):
├── Certificate of Incorporation
├── GST Registration Certificate
├── PAN Card (Organization)
├── Address Proof (Utility bill / Lease)
├── Authorization Letter (signed & stamped)
└── ID Proof of Authorized Person

Purpose of Access:
├── Hiring / Recruitment
├── Admission Processing
├── Background Verification
├── Government Scheme
└── Other (specify)
```

**Application Form URL:** `https://degreedefenders.com/entity-registration`

---

### Step 2: Document Verification by Super Admin

**Super Admin reviews application:**

```
Verification Checklist:
├── ✓ Organization exists (check MCA/GST database)
├── ✓ Documents are authentic (not forged)
├── ✓ Authorized person is legitimate
├── ✓ Purpose is valid
├── ✓ No red flags (blacklisted, suspicious)
└── ✓ Risk assessment passed

Verification Methods:
├── MCA (Ministry of Corporate Affairs) database check
├── GST portal verification
├── Phone verification call
├── Email domain verification
├── Physical address verification (if needed)
└── Reference checks (for agencies)

Decision:
├── APPROVED → Proceed to credential generation
├── REJECTED → Send rejection email with reason
└── PENDING → Request additional documents
```

**Timeline:** 2-5 business days

---

### Step 3: Credential Generation & Onboarding

**If approved, system automatically:**

```
1. Generate Unique Entity ID
   Example: ENT-EMP-2024-001234

2. Create User Account
   ├── Username: john.doe@abc.com
   ├── Temporary Password: Auto-generated (16 chars)
   ├── Role: VERIFIER / UNIVERSITY_ADMIN / GOV_AGENCY
   └── Permissions: Based on entity type

3. Generate API Keys (if requested)
   ├── API Key: dd_live_a1b2c3d4e5f6g7h8i9j0...
   ├── API Secret: sk_live_z9y8x7w6v5u4t3s2r1...
   └── Rate Limit: 1000 requests/hour

4. Enable Security Features
   ├── MFA: Enabled by default
   ├── Session Timeout: 30 minutes
   ├── Password Policy: Enforced
   └── Audit Logging: Enabled

5. Send Welcome Email
   ├── Login credentials (temporary password)
   ├── Setup instructions
   ├── User manual (PDF)
   ├── API documentation (if applicable)
   ├── Support contact
   └── Terms of Service
```

**Welcome Email Example:**
```
Subject: Welcome to Degree Defenders - Your Account is Ready

Dear John Doe,

Your organization (ABC Technologies Pvt Ltd) has been approved for 
Degree Defenders certificate verification system.

Entity ID: ENT-EMP-2024-001234
Username: john.doe@abc.com
Temporary Password: Xk9#mP2$vL8@qR5!

Login URL: https://degreedefenders.com/login

IMPORTANT: 
1. Change your password immediately after first login
2. Enable Multi-Factor Authentication (MFA)
3. Do not share your credentials

For support: support@degreedefenders.com
User Manual: [Download PDF]

Best regards,
Degree Defenders Team
```

---

### Step 4: First Login & Security Setup

**User's first login experience:**

```
1. Visit Login Page
   URL: https://degreedefenders.com/login

2. Enter Credentials
   ├── Email: john.doe@abc.com
   └── Temporary Password: Xk9#mP2$vL8@qR5!

3. Forced Password Change
   ├── Enter new password (12+ chars)
   ├── Confirm new password
   ├── Must meet strength requirements
   └── Cannot be same as temporary password

4. Setup Multi-Factor Authentication (MFA)
   ├── Option 1: SMS OTP
   │   └── Enter mobile: +91-9876543210
   │   └── Verify OTP
   ├── Option 2: Authenticator App
   │   └── Scan QR code with Google Authenticator
   │   └── Enter 6-digit code
   └── Backup codes generated (save securely)

5. Accept Terms of Service
   ├── Read terms and conditions
   ├── Accept privacy policy
   └── Acknowledge data protection rules

6. Complete Profile
   ├── Upload profile photo (optional)
   ├── Set notification preferences
   └── Configure dashboard

7. Dashboard Access Granted
   └── Welcome to Degree Defenders!
```

---

## 🔄 How Verification Works

### Scenario 1: Employer Verifying Candidate Certificate

**Step-by-Step Process:**

```
1. Employer Logs In
   ├── Email + Password
   ├── MFA Code (OTP/Authenticator)
   └── Session created (30 min timeout)

2. Navigate to Verification Page
   Dashboard → Verify Certificate

3. Choose Verification Method

   Method A: Manual Entry
   ├── Enter Certificate Number: RU/2023/BSC/001
   ├── Enter Student Name: Rahul Kumar Singh
   ├── Enter Purpose: Employment Verification
   └── Click "Verify"

   Method B: Upload Certificate
   ├── Drag & drop PDF/Image
   ├── System extracts data using OCR
   ├── Review extracted data
   └── Click "Verify"

   Method C: QR Code Scan
   ├── Click "Scan QR Code"
   ├── Allow camera access
   ├── Point at QR code on certificate
   └── Automatic verification

4. System Processing (< 5 seconds)
   ├── Extract/validate data
   ├── Check database for certificate
   ├── Verify blockchain hash
   ├── Run forgery detection (AI)
   │   ├── Photo tampering check
   │   ├── Seal forgery detection
   │   ├── Text consistency analysis
   │   ├── Document structure validation
   │   └── Duplicate detection
   ├── Calculate confidence score
   └── Generate verification report

5. View Results
   ┌─────────────────────────────────────┐
   │  ✅ Certificate Verified             │
   │                                      │
   │  Confidence Score: 98%               │
   │  Verification Code: VER-2024-123456  │
   │                                      │
   │  Certificate Details:                │
   │  • Number: RU/2023/BSC/001          │
   │  • Student: Rahul Kumar Singh       │
   │  • Course: B.Sc Computer Science    │
   │  • Institution: Ranchi University   │
   │  • Year: 2023                       │
   │  • Grade: First Class               │
   │                                      │
   │  Blockchain: Verified ✓             │
   │  Forgery Check: Passed ✓            │
   │  Database Match: Found ✓            │
   │                                      │
   │  [Download Report] [Share]          │
   └─────────────────────────────────────┘

6. Download Verification Report (PDF)
   ├── Official letterhead
   ├── Verification details
   ├── QR code for report verification
   ├── Digital signature
   └── Valid for 90 days

7. Logged in Audit Trail
   ├── Who verified: john.doe@abc.com
   ├── When: 2024-01-15 10:30:45 IST
   ├── IP Address: 103.x.x.x
   ├── Result: Verified
   └── Verification Code: VER-2024-123456
```

---

### Scenario 2: University Uploading Certificates

**Step-by-Step Process:**

```
1. University Admin Logs In
   ├── Email: registrar@ranchiuniversity.ac.in
   ├── Password + MFA
   └── Role: UNIVERSITY_ADMIN

2. Navigate to Upload Page
   Dashboard → Certificates → Upload

3. Choose Upload Method

   Method A: Single Certificate
   ├── Fill form manually
   │   ├── Certificate Number
   │   ├── Student Name
   │   ├── Course, Year, Grade
   │   └── Upload scanned certificate
   ├── Generate PDF with QR code
   ├── Store on blockchain
   └── Save to database

   Method B: Bulk Upload (CSV/Excel)
   ├── Download template
   ├── Fill student data (100s/1000s)
   ├── Upload CSV file
   ├── System validates data
   ├── Preview before import
   ├── Confirm import
   └── Bulk processing (background job)

4. Certificate Processing
   ├── OCR extraction (verify data)
   ├── Generate unique hash (SHA-256)
   ├── Store on blockchain
   ├── Generate QR code
   ├── Create PDF certificate
   ├── Digital signature
   └── Save to database

5. Certificate Generated
   ├── PDF with embedded QR code
   ├── Blockchain transaction ID
   ├── Verification URL
   └── Ready for distribution

6. Distribute to Students
   ├── Email PDF to students
   ├── SMS with verification link
   ├── Student portal access
   └── Physical certificate with QR
```

---

## 🔐 Security Features Explained

### 1. Multi-Factor Authentication (MFA)

**Why MFA?**
- Password alone is not enough
- Prevents unauthorized access even if password is leaked
- Industry standard for enterprise systems

**How it works:**
```
Login Attempt:
├── Step 1: Enter email + password
│   └── If correct → Proceed to Step 2
│   └── If wrong → Failed attempt logged
│
├── Step 2: Enter MFA code
│   ├── SMS OTP (6 digits, valid 5 min)
│   ├── OR Authenticator App (TOTP)
│   └── OR Backup code (if device lost)
│
└── Step 3: Access granted
    └── Session created (30 min timeout)
```

**Setup Process:**
1. User enables MFA in settings
2. Choose method (SMS or App)
3. Verify phone/scan QR code
4. Test with code
5. Save backup codes (10 codes)
6. MFA active on next login

---

### 2. Session Management

**Security Rules:**
```
Session Properties:
├── Timeout: 30 minutes of inactivity
├── Max Duration: 8 hours
├── Concurrent Sessions: Max 3 devices
├── IP Tracking: Yes
├── Device Fingerprinting: Yes
└── Automatic Logout: On suspicious activity

Session Validation:
├── Check session ID validity
├── Verify IP address (warn if changed)
├── Check device fingerprint
├── Validate expiration
└── Update last activity timestamp

Session Termination:
├── Manual logout
├── Timeout (30 min inactivity)
├── Max duration reached (8 hours)
├── Suspicious activity detected
├── Password changed
└── Admin forced logout
```

---

### 3. API Key Security

**For Programmatic Access:**

```
API Key Generation:
├── User requests API key
├── Admin approves request
├── System generates:
│   ├── API Key: dd_live_a1b2c3...
│   ├── API Secret: sk_live_z9y8x7...
│   └── Key ID: key_123456
├── Shown only once (copy & save)
└── Stored as hash in database

API Key Usage:
Request Headers:
├── Authorization: Bearer dd_live_a1b2c3...
├── X-API-Secret: sk_live_z9y8x7...
└── Content-Type: application/json

Rate Limiting:
├── 1000 requests/hour (standard)
├── 10,000 requests/hour (enterprise)
└── 429 error if exceeded

Security Features:
├── IP whitelist (optional)
├── Expiration date (1 year)
├── Rotation support
├── Usage analytics
└── Revocation capability
```

**Example API Call:**
```bash
curl -X POST https://api.degreedefenders.com/v1/verify \
  -H "Authorization: Bearer dd_live_a1b2c3..." \
  -H "X-API-Secret: sk_live_z9y8x7..." \
  -H "Content-Type: application/json" \
  -d '{
    "certificateNumber": "RU/2023/BSC/001",
    "studentName": "Rahul Kumar Singh"
  }'
```

---

### 4. Suspicious Activity Detection

**System monitors for:**

```
Suspicious Indicators:
├── Multiple failed login attempts (5+ in 15 min)
├── Login from unusual location
├── Login at unusual time (3 AM)
├── Multiple devices simultaneously
├── Rapid API requests (rate limit violation)
├── Unusual verification patterns
├── Access to unauthorized resources
└── Known malicious IP addresses

Automatic Response:
├── Score < 50: Allow (log activity)
├── Score 50-70: Challenge (require MFA again)
├── Score 70-90: Temporary block (15 min)
├── Score > 90: Account locked (manual unlock)

Notifications:
├── Email to user: "Suspicious login detected"
├── SMS alert: "Account accessed from new device"
├── Admin notification: "High-risk activity detected"
└── Security team alert: "Investigate immediately"
```

---

### 5. Credential Leak Protection

**Proactive Monitoring:**

```
System checks:
├── Password against leaked database (HIBP)
├── Email in data breach databases
├── Unusual login patterns
└── Compromised device indicators

If leak detected:
├── Force password reset
├── Terminate all sessions
├── Notify user immediately
├── Notify security team
└── Monitor for 30 days

User notification:
"Your password was found in a data breach. 
For your security, we've locked your account. 
Please reset your password immediately."
```

---

## 📊 Access Levels & Permissions

### Permission Matrix

| Feature | Super Admin | University Admin | Verifier | Gov Agency |
|---------|-------------|------------------|----------|------------|
| **Certificate Management** |
| Upload Certificates | ✅ All | ✅ Own only | ❌ | ❌ |
| View Certificates | ✅ All | ✅ Own only | ❌ | ❌ |
| Edit Certificates | ✅ All | ✅ Own only | ❌ | ❌ |
| Delete Certificates | ✅ All | ❌ | ❌ | ❌ |
| Generate PDF | ✅ All | ✅ Own only | ❌ | ❌ |
| **Verification** |
| Verify Certificate | ✅ | ✅ | ✅ | ✅ |
| View Verification History | ✅ All | ✅ Own | ✅ Own | ✅ Own |
| Download Reports | ✅ All | ✅ Own | ✅ Own | ✅ Own |
| Bulk Verification | ✅ | ✅ | ✅ | ✅ |
| **User Management** |
| Create Users | ✅ All | ✅ Own org | ❌ | ❌ |
| Manage Users | ✅ All | ✅ Own org | ❌ | ❌ |
| Approve Entities | ✅ | ❌ | ❌ | ❌ |
| Blacklist Entities | ✅ | ❌ | ❌ | ✅ |
| **Analytics** |
| System Analytics | ✅ | ❌ | ❌ | ✅ Limited |
| Institution Analytics | ✅ All | ✅ Own | ❌ | ✅ Limited |
| Fraud Reports | ✅ | ✅ Own | ❌ | ✅ |
| **API Access** |
| Generate API Keys | ✅ | ✅ | ✅ | ✅ |
| API Documentation | ✅ | ✅ | ✅ | ✅ |
| Webhook Configuration | ✅ | ✅ | ✅ | ✅ |

---

## 🔄 What Happens If Credentials Are Leaked?

### Scenario: Password Compromised

```
Detection:
├── User reports suspicious activity
├── OR System detects unusual login
├── OR Password found in data breach
└── OR Multiple failed MFA attempts

Immediate Actions (Automatic):
1. Lock account immediately
2. Terminate all active sessions
3. Invalidate all API keys
4. Send alert to user (email + SMS)
5. Notify security team
6. Log incident

User Notification:
"SECURITY ALERT: Your account has been locked due to 
suspicious activity. Please contact support immediately 
at security@degreedefenders.com or call 1800-XXX-XXXX"

Recovery Process:
1. User contacts support
2. Identity verification:
   ├── Answer security questions
   ├── Provide ID proof
   ├── Verify organization details
   └── Authorized person confirmation
3. Support unlocks account
4. User forced to:
   ├── Reset password
   ├── Re-enable MFA
   ├── Review recent activity
   └── Acknowledge security policy
5. Monitor account for 30 days
6. Generate new API keys
```

---

### Scenario: API Key Leaked

```
Detection:
├── API key used from unusual IP
├── Rate limit violations
├── Unauthorized resource access
└── User reports key compromise

Immediate Actions:
1. Revoke API key instantly
2. Block all requests with that key
3. Alert user
4. Log all recent API calls
5. Investigate suspicious requests

User Actions:
1. Login to dashboard
2. Navigate to API Keys
3. Click "Revoke" on compromised key
4. Generate new API key
5. Update applications with new key
6. Test new key
7. Monitor usage

Prevention:
├── Never commit API keys to Git
├── Use environment variables
├── Rotate keys every 90 days
├── Use IP whitelist
└── Monitor API usage regularly
```

---

## 📞 Support & Help

### For Entity Registration Issues:
- Email: registration@degreedefenders.com
- Phone: 1800-XXX-XXXX (Mon-Fri, 9 AM - 6 PM)
- Portal: https://degreedefenders.com/support

### For Technical Support:
- Email: support@degreedefenders.com
- Phone: 1800-YYY-YYYY (24/7)
- Live Chat: Available on dashboard

### For Security Issues:
- Email: security@degreedefenders.com
- Phone: 1800-ZZZ-ZZZZ (24/7 Emergency)
- Report: https://degreedefenders.com/security-report

---

## 📚 Documentation

- **User Manual:** Complete guide for all features
- **API Documentation:** REST API reference
- **Security Guide:** Best practices
- **Integration Guide:** How to integrate with your systems
- **FAQ:** Common questions answered

---

## ✅ Summary

**Degree Defenders is a secure, enterprise-grade system where:**

1. ✅ **Only verified entities** can access (not public)
2. ✅ **Multi-layered security** protects credentials
3. ✅ **Automated onboarding** makes registration easy
4. ✅ **Real-time monitoring** detects threats
5. ✅ **Instant verification** saves time
6. ✅ **Complete audit trail** ensures accountability
7. ✅ **24/7 support** helps when needed
8. ✅ **API integration** enables automation

**Your credentials are protected by:**
- Multi-Factor Authentication
- Strong password policies
- Session management
- Suspicious activity detection
- Credential leak monitoring
- Automatic lockout
- Audit logging
- 24/7 security monitoring

**This ensures that only legitimate organizations can verify certificates, maintaining the integrity and trust of the entire system.**
