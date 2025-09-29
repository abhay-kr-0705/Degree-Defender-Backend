# Degree Defenders - SIH 2025 Implementation Guide

## Overview
This guide provides step-by-step instructions to implement all SIH 2025 enhancements to make Degree Defenders stand out among 500+ competitors.

## Phase 1: Core Infrastructure Setup (Day 1-2)

### Step 1: Install Dependencies
```bash
# Run the installation script
cd "C:\Users\abhay\OneDrive\Desktop\Degree Defenders"

# Backend dependencies
npm install pdfkit qrcode pdf-lib sharp jimp nodemailer twilio socket.io crypto-js

# Frontend dependencies
cd frontend
npm install recharts @tremor/react socket.io-client
cd ..
```

### Step 2: Update Database Schema
```bash
# Update prisma/schema.prisma with new models from SCHEMA_UPDATES.md
# Then run:
npx prisma migrate dev --name add_sih_2025_enhancements
npx prisma generate
```

### Step 3: Update Environment Variables
Add the following to your `.env` file:
```env
# PDF Generation
PDF_OUTPUT_DIR=./generated/certificates
FRONTEND_URL=http://localhost:3000

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Twilio SMS
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890

# Alerts
ALERT_EMAIL_RECIPIENTS=admin@example.com
```

### Step 4: Create Required Directories
```bash
mkdir generated
mkdir generated\certificates
mkdir templates
mkdir templates\certificates
mkdir uploads\evidence
```

### Step 5: Register New Routes
Update `src/index.js` to include new routes:

```javascript
// Add these imports
const certificateGenerationRoutes = require('./routes/certificateGeneration');

// Add these routes
app.use('/api/certificate-generation', certificateGenerationRoutes);
```

## Phase 2: PDF Certificate Generation (Day 3-4)

### Files Already Created:
- ✅ `src/services/certificateGenerationService.js`
- ✅ `src/routes/certificateGeneration.js`

### Testing PDF Generation:

1. **Generate a single certificate:**
```bash
# Using curl or Postman
POST http://localhost:3001/api/certificate-generation/generate/{certificateId}
Headers: Authorization: Bearer {your-token}
```

2. **Bulk generate certificates:**
```bash
POST http://localhost:3001/api/certificate-generation/bulk-generate
Body: {
  "certificateIds": ["cert-id-1", "cert-id-2"]
}
```

3. **Download generated PDF:**
```bash
GET http://localhost:3001/api/certificate-generation/download/{certificateId}
```

### Frontend Integration:

Create `frontend/src/pages/generate-certificates.tsx`:
```typescript
import { useState } from 'react';
import apiClient from '../lib/api';
import Button from '../components/ui/Button';

export default function GenerateCertificates() {
  const [certificateId, setCertificateId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await apiClient.request({
        method: 'POST',
        url: `/certificate-generation/generate/${certificateId}`
      });
      
      // Download the PDF
      window.location.href = `/api/certificate-generation/download/${certificateId}`;
      
      alert('Certificate generated successfully!');
    } catch (error) {
      alert('Failed to generate certificate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Generate Certificate PDF</h1>
      <input
        type="text"
        value={certificateId}
        onChange={(e) => setCertificateId(e.target.value)}
        placeholder="Enter Certificate ID"
        className="border p-2 rounded mr-2"
      />
      <Button onClick={handleGenerate} loading={loading}>
        Generate PDF
      </Button>
    </div>
  );
}
```

## Phase 3: Advanced Forgery Detection (Day 5-7)

### Files Already Created:
- ✅ `src/services/advancedForgeryDetectionService.js`

### Integration with Certificate Upload:

Update `src/routes/certificates.js` to include forgery detection:

```javascript
const advancedForgeryDetection = require('../services/advancedForgeryDetectionService');

// In the upload route, after OCR extraction:
const forgeryAnalysis = await advancedForgeryDetection.detectForgery(
  req.file.path,
  certificateData
);

// Store forgery analysis results
if (forgeryAnalysis.isForged || forgeryAnalysis.suspicionScore > 50) {
  // Create fraud alert
  await prisma.fraudAlert.create({
    data: {
      alertType: 'FORGERY_DETECTED',
      severity: forgeryAnalysis.suspicionScore > 70 ? 'HIGH' : 'MEDIUM',
      description: `Forgery detected with ${forgeryAnalysis.suspicionScore}% suspicion`,
      certificateId: certificate.id,
      detectionMethod: 'AI',
      confidence: forgeryAnalysis.confidence,
      evidenceData: forgeryAnalysis
    }
  });
  
  // Send alert notification
  await notificationService.sendFraudAlert(forgeryAnalysis);
}
```

