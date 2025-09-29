# Verified Entity Access System - Degree Defenders

## 🔐 Access Control Architecture

### Problem Statement Clarification
The system is **NOT for public use**. Access is restricted to:
- ✅ **Employers** (HR departments, recruitment agencies)
- ✅ **Educational Institutions** (Universities, colleges for admission)
- ✅ **Government Agencies** (Scholarship departments, regulatory bodies)
- ✅ **Verification Agencies** (Background check companies)
- ❌ **NOT for general public**

---

## 🏢 Entity Types & Roles

### 1. **Super Admin** (Government/Department of Higher Education)
**Responsibilities:**
- Approve/reject entity registration requests
- Manage all institutions and verifiers
- Monitor system-wide activities
- Blacklist fraudulent entities
- Access all analytics and reports

**Access Level:** Full system access

### 2. **University Admin** (Educational Institutions)
**Responsibilities:**
- Upload certificates (bulk/individual)
- Manage their institution's certificates
- View verification requests for their certificates
- Generate certificate PDFs
- Monitor fraud attempts on their certificates

**Access Level:** Own institution's data only

### 3. **Verifier** (Employers, Agencies)
**Responsibilities:**
- Submit verification requests
- Upload certificates for verification
- View verification results
- Track verification history
- Download verification reports

**Access Level:** Read-only verification access

### 4. **Government Agency**
**Responsibilities:**
- Verify certificates for scholarships/schemes
- Access verification statistics
- Report fraud patterns
- Bulk verification requests

**Access Level:** Verification + limited analytics

---

## 🔑 Entity Registration & Credential Management

### Registration Process

#### Step 1: Entity Application
```
Entity submits registration request with:
├── Organization Details
│   ├── Legal name
│   ├── Registration number (CIN/GSTIN)
│   ├── Type (Employer/Institution/Agency)
│   ├── Address & contact
│   └── Authorized person details
├── Verification Documents
│   ├── Business registration certificate
│   ├── GST certificate
│   ├── PAN card
│   ├── Address proof
│   └── Authorization letter
└── Purpose of Access
    ├── Hiring/Recruitment
    ├── Admission processing
    ├── Background verification
    └── Government scheme
```

#### Step 2: Document Verification
```
Super Admin reviews:
├── Document authenticity check
├── Organization legitimacy verification
├── Background check (if required)
├── Purpose validation
└── Risk assessment
```

#### Step 3: Approval & Credential Generation
```
If approved:
├── Generate unique Entity ID
├── Create secure credentials
├── Assign appropriate role
├── Set access permissions
├── Generate API keys (if needed)
└── Send credentials via secure channel
```

#### Step 4: Onboarding
```
Entity receives:
├── Login credentials (email + temporary password)
├── API keys (for integration)
├── User manual
├── Terms of service
└── Support contact
```

---

## 🔐 Credential Security System

### 1. **Multi-Factor Authentication (MFA)**

```javascript
// Login Flow
Step 1: Email + Password
   ↓
Step 2: OTP to registered mobile
   ↓
Step 3: Optional: Authenticator app (Google/Microsoft)
   ↓
Step 4: Session token generated
```

**Implementation:**
```javascript
// src/middleware/mfa.js
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

class MFAService {
  // Generate MFA secret for entity
  async generateMFASecret(entityId) {
    const secret = speakeasy.generateSecret({
      name: `Degree Defenders (${entityId})`,
      length: 32
    });
    
    // Store secret in database (encrypted)
    await prisma.entity.update({
      where: { id: entityId },
      data: { 
        mfaSecret: this.encrypt(secret.base32),
        mfaEnabled: true
      }
    });
    
    // Generate QR code for authenticator app
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    
    return { secret: secret.base32, qrCode };
  }
  
  // Verify MFA token
  verifyMFAToken(secret, token) {
    return speakeasy.totp.verify({
      secret: this.decrypt(secret),
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps (60 seconds)
    });
  }
}
```

### 2. **Password Security**

**Requirements:**
- Minimum 12 characters
- Must include: uppercase, lowercase, number, special character
- Cannot contain organization name or email
- Password history (last 5 passwords)
- Mandatory change every 90 days
- Account lockout after 5 failed attempts

**Implementation:**
```javascript
// src/utils/passwordSecurity.js
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class PasswordSecurity {
  // Hash password with bcrypt (cost factor 12)
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }
  
  // Validate password strength
  validatePasswordStrength(password) {
    const requirements = {
      minLength: password.length >= 12,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    return Object.values(requirements).every(req => req === true);
  }
  
  // Check password history
  async checkPasswordHistory(userId, newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { passwordHistory: { take: 5, orderBy: { createdAt: 'desc' } } }
    });
    
    for (const oldPassword of user.passwordHistory) {
      if (await bcrypt.compare(newPassword, oldPassword.hash)) {
        return false; // Password was used before
      }
    }
    return true;
  }
}
```

