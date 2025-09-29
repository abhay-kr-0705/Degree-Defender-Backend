# Database Schema Updates for SIH 2025 Enhancements

## Required Schema Changes

### 1. Certificate Table - Add PDF Generation Fields

Add these fields to the `Certificate` model in `prisma/schema.prisma`:

```prisma
model Certificate {
  // ... existing fields ...
  
  // PDF Generation fields
  generatedPdfPath    String?
  pdfFingerprint      String?            @unique
  pdfGeneratedAt      DateTime?
  
  // Enhanced Security fields
  multiLayerHash      String?            @unique
  tamperScore         Float?             @default(0)
  lastTamperCheck     DateTime?
  
  // ... rest of existing fields ...
}
```

### 2. New InstitutionBlacklist Table

```prisma
model InstitutionBlacklist {
  id                String             @id @default(cuid())
  institutionId     String
  reason            String
  blacklistedBy     String
  isActive          Boolean            @default(true)
  blacklistedAt     DateTime           @default(now())
  expiresAt         DateTime?
  notes             String?
  
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  
  @@map("institution_blacklist")
}
```

### 3. New FraudAlert Table

```prisma
enum AlertSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum AlertStatus {
  PENDING
  ACKNOWLEDGED
  INVESTIGATING
  RESOLVED
  FALSE_POSITIVE
}

model FraudAlert {
  id                String             @id @default(cuid())
  alertType         String             // DUPLICATE, TAMPERED_PHOTO, FORGED_SEAL, etc.
  severity          AlertSeverity
  status            AlertStatus        @default(PENDING)
  
  // Alert details
  description       String
  certificateId     String?
  institutionId     String?
  detectionMethod   String             // AI, OCR, BLOCKCHAIN, MANUAL
  confidence        Float
  
  // Evidence
  evidenceData      Json?
  imageUrls         String[]
  
  // Response
  acknowledgedBy    String?
  acknowledgedAt    DateTime?
  resolvedBy        String?
  resolvedAt        DateTime?
  resolution        String?
  
  // Notifications
  notificationsSent Boolean            @default(false)
  emailsSent        String[]
  
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  
  @@map("fraud_alerts")
}
```

### 4. New ForgeryPattern Table

```prisma
model ForgeryPattern {
  id                String             @id @default(cuid())
  patternType       String             // SEAL_FORGERY, PHOTO_MANIPULATION, etc.
  patternHash       String             @unique
  description       String
  
  // Pattern characteristics
  characteristics   Json
  imageSignature    String?
  
  // Detection metadata
  detectedCount     Int                @default(1)
  firstDetected     DateTime           @default(now())
  lastDetected      DateTime           @default(now())
  
  // Associated data
  institutionIds    String[]
  certificateIds    String[]
  
  isActive          Boolean            @default(true)
  
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  
  @@map("forgery_patterns")
}
```

### 5. Enhanced Anomaly Table

Add these fields to existing `Anomaly` model:

```prisma
model Anomaly {
  // ... existing fields ...
  
  // Enhanced detection fields
  detectionConfidence Float?
  aiModelVersion      String?
  evidenceImages      String[]
  tamperScore         Float?
  
  // ... rest of existing fields ...
}
```

### 6. New VerificationStatistics Table

```prisma
model VerificationStatistics {
  id                String             @id @default(cuid())
  date              DateTime           @default(now())
  institutionId     String?
  
  // Daily statistics
  totalVerifications Int               @default(0)
  successfulVerifications Int          @default(0)
  failedVerifications Int              @default(0)
  suspiciousVerifications Int          @default(0)
  
  // Fraud statistics
  fraudDetected     Int                @default(0)
  photoTampering    Int                @default(0)
  sealForgery       Int                @default(0)
  duplicates        Int                @default(0)
  
  // Performance metrics
  avgVerificationTime Float?
  avgConfidenceScore Float?
  
  createdAt         DateTime           @default(now())
  
  @@unique([date, institutionId])
  @@map("verification_statistics")
}
```

## Migration Commands

### Step 1: Update schema.prisma file
Copy the above models and fields into your `prisma/schema.prisma` file.

### Step 2: Create migration
```bash
npx prisma migrate dev --name add_sih_2025_enhancements
```

### Step 3: Generate Prisma Client
```bash
npx prisma generate
```

### Step 4: Apply migration to production
```bash
npx prisma migrate deploy
```

## Manual SQL Updates (if needed)

If you prefer manual SQL updates, run these commands:

