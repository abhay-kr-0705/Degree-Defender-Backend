const { getPrismaClient } = require('../config/database');
const ocrService = require('./ocrService');
const blockchainService = require('./blockchainService');
const { logger } = require('../utils/logger');
const crypto = require('crypto');

class VerificationService {
  constructor() {
    this.anomalyThresholds = {
      lowConfidence: 60,
      mediumConfidence: 75,
      highConfidence: 90
    };
  }

  /**
   * Verify a certificate against database records
   */
  async verifyCertificate(certificateData, verificationRequest) {
    try {
      const prisma = getPrismaClient();
      
      // Create verification record
      const verification = await prisma.verification.create({
        data: {
          requestedBy: verificationRequest.requestedBy,
          requestorEmail: verificationRequest.requestorEmail,
          requestorPhone: verificationRequest.requestorPhone,
          purpose: verificationRequest.purpose,
          ipAddress: verificationRequest.ipAddress,
          userAgent: verificationRequest.userAgent,
          certificateId: certificateData.id,
          institutionId: verificationRequest.institutionId,
          verifiedById: verificationRequest.verifiedById,
        }
      });

      // Perform verification checks
      const verificationResult = await this.performVerificationChecks(certificateData, verification.id);
      
      // Update verification record with results
      await prisma.verification.update({
        where: { id: verification.id },
        data: {
          status: verificationResult.isValid ? 'COMPLETED' : 'FAILED',
          isValid: verificationResult.isValid,
          confidenceScore: verificationResult.confidenceScore,
          verificationNotes: verificationResult.notes,
          flaggedReasons: verificationResult.flaggedReasons,
          verifiedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        }
      });

      // Update certificate verification count
      await prisma.certificate.update({
        where: { id: certificateData.id },
        data: {
          verificationCount: { increment: 1 },
          lastVerified: new Date(),
        }
      });

      return {
        verificationId: verification.id,
        verificationCode: verification.verificationCode,
        ...verificationResult
      };
    } catch (error) {
      logger.error('Certificate verification error:', error);
      throw new Error('Verification failed');
    }
  }

  /**
   * Perform comprehensive verification checks
   */
  async performVerificationChecks(certificate, verificationId) {
    const checks = {
      databaseMatch: await this.checkDatabaseMatch(certificate),
      blockchainValidation: await this.checkBlockchainValidation(certificate),
      anomalyDetection: await this.detectAnomalies(certificate, verificationId),
      institutionValidation: await this.validateInstitution(certificate),
      duplicateCheck: await this.checkForDuplicates(certificate),
    };

    const confidenceScore = this.calculateConfidenceScore(checks);
    const isValid = confidenceScore >= this.anomalyThresholds.mediumConfidence;
    const flaggedReasons = this.getFlaggedReasons(checks);
    
    return {
      isValid,
      confidenceScore,
      checks,
      flaggedReasons,
      notes: this.generateVerificationNotes(checks),
    };
  }

  /**
   * Check if certificate exists in database
   */
  async checkDatabaseMatch(certificate) {
    try {
      const prisma = getPrismaClient();
      
      const dbCertificate = await prisma.certificate.findFirst({
        where: {
          OR: [
            { certificateNumber: certificate.certificateNumber },
            {
              AND: [
                { studentName: { contains: certificate.studentName, mode: 'insensitive' } },
                { rollNumber: certificate.rollNumber },
                { institutionId: certificate.institutionId }
              ]
            }
          ]
        },
        include: {
          institution: true
        }
      });

      if (!dbCertificate) {
        return {
          passed: false,
          confidence: 0,
          message: 'Certificate not found in database',
          details: null
        };
      }

      // Compare certificate details
      const matchScore = this.compareDetails(certificate, dbCertificate);
      
      return {
        passed: matchScore >= 80,
        confidence: matchScore,
        message: matchScore >= 80 ? 'Certificate found and verified' : 'Certificate details mismatch',
        details: dbCertificate
      };
    } catch (error) {
      logger.error('Database match check error:', error);
      return {
        passed: false,
        confidence: 0,
        message: 'Database check failed',
        details: null
      };
    }
  }