### 3. **Session Management**

```javascript
// src/middleware/sessionManagement.js
class SessionManager {
  constructor() {
    this.activeSessions = new Map();
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.maxConcurrentSessions = 3; // Per user
  }
  
  // Create session with security metadata
  async createSession(userId, req) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    
    const session = {
      id: sessionId,
      userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      createdAt: Date.now(),
      lastActivity: Date.now(),
      expiresAt: Date.now() + this.sessionTimeout
    };
    
    // Check concurrent sessions
    const userSessions = this.getUserSessions(userId);
    if (userSessions.length >= this.maxConcurrentSessions) {
      // Terminate oldest session
      const oldestSession = userSessions.sort((a, b) => a.lastActivity - b.lastActivity)[0];
      this.terminateSession(oldestSession.id);
    }
    
    // Store session
    this.activeSessions.set(sessionId, session);
    
    // Store in database for persistence
    await prisma.session.create({
      data: {
        id: sessionId,
        userId,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        expiresAt: new Date(session.expiresAt)
      }
    });
    
    return sessionId;
  }
  
  // Validate session
  async validateSession(sessionId, req) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }
    
    // Check expiration
    if (Date.now() > session.expiresAt) {
      this.terminateSession(sessionId);
      return { valid: false, reason: 'Session expired' };
    }
    
    // Check IP address (optional - can be disabled for mobile users)
    if (session.ipAddress !== req.ip) {
      // Log suspicious activity
      await this.logSuspiciousActivity(session.userId, 'IP address mismatch');
    }
    
    // Update last activity
    session.lastActivity = Date.now();
    session.expiresAt = Date.now() + this.sessionTimeout;
    
    return { valid: true, session };
  }
  
  // Terminate session
  async terminateSession(sessionId) {
    this.activeSessions.delete(sessionId);
    await prisma.session.delete({ where: { id: sessionId } });
  }
}
```

### 4. **API Key Management** (for programmatic access)

```javascript
// src/services/apiKeyService.js
class APIKeyService {
  // Generate API key for entity
  async generateAPIKey(entityId, name, permissions) {
    // Generate secure random key
    const apiKey = `dd_${crypto.randomBytes(32).toString('hex')}`;
    const hashedKey = await bcrypt.hash(apiKey, 12);
    
    // Store in database
    const key = await prisma.apiKey.create({
      data: {
        entityId,
        name,
        keyHash: hashedKey,
        permissions: JSON.stringify(permissions),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        isActive: true
      }
    });
    
    // Return plain key only once
    return {
      id: key.id,
      apiKey: apiKey, // Show only once
      name: key.name,
      permissions: permissions,
      expiresAt: key.expiresAt
    };
  }
  
  // Validate API key
  async validateAPIKey(apiKey) {
    // Extract entity ID from key prefix if needed
    const keys = await prisma.apiKey.findMany({
      where: { isActive: true }
    });
    
    for (const key of keys) {
      if (await bcrypt.compare(apiKey, key.keyHash)) {
        // Check expiration
        if (new Date() > key.expiresAt) {
          return { valid: false, reason: 'API key expired' };
        }
        
        // Update last used
        await prisma.apiKey.update({
          where: { id: key.id },
          data: { lastUsedAt: new Date() }
        });
        
        return {
          valid: true,
          entityId: key.entityId,
          permissions: JSON.parse(key.permissions)
        };
      }
    }
    
    return { valid: false, reason: 'Invalid API key' };
  }
  
  // Rotate API key
  async rotateAPIKey(keyId) {
    const oldKey = await prisma.apiKey.findUnique({ where: { id: keyId } });
    
    // Deactivate old key
    await prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false }
    });
    
    // Generate new key
    return this.generateAPIKey(
      oldKey.entityId,
      oldKey.name,
      JSON.parse(oldKey.permissions)
    );
  }
}
```

---

## 🛡️ Security Measures for Credential Leakage

### 1. **Immediate Response System**