```sql
-- Add PDF generation fields to certificates table
ALTER TABLE certificates 
ADD COLUMN generated_pdf_path TEXT,
ADD COLUMN pdf_fingerprint TEXT UNIQUE,
ADD COLUMN pdf_generated_at TIMESTAMP,
ADD COLUMN multi_layer_hash TEXT UNIQUE,
ADD COLUMN tamper_score DECIMAL(5,2) DEFAULT 0,
ADD COLUMN last_tamper_check TIMESTAMP;

-- Create institution_blacklist table
CREATE TABLE institution_blacklist (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  blacklisted_by TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create fraud_alerts table
CREATE TYPE alert_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE alert_status AS ENUM ('PENDING', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE');

CREATE TABLE fraud_alerts (
  id TEXT PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity alert_severity NOT NULL,
  status alert_status DEFAULT 'PENDING',
  description TEXT NOT NULL,
  certificate_id TEXT,
  institution_id TEXT,
  detection_method TEXT NOT NULL,
  confidence DECIMAL(5,2) NOT NULL,
  evidence_data JSONB,
  image_urls TEXT[],
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMP,
  resolved_by TEXT,
  resolved_at TIMESTAMP,
  resolution TEXT,
  notifications_sent BOOLEAN DEFAULT FALSE,
  emails_sent TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create forgery_patterns table
CREATE TABLE forgery_patterns (
  id TEXT PRIMARY KEY,
  pattern_type TEXT NOT NULL,
  pattern_hash TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  characteristics JSONB NOT NULL,
  image_signature TEXT,
  detected_count INTEGER DEFAULT 1,
  first_detected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_detected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  institution_ids TEXT[],
  certificate_ids TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create verification_statistics table
CREATE TABLE verification_statistics (
  id TEXT PRIMARY KEY,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  institution_id TEXT,
  total_verifications INTEGER DEFAULT 0,
  successful_verifications INTEGER DEFAULT 0,
  failed_verifications INTEGER DEFAULT 0,
  suspicious_verifications INTEGER DEFAULT 0,
  fraud_detected INTEGER DEFAULT 0,
  photo_tampering INTEGER DEFAULT 0,
  seal_forgery INTEGER DEFAULT 0,
  duplicates INTEGER DEFAULT 0,
  avg_verification_time DECIMAL(10,2),
  avg_confidence_score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, institution_id)
);

-- Add enhanced fields to anomalies table
ALTER TABLE anomalies
ADD COLUMN detection_confidence DECIMAL(5,2),
ADD COLUMN ai_model_version TEXT,
ADD COLUMN evidence_images TEXT[],
ADD COLUMN tamper_score DECIMAL(5,2);

-- Create indexes for performance
CREATE INDEX idx_certificates_pdf_fingerprint ON certificates(pdf_fingerprint);
CREATE INDEX idx_certificates_multi_layer_hash ON certificates(multi_layer_hash);
CREATE INDEX idx_fraud_alerts_severity ON fraud_alerts(severity);
CREATE INDEX idx_fraud_alerts_status ON fraud_alerts(status);
CREATE INDEX idx_fraud_alerts_created_at ON fraud_alerts(created_at);
CREATE INDEX idx_forgery_patterns_type ON forgery_patterns(pattern_type);
CREATE INDEX idx_verification_stats_date ON verification_statistics(date);
CREATE INDEX idx_verification_stats_institution ON verification_statistics(institution_id);
```

## Data Migration Scripts

### Migrate existing certificates to add fingerprints
```javascript
// scripts/migrate-add-fingerprints.js
const { getPrismaClient } = require('../src/config/database');
const certificateGenerationService = require('../src/services/certificateGenerationService');

async function migrateFingerprints() {
  const prisma = getPrismaClient();
  
  const certificates = await prisma.certificate.findMany({
    where: {
      pdfFingerprint: null
    }
  });
  
  console.log(`Migrating ${certificates.length} certificates...`);
  
  for (const cert of certificates) {
    const fingerprint = certificateGenerationService.generateCertificateFingerprint(cert);
    
    await prisma.certificate.update({
      where: { id: cert.id },
      data: { pdfFingerprint: fingerprint }
    });
  }
  
  console.log('Migration completed!');
}

migrateFingerprints().catch(console.error);
```

## Verification

After running migrations, verify with:

```bash
# Check tables exist
npx prisma db pull

# Verify schema
npx prisma validate

# Check database
npx prisma studio
```