### Testing Forgery Detection:

Create `scripts/test-forgery-detection.js`:
```javascript
const advancedForgeryDetection = require('../src/services/advancedForgeryDetectionService');

async function testForgeryDetection() {
  const testCertificateData = {
    certificateNumber: 'TEST/2024/001',
    studentName: 'Test Student',
    course: 'B.Tech',
    passingYear: 2024,
    cgpa: 8.5,
    dateOfIssue: new Date(),
    institutionId: 'test-institution-id'
  };

  const result = await advancedForgeryDetection.detectForgery(
    './test-certificate.jpg',
    testCertificateData
  );

  console.log('Forgery Detection Results:');
  console.log(JSON.stringify(result, null, 2));
}

testForgeryDetection().catch(console.error);
```

Run test:
```bash
node scripts/test-forgery-detection.js
```

## Phase 4: Real-time Alert System (Day 8-9)

### Create Notification Service:

Create `src/services/notificationService.js`:
```javascript
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const { logger } = require('../utils/logger');

class NotificationService {
  constructor() {
    // Email transporter
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Twilio client
    if (process.env.TWILIO_ACCOUNT_SID) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }

  async sendFraudAlert(forgeryAnalysis) {
    const subject = `🚨 FRAUD ALERT: ${forgeryAnalysis.suspicionScore}% Suspicion`;
    const message = `
      Forgery Detected!
      
      Suspicion Score: ${forgeryAnalysis.suspicionScore}%
      Confidence: ${forgeryAnalysis.confidence}%
      
      Anomalies Detected:
      ${forgeryAnalysis.anomalies.map(a => `- ${a.description}`).join('\n')}
      
      Immediate action required!
    `;

    // Send email
    await this.sendEmail(
      process.env.ALERT_EMAIL_RECIPIENTS.split(','),
      subject,
      message
    );

    // Send SMS for critical alerts
    if (forgeryAnalysis.suspicionScore > 80) {
      await this.sendSMS(
        process.env.ALERT_SMS_RECIPIENTS.split(','),
        `CRITICAL: Forgery detected with ${forgeryAnalysis.suspicionScore}% suspicion`
      );
    }
  }

  async sendEmail(recipients, subject, text) {
    try {
      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: recipients.join(','),
        subject,
        text
      });
      logger.info(`Email sent to ${recipients.length} recipients`);
    } catch (error) {
      logger.error('Email send error:', error);
    }
  }

  async sendSMS(recipients, message) {
    if (!this.twilioClient) return;

    try {
      for (const recipient of recipients) {
        await this.twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: recipient
        });
      }
      logger.info(`SMS sent to ${recipients.length} recipients`);
    } catch (error) {
      logger.error('SMS send error:', error);
    }
  }
}

module.exports = new NotificationService();
```

### Create Socket.IO Service for Real-time Updates:

Create `src/services/socketService.js`:
```javascript
const socketIO = require('socket.io');
const { logger } = require('../utils/logger');

let io;

function initializeSocket(server) {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

function emitFraudAlert(alertData) {
  if (io) {
    io.emit('fraud-alert', alertData);
  }
}

function emitVerificationUpdate(verificationData) {
  if (io) {
    io.emit('verification-update', verificationData);
  }
}

module.exports = {
  initializeSocket,
  emitFraudAlert,
  emitVerificationUpdate
};
```

Update `src/index.js`:
```javascript
const { initializeSocket } = require('./services/socketService');

// After creating the server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Initialize Socket.IO
initializeSocket(server);
```

## Phase 5: Public Verification Portal (Day 10-11)

### Create Public Verification Page:

Create `frontend/src/pages/public-verify-simple.tsx`:
```typescript
import { useState } from 'react';
import { Search } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

export default function PublicVerifySimple() {
  const [certificateNumber, setCertificateNumber] = useState('');
  const [dob, setDob] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/public/verify-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificateNumber, dob })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      alert('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          Verify Certificate
        </h1>
        
        <Card className="p-6">
          <div className="space-y-4">
            <Input
              label="Certificate Number"
              value={certificateNumber}
              onChange={(e) => setCertificateNumber(e.target.value)}
              placeholder="e.g., RU/2023/BSC/001"
            />
            
            <Input
              label="Date of Birth"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
            
            <Button
              onClick={handleVerify}
              loading={loading}
              className="w-full"
            >
              <Search className="mr-2" />
              Verify Certificate
            </Button>
          </div>
          
          {result && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
              <h3 className="font-bold text-green-800">Verification Result</h3>
              <p>Status: {result.isValid ? '✅ Valid' : '❌ Invalid'}</p>
              <p>Student: {result.studentName}</p>
              <p>Course: {result.course}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
```