  /**
   * Validate certificate using blockchain (MANDATORY)
   */
  async checkBlockchainValidation(certificate) {
    try {
      if (!certificate.blockchainHash) {
        // For legacy certificates, generate blockchain hash for verification
        if (certificate.isLegacy) {
          const generatedHash = blockchainService.generateCertificateHash(certificate);
          return {
            passed: true,
            confidence: 60,
            message: 'Legacy certificate - blockchain hash generated for verification',
            details: { generatedHash, isLegacy: true }
          };
        } else {
          // New certificates MUST have blockchain hash
          return {
            passed: false,
            confidence: 0,
            message: 'Missing blockchain hash for non-legacy certificate',
            details: null
          };
        }
      }

      // Validate blockchain hash
      const blockchainResult = await blockchainService.validateCertificate(certificate.blockchainHash);
      
      if (blockchainResult.isValid) {
        return {
          passed: true,
          confidence: 100,
          message: 'Blockchain validation successful',
          details: blockchainResult
        };
      } else {
        return {
          passed: false,
          confidence: 0,
          message: 'Blockchain validation failed - certificate may be tampered',
          details: blockchainResult
        };
      }
    } catch (error) {
      logger.error('Blockchain validation error:', error);
      return {
        passed: false,
        confidence: 0,
        message: 'Blockchain validation error - unable to verify authenticity',
        details: { error: error.message }
      };
    }
  }

  /**
   * Detect anomalies in certificate
   */
  async detectAnomalies(certificate, verificationId) {
    const anomalies = [];
    let overallConfidence = 100;

    try {
      // Check OCR confidence
      if (certificate.ocrConfidence < this.anomalyThresholds.lowConfidence) {
        anomalies.push({
          type: 'LOW_OCR_CONFIDENCE',
          severity: 'MEDIUM',
          description: `OCR confidence is low: ${certificate.ocrConfidence}%`,
          confidence: 70
        });
        overallConfidence -= 20;
      }

      // Check for tampered grades
      const gradeAnomaly = await this.detectGradeTampering(certificate);
      if (gradeAnomaly) {
        anomalies.push(gradeAnomaly);
        overallConfidence -= 30;
      }

      // Check for invalid certificate numbers
      const certNumberAnomaly = this.validateCertificateNumber(certificate);
      if (certNumberAnomaly) {
        anomalies.push(certNumberAnomaly);
        overallConfidence -= 25;
      }

      // Check for suspicious patterns
      const patternAnomalies = this.detectSuspiciousPatterns(certificate);
      anomalies.push(...patternAnomalies);
      overallConfidence -= patternAnomalies.length * 15;

      // Check date consistency
      const dateAnomaly = this.validateDates(certificate);
      if (dateAnomaly) {
        anomalies.push(dateAnomaly);
        overallConfidence -= 20;
      }

      // Store anomalies in database
      if (anomalies.length > 0) {
        await this.storeAnomalies(certificate.id, anomalies);
      }

      return {
        passed: anomalies.length === 0,
        confidence: Math.max(0, overallConfidence),
        message: anomalies.length === 0 ? 'No anomalies detected' : `${anomalies.length} anomalies detected`,
        details: anomalies
      };
    } catch (error) {
      logger.error('Anomaly detection error:', error);
      return {
        passed: false,
        confidence: 0,
        message: 'Anomaly detection failed',
        details: []
      };
    }
  }

  /**
   * Validate institution
   */
  async validateInstitution(certificate) {
    try {
      const prisma = getPrismaClient();
      
      const institution = await prisma.institution.findUnique({
        where: { id: certificate.institutionId }
      });

      if (!institution) {
        return {
          passed: false,
          confidence: 0,
          message: 'Institution not found',
          details: null
        };
      }

      if (!institution.isActive || !institution.isVerified) {
        return {
          passed: false,
          confidence: 20,
          message: 'Institution is not active or verified',
          details: institution
        };
      }

      return {
        passed: true,
        confidence: 100,
        message: 'Institution is valid and verified',
        details: institution
      };
    } catch (error) {
      logger.error('Institution validation error:', error);
      return {
        passed: false,
        confidence: 0,
        message: 'Institution validation failed',
        details: null
      };
    }
  }