```javascript
// src/services/securityIncidentService.js
class SecurityIncidentService {
  // Detect suspicious activity
  async detectSuspiciousActivity(userId, activity) {
    const indicators = {
      multipleFailedLogins: await this.checkFailedLogins(userId),
      unusualLocation: await this.checkLocationAnomaly(userId, activity.ipAddress),
      unusualTime: this.checkTimeAnomaly(activity.timestamp),
      multipleDevices: await this.checkDeviceAnomaly(userId, activity.userAgent),
      rapidRequests: await this.checkRateLimitViolation(userId)
    };
    
    const suspicionScore = this.calculateSuspicionScore(indicators);
    
    if (suspicionScore > 70) {
      await this.triggerSecurityResponse(userId, suspicionScore, indicators);
    }
  }
  
  // Automatic security response
  async triggerSecurityResponse(userId, score, indicators) {
    if (score > 90) {
      // Critical: Immediate lockout
      await this.lockAccount(userId, 'CRITICAL_THREAT');
      await this.terminateAllSessions(userId);
      await this.notifySecurityTeam(userId, 'CRITICAL', indicators);
      await this.notifyUser(userId, 'ACCOUNT_LOCKED');
    } else if (score > 70) {
      // High: Require re-authentication
      await this.requireReAuthentication(userId);
      await this.notifySecurityTeam(userId, 'HIGH', indicators);
      await this.notifyUser(userId, 'SUSPICIOUS_ACTIVITY');
    }
  }
  
  // Account lockout
  async lockAccount(userId, reason) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isLocked: true,
        lockedAt: new Date(),
        lockReason: reason
      }
    });
    
    // Log incident
    await prisma.securityIncident.create({
      data: {
        userId,
        type: 'ACCOUNT_LOCKED',
        reason,
        severity: 'CRITICAL',
        timestamp: new Date()
      }
    });
  }
}
```

### 2. **Credential Leak Detection**

```javascript
// src/services/credentialLeakDetection.js
class CredentialLeakDetection {
  // Monitor for leaked credentials
  async checkForLeakedCredentials(email, password) {
    // Check against Have I Been Pwned API
    const passwordHash = crypto.createHash('sha1').update(password).digest('hex');
    const prefix = passwordHash.substring(0, 5);
    const suffix = passwordHash.substring(5);
    
    try {
      const response = await axios.get(`https://api.pwnedpasswords.com/range/${prefix}`);
      const hashes = response.data.split('\n');
      
      for (const hash of hashes) {
        const [hashSuffix, count] = hash.split(':');
        if (hashSuffix.toLowerCase() === suffix.toLowerCase()) {
          return {
            leaked: true,
            occurrences: parseInt(count),
            recommendation: 'Password found in data breach. Change immediately.'
          };
        }
      }
    } catch (error) {
      logger.error('Leak detection error:', error);
    }
    
    return { leaked: false };
  }
  
  // Force password reset for compromised accounts
  async forcePasswordReset(userId, reason) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetRequired: true,
        passwordResetReason: reason,
        passwordResetRequestedAt: new Date()
      }
    });
    
    // Send notification
    await this.sendPasswordResetNotification(userId, reason);
  }
}
```

### 3. **Access Monitoring & Audit**

```javascript
// src/middleware/accessAudit.js
class AccessAuditService {
  // Log every access attempt
  async logAccess(req, userId, action, resource) {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date(),
        requestBody: this.sanitizeRequestBody(req.body),
        responseStatus: res.statusCode
      }
    });
  }
  
  // Analyze access patterns
  async analyzeAccessPatterns(userId) {
    const recentAccess = await prisma.auditLog.findMany({
      where: {
        userId,
        timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      orderBy: { timestamp: 'desc' }
    });
    
    return {
      totalRequests: recentAccess.length,
      uniqueIPs: new Set(recentAccess.map(a => a.ipAddress)).size,
      uniqueDevices: new Set(recentAccess.map(a => a.userAgent)).size,
      failedAttempts: recentAccess.filter(a => a.responseStatus >= 400).length,
      suspiciousPatterns: this.detectSuspiciousPatterns(recentAccess)
    };
  }
}
```

---

## 🔄 Credential Recovery Process

### Forgot Password Flow

```
User clicks "Forgot Password"
   ↓
Enter registered email
   ↓
System verifies:
├── Email exists in system
├── Account is active (not locked)
└── No recent reset requests (rate limiting)
   ↓
Send OTP to registered mobile
   ↓
User enters OTP
   ↓
Verify OTP (valid for 10 minutes)
   ↓
User sets new password
├── Must meet strength requirements
├── Cannot be same as last 5 passwords
└── Must be different from old password
   ↓
Password updated
├── All sessions terminated
├── Notification sent to email & mobile
└── Security team notified (if suspicious)
```

### Account Unlock Process

```
Account locked due to suspicious activity
   ↓
User contacts support with:
├── Organization details
├── Authorized person ID proof
├── Reason for unlock request
└── Security questions answers
   ↓