### Create Public API Route:

Create `src/routes/publicVerification.js`:
```javascript
const express = require('express');
const { getPrismaClient } = require('../config/database');
const router = express.Router();

router.post('/verify-simple', async (req, res) => {
  try {
    const { certificateNumber, dob } = req.body;
    
    const prisma = getPrismaClient();
    const certificate = await prisma.certificate.findFirst({
      where: {
        certificateNumber,
        status: 'VERIFIED'
      },
      include: {
        institution: true
      }
    });

    if (!certificate) {
      return res.json({
        isValid: false,
        message: 'Certificate not found or not verified'
      });
    }

    // Verify DOB matches (implement your logic)
    
    res.json({
      isValid: true,
      studentName: certificate.studentName,
      course: certificate.course,
      institution: certificate.institution.name,
      passingYear: certificate.passingYear
    });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

module.exports = router;
```

## Phase 6: Analytics Dashboard (Day 12-13)

### Create Analytics Service:

Create `src/services/analyticsService.js`:
```javascript
const { getPrismaClient } = require('../config/database');

class AnalyticsService {
  async getFraudTrends(startDate, endDate) {
    const prisma = getPrismaClient();
    
    const fraudAlerts = await prisma.fraudAlert.groupBy({
      by: ['alertType', 'severity'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: true
    });

    return fraudAlerts;
  }

  async getVerificationStats(institutionId = null) {
    const prisma = getPrismaClient();
    
    const stats = await prisma.verificationStatistics.aggregate({
      where: institutionId ? { institutionId } : {},
      _sum: {
        totalVerifications: true,
        successfulVerifications: true,
        fraudDetected: true
      },
      _avg: {
        avgConfidenceScore: true
      }
    });

    return stats;
  }

  async getTopForgeryPatterns(limit = 10) {
    const prisma = getPrismaClient();
    
    return await prisma.forgeryPattern.findMany({
      orderBy: { detectedCount: 'desc' },
      take: limit
    });
  }
}

module.exports = new AnalyticsService();
```

## Phase 7: Testing & Deployment (Day 14-15)

### Comprehensive Testing Checklist:

- [ ] PDF generation works for all certificate types
- [ ] QR codes scan correctly on mobile devices
- [ ] Forgery detection identifies tampered images
- [ ] Email alerts are sent for high-severity fraud
- [ ] Public verification portal works without login
- [ ] Blockchain integration still functions
- [ ] All API endpoints return correct responses
- [ ] Frontend pages load without errors
- [ ] Database migrations applied successfully
- [ ] Performance is acceptable (< 5s verification)

### Performance Testing:
```bash
# Install Apache Bench
# Test verification endpoint
ab -n 1000 -c 10 http://localhost:3001/api/public/verify-simple

# Monitor response times
```

### Security Audit:
- [ ] SQL injection prevention (using Prisma)
- [ ] XSS prevention (React escaping)
- [ ] CSRF protection
- [ ] Rate limiting on public endpoints
- [ ] Input validation on all routes
- [ ] Secure file upload handling
- [ ] Environment variables not exposed

## Deployment Commands

### Production Build:
```bash
# Backend
npm run build

# Frontend
cd frontend
npm run build
cd ..
```

### Database Migration:
```bash
npx prisma migrate deploy
```

### Start Production:
```bash
npm start
```

## Monitoring & Maintenance

### Log Monitoring:
```bash
# View logs
tail -f logs/combined.log
tail -f logs/error.log
```

### Database Backup:
```bash
# PostgreSQL backup
pg_dump -U postgres degree_defenders > backup_$(date +%Y%m%d).sql
```

### Performance Monitoring:
- Set up Prometheus + Grafana
- Monitor API response times
- Track forgery detection accuracy
- Monitor alert delivery success rate

## Success Metrics

Track these KPIs:
- Verification time: < 5 seconds
- Forgery detection accuracy: > 95%
- System uptime: > 99.9%
- User satisfaction: > 4.5/5
- False positive rate: < 5%

## Support & Documentation

- API Documentation: `/api/docs`
- User Guide: `USER_GUIDE.md`
- Admin Manual: `ADMIN_MANUAL.md`
- Troubleshooting: `TROUBLESHOOTING.md`

## Next Steps After Implementation

1. Conduct user acceptance testing
2. Gather feedback from institutions
3. Prepare SIH presentation
4. Create demo video
5. Document unique features
6. Prepare for Q&A session