  /**
   * Check for duplicate certificates
   */
  async checkForDuplicates(certificate) {
    try {
      const prisma = getPrismaClient();
      
      const duplicates = await prisma.certificate.findMany({
        where: {
          AND: [
            { id: { not: certificate.id } },
            {
              OR: [
                { certificateNumber: certificate.certificateNumber },
                {
                  AND: [
                    { studentName: certificate.studentName },
                    { rollNumber: certificate.rollNumber },
                    { course: certificate.course },
                    { passingYear: certificate.passingYear }
                  ]
                }
              ]
            }
          ]
        }
      });

      return {
        passed: duplicates.length === 0,
        confidence: duplicates.length === 0 ? 100 : 0,
        message: duplicates.length === 0 ? 'No duplicates found' : `${duplicates.length} potential duplicates found`,
        details: duplicates
      };
    } catch (error) {
      logger.error('Duplicate check error:', error);
      return {
        passed: true,
        confidence: 50,
        message: 'Duplicate check failed',
        details: []
      };
    }
  }

  /**
   * Compare certificate details for matching
   */
  compareDetails(cert1, cert2) {
    let score = 0;
    let totalChecks = 0;

    const checks = [
      { field: 'studentName', weight: 25 },
      { field: 'certificateNumber', weight: 20 },
      { field: 'course', weight: 15 },
      { field: 'passingYear', weight: 10 },
      { field: 'rollNumber', weight: 10 },
      { field: 'grade', weight: 5 },
      { field: 'cgpa', weight: 5 },
      { field: 'percentage', weight: 5 },
      { field: 'dateOfIssue', weight: 5 }
    ];

    for (const check of checks) {
      totalChecks += check.weight;
      
      if (cert1[check.field] && cert2[check.field]) {
        if (check.field === 'studentName' || check.field === 'course') {
          // Fuzzy matching for names and courses
          const similarity = this.calculateStringSimilarity(
            cert1[check.field].toLowerCase(),
            cert2[check.field].toLowerCase()
          );
          score += similarity * check.weight;
        } else if (check.field === 'dateOfIssue') {
          // Date comparison
          const date1 = new Date(cert1[check.field]);
          const date2 = new Date(cert2[check.field]);
          const daysDiff = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24);
          const dateScore = daysDiff <= 1 ? 1 : (daysDiff <= 7 ? 0.8 : 0);
          score += dateScore * check.weight;
        } else {
          // Exact match
          if (cert1[check.field] === cert2[check.field]) {
            score += check.weight;
          }
        }
      }
    }