Support team verifies:
├── Identity verification
├── Organization legitimacy
├── No ongoing investigation
└── Risk assessment
   ↓
If approved:
├── Account unlocked
├── Force password reset
├── Re-enable MFA
├── Review access permissions
└── Monitor for 30 days
```

---

## 📊 Entity Access Levels & Permissions

### Permission Matrix

| Action | Super Admin | University Admin | Verifier | Gov Agency |
|--------|-------------|------------------|----------|------------|
| Upload Certificates | ✅ | ✅ (Own only) | ❌ | ❌ |
| Verify Certificates | ✅ | ✅ | ✅ | ✅ |
| Generate PDF | ✅ | ✅ (Own only) | ❌ | ❌ |
| View All Certificates | ✅ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ✅ (Own org) | ❌ | ❌ |
| Access Analytics | ✅ | ✅ (Own data) | ❌ | ✅ (Limited) |
| Blacklist Entities | ✅ | ❌ | ❌ | ✅ |
| API Access | ✅ | ✅ | ✅ | ✅ |
| Bulk Operations | ✅ | ✅ | ✅ | ✅ |
| Export Data | ✅ | ✅ (Own data) | ✅ (Own requests) | ✅ |

---

## 🔐 Implementation Code

### Enhanced Authentication Middleware

```javascript
// src/middleware/enhancedAuth.js
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts. Account temporarily locked.',
  handler: async (req, res) => {
    // Lock account after 5 failed attempts
    await securityIncidentService.lockAccount(
      req.body.email,
      'EXCESSIVE_FAILED_LOGINS'
    );
    
    res.status(429).json({
      error: 'Account locked due to multiple failed login attempts',
      message: 'Contact support to unlock your account'
    });
  }
});

// Enhanced authentication middleware
const enhancedAuthenticate = async (req, res, next) => {
  try {
    // Extract token
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validate session
    const sessionValid = await sessionManager.validateSession(
      decoded.sessionId,
      req
    );
    
    if (!sessionValid.valid) {
      return res.status(401).json({ error: sessionValid.reason });
    }
    
    // Check if account is locked
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { entity: true }
    });
    
    if (user.isLocked) {
      return res.status(403).json({
        error: 'Account locked',
        reason: user.lockReason,
        contact: 'support@degreedefenders.com'
      });
    }
    
    // Check if password reset required
    if (user.passwordResetRequired) {
      return res.status(403).json({
        error: 'Password reset required',
        reason: user.passwordResetReason
      });
    }
    
    // Check MFA if enabled
    if (user.mfaEnabled && !req.headers['x-mfa-token']) {
      return res.status(403).json({
        error: 'MFA token required',
        message: 'Please provide MFA token in X-MFA-Token header'
      });
    }
    
    if (user.mfaEnabled) {
      const mfaValid = mfaService.verifyMFAToken(
        user.mfaSecret,
        req.headers['x-mfa-token']
      );
      
      if (!mfaValid) {
        return res.status(403).json({ error: 'Invalid MFA token' });
      }
    }
    
    // Log access
    await accessAuditService.logAccess(req, user.id, req.method, req.path);
    
    // Detect suspicious activity
    await securityIncidentService.detectSuspiciousActivity(user.id, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    });
    
    // Attach user to request
    req.user = user;
    req.entity = user.entity;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    logger.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = { enhancedAuthenticate, loginLimiter };
```

---

## 📝 Summary

### Key Security Features:
1. ✅ **Multi-Factor Authentication** - OTP + Authenticator app
2. ✅ **Strong Password Policy** - 12+ chars, complexity, history
3. ✅ **Session Management** - Timeout, concurrent session limits
4. ✅ **API Key Security** - Hashed storage, rotation, expiration
5. ✅ **Suspicious Activity Detection** - Real-time monitoring
6. ✅ **Automatic Lockout** - Failed attempts, suspicious patterns
7. ✅ **Credential Leak Detection** - HIBP integration
8. ✅ **Access Audit Logging** - Complete activity tracking
9. ✅ **Rate Limiting** - Prevent brute force attacks
10. ✅ **Secure Recovery** - Multi-step verification

### Entity Onboarding:
1. ✅ **Application** - Submit documents
2. ✅ **Verification** - Manual review by Super Admin
3. ✅ **Approval** - Credentials generated
4. ✅ **Onboarding** - Training & documentation
5. ✅ **Monitoring** - Continuous security checks

This system ensures that **only verified, trusted entities** can access the certificate verification system, with multiple layers of security to prevent unauthorized access and credential compromise.