    return Math.round((score / totalChecks) * 100);
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  calculateStringSimilarity(str1, str2) {
    const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }
    
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : (maxLength - matrix[str2.length][str1.length]) / maxLength;
  }

  /**
   * Detect grade tampering
   */
  async detectGradeTampering(certificate) {
    // Check for unrealistic grades
    if (certificate.cgpa && certificate.cgpa > 10) {
      return {
        type: 'INVALID_CGPA',
        severity: 'HIGH',
        description: `CGPA exceeds maximum possible value: ${certificate.cgpa}`,
        confidence: 95
      };
    }

    if (certificate.percentage && certificate.percentage > 100) {
      return {
        type: 'INVALID_PERCENTAGE',
        severity: 'HIGH',
        description: `Percentage exceeds 100%: ${certificate.percentage}%`,
        confidence: 95
      };
    }

    // Check for grade-percentage inconsistency
    if (certificate.cgpa && certificate.percentage) {
      const expectedPercentage = certificate.cgpa * 9.5; // Rough conversion
      const difference = Math.abs(certificate.percentage - expectedPercentage);
      
      if (difference > 20) {
        return {
          type: 'GRADE_PERCENTAGE_MISMATCH',
          severity: 'MEDIUM',
          description: `CGPA and percentage values are inconsistent`,
          confidence: 80
        };
      }
    }

    return null;
  }

  /**
   * Validate certificate number format
   */
  validateCertificateNumber(certificate) {
    if (!certificate.certificateNumber) {
      return {
        type: 'MISSING_CERTIFICATE_NUMBER',
        severity: 'HIGH',
        description: 'Certificate number is missing',
        confidence: 90
      };
    }

    // Check for suspicious patterns
    const certNum = certificate.certificateNumber;
    
    // All same digits
    if (/^(.)\1+$/.test(certNum)) {
      return {
        type: 'SUSPICIOUS_CERTIFICATE_NUMBER',
        severity: 'HIGH',
        description: 'Certificate number contains repeating pattern',
        confidence: 85
      };
    }

    // Sequential numbers
    if (this.isSequential(certNum)) {
      return {
        type: 'SEQUENTIAL_CERTIFICATE_NUMBER',
        severity: 'MEDIUM',
        description: 'Certificate number appears to be sequential',
        confidence: 70
      };
    }

    return null;
  }

  /**
   * Check if string contains sequential numbers
   */
  isSequential(str) {
    const numbers = str.replace(/\D/g, '');
    if (numbers.length < 3) return false;
    
    for (let i = 0; i < numbers.length - 2; i++) {
      const a = parseInt(numbers[i]);
      const b = parseInt(numbers[i + 1]);
      const c = parseInt(numbers[i + 2]);
      
      if (b === a + 1 && c === b + 1) return true;
      if (b === a - 1 && c === b - 1) return true;
    }
    
    return false;
  }

  /**
   * Detect suspicious patterns in certificate data
   */
  detectSuspiciousPatterns(certificate) {
    const anomalies = [];

    // Check for missing critical fields
    const criticalFields = ['studentName', 'course', 'passingYear'];
    const missingFields = criticalFields.filter(field => !certificate[field]);
    
    if (missingFields.length > 0) {
      anomalies.push({
        type: 'MISSING_CRITICAL_FIELDS',
        severity: 'HIGH',
        description: `Missing critical fields: ${missingFields.join(', ')}`,
        confidence: 90
      });
    }

    // Check for suspicious characters in names
    if (certificate.studentName && /[0-9@#$%^&*()_+=\[\]{}|\\:";'<>?,./]/.test(certificate.studentName)) {
      anomalies.push({
        type: 'SUSPICIOUS_CHARACTERS_IN_NAME',
        severity: 'MEDIUM',
        description: 'Student name contains suspicious characters',
        confidence: 75
      });
    }

    return anomalies;
  }

  /**
   * Validate dates for consistency
   */
  validateDates(certificate) {
    const issueDate = new Date(certificate.dateOfIssue);
    const completionDate = certificate.dateOfCompletion ? new Date(certificate.dateOfCompletion) : null;
    const currentDate = new Date();

    // Check if issue date is in the future
    if (issueDate > currentDate) {
      return {
        type: 'FUTURE_ISSUE_DATE',
        severity: 'HIGH',
        description: 'Certificate issue date is in the future',
        confidence: 95
      };
    }

    // Check if completion date is after issue date
    if (completionDate && completionDate > issueDate) {
      return {
        type: 'COMPLETION_AFTER_ISSUE',
        severity: 'MEDIUM',
        description: 'Completion date is after issue date',
        confidence: 80
      };
    }

    return null;
  }

  /**
   * Store detected anomalies in database
   */
  async storeAnomalies(certificateId, anomalies) {
    try {
      const prisma = getPrismaClient();
      
      for (const anomaly of anomalies) {
        await prisma.anomaly.create({
          data: {
            certificateId,
            type: anomaly.type,
            severity: anomaly.severity,
            description: anomaly.description,
            detectionMethod: 'AI',
            confidence: anomaly.confidence / 100,
            metadata: anomaly.metadata || {}
          }
        });
      }
    } catch (error) {
      logger.error('Error storing anomalies:', error);
    }
  }

  /**
   * Calculate overall confidence score
   */
  calculateConfidenceScore(checks) {
    const weights = {
      databaseMatch: 0.4,
      blockchainValidation: 0.2,
      anomalyDetection: 0.2,
      institutionValidation: 0.1,
      duplicateCheck: 0.1
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const [checkName, check] of Object.entries(checks)) {
      if (weights[checkName]) {
        totalScore += check.confidence * weights[checkName];
        totalWeight += weights[checkName];
      }
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Get flagged reasons from checks
   */
  getFlaggedReasons(checks) {
    const reasons = [];

    for (const [checkName, check] of Object.entries(checks)) {
      if (!check.passed) {
        reasons.push(`${checkName}: ${check.message}`);
      }
    }

    return reasons;
  }

  /**
   * Generate verification notes
   */
  generateVerificationNotes(checks) {
    const notes = [];

    for (const [checkName, check] of Object.entries(checks)) {
      notes.push(`${checkName}: ${check.message} (Confidence: ${check.confidence}%)`);
    }

    return notes.join('\n');
  }
}

module.exports = new VerificationService();
