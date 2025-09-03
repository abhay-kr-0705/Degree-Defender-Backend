const { getPrismaClient } = require('../config/database');
const { logger } = require('../utils/logger');
const crypto = require('crypto');

class AnomalyDetectionService {
  constructor() {
    this.patterns = {
      suspiciousGrades: /A\+{2,}|O{3,}|100{2,}/i,
      sequentialNumbers: /123456|654321|111111|000000/,
      commonFakeNames: /test|sample|dummy|fake|john doe|jane doe/i,
      invalidChars: /[^\w\s\.\-\/\(\)]/,
      duplicateSpaces: /\s{3,}/,
      inconsistentCasing: /[a-z][A-Z][a-z]/
    };
    
    this.thresholds = {
      highRisk: 85,
      mediumRisk: 60,
      lowRisk: 30
    };
  }

  async detectAllAnomalies(certificate, ocrResult) {
    const anomalies = [];
    
    try {
      // Grade tampering detection
      const gradeAnomalies = await this.detectGradeTampering(certificate);
      anomalies.push(...gradeAnomalies);

      // Seal and signature analysis
      const sealAnomalies = await this.detectForgedSeals(certificate, ocrResult);
      anomalies.push(...sealAnomalies);

      // Pattern analysis
      const patternAnomalies = this.detectSuspiciousPatterns(certificate);
      anomalies.push(...patternAnomalies);

      // Statistical analysis
      const statAnomalies = await this.performStatisticalAnalysis(certificate);
      anomalies.push(...statAnomalies);

      // Cross-reference checks
      const crossRefAnomalies = await this.crossReferenceValidation(certificate);
      anomalies.push(...crossRefAnomalies);

      return this.prioritizeAnomalies(anomalies);
    } catch (error) {
      logger.error('Anomaly detection error:', error);
      return [];
    }
  }

  async detectGradeTampering(certificate) {
    const anomalies = [];

    // Check for impossible grades
    if (certificate.cgpa > 10 || certificate.percentage > 100) {
      anomalies.push({
        type: 'IMPOSSIBLE_GRADE',
        severity: 'CRITICAL',
        confidence: 95,
        description: `Grade exceeds maximum possible value: CGPA ${certificate.cgpa}, Percentage ${certificate.percentage}%`,
        riskScore: 95
      });
    }

    // Grade consistency check
    if (certificate.cgpa && certificate.percentage) {
      const expectedPercentage = certificate.cgpa * 9.5;
      const variance = Math.abs(certificate.percentage - expectedPercentage);
      
      if (variance > 25) {
        anomalies.push({
          type: 'GRADE_INCONSISTENCY',
          severity: 'HIGH',
          confidence: 80,
          description: `CGPA (${certificate.cgpa}) and percentage (${certificate.percentage}%) are inconsistent`,
          riskScore: 75
        });
      }
    }

    // Suspicious grade patterns
    const gradeStr = `${certificate.grade || ''} ${certificate.cgpa || ''} ${certificate.percentage || ''}`;
    if (this.patterns.suspiciousGrades.test(gradeStr)) {
      anomalies.push({
        type: 'SUSPICIOUS_GRADE_PATTERN',
        severity: 'MEDIUM',
        confidence: 70,
        description: 'Grade contains suspicious patterns',
        riskScore: 60
      });
    }

    return anomalies;
  }

  async detectForgedSeals(certificate, ocrResult) {
    const anomalies = [];

    // Check OCR confidence for seal areas
    if (ocrResult.confidence < 50) {
      anomalies.push({
        type: 'LOW_SEAL_QUALITY',
        severity: 'MEDIUM',
        confidence: 65,
        description: 'Poor image quality in seal/signature areas',
        riskScore: 55
      });
    }

    // Look for common forgery indicators in text
    const text = ocrResult.text.toLowerCase();
    const forgeryIndicators = [
      'copy', 'duplicate', 'photocopy', 'scan', 'digital copy',
      'not original', 'reproduction'
    ];

    for (const indicator of forgeryIndicators) {
      if (text.includes(indicator)) {
        anomalies.push({
          type: 'FORGERY_INDICATOR',
          severity: 'HIGH',
          confidence: 80,
          description: `Document contains forgery indicator: "${indicator}"`,
          riskScore: 75
        });
      }
    }

    return anomalies;
  }

  detectSuspiciousPatterns(certificate) {
    const anomalies = [];

    // Sequential number detection
    const certNum = certificate.certificateNumber || '';
    if (this.patterns.sequentialNumbers.test(certNum)) {
      anomalies.push({
        type: 'SEQUENTIAL_CERTIFICATE_NUMBER',
        severity: 'HIGH',
        confidence: 85,
        description: 'Certificate number contains sequential or repeated digits',
        riskScore: 70
      });
    }

    // Fake name detection
    const studentName = certificate.studentName || '';
    if (this.patterns.commonFakeNames.test(studentName)) {
      anomalies.push({
        type: 'SUSPICIOUS_NAME',
        severity: 'HIGH',
        confidence: 90,
        description: 'Student name appears to be fake or test data',
        riskScore: 85
      });
    }

    // Invalid characters
    if (this.patterns.invalidChars.test(studentName)) {
      anomalies.push({
        type: 'INVALID_CHARACTERS',
        severity: 'MEDIUM',
        confidence: 75,
        description: 'Name contains invalid or suspicious characters',
        riskScore: 60
      });
    }

    return anomalies;
  }

  async performStatisticalAnalysis(certificate) {
    const anomalies = [];
    const prisma = getPrismaClient();

    try {
      // Compare with institutional averages
      const institutionStats = await prisma.certificate.aggregate({
        where: {
          institutionId: certificate.institutionId,
          course: certificate.course,
          status: 'VERIFIED'
        },
        _avg: {
          cgpa: true,
          percentage: true
        },
        _count: {
          id: true
        }
      });

      if (institutionStats._count.id > 10) {
        const avgCgpa = institutionStats._avg.cgpa;
        const avgPercentage = institutionStats._avg.percentage;

        // Check for statistical outliers
        if (certificate.cgpa && avgCgpa) {
          const cgpaDeviation = Math.abs(certificate.cgpa - avgCgpa);
          if (cgpaDeviation > 2.0) {
            anomalies.push({
              type: 'STATISTICAL_OUTLIER_CGPA',
              severity: 'MEDIUM',
              confidence: 70,
              description: `CGPA significantly deviates from institutional average (${avgCgpa.toFixed(2)})`,
              riskScore: 50
            });
          }
        }
      }

      // Check passing year trends
      const currentYear = new Date().getFullYear();
      if (certificate.passingYear > currentYear) {
        anomalies.push({
          type: 'FUTURE_PASSING_YEAR',
          severity: 'CRITICAL',
          confidence: 100,
          description: 'Passing year is in the future',
          riskScore: 100
        });
      }

    } catch (error) {
      logger.error('Statistical analysis error:', error);
    }

    return anomalies;
  }

  async crossReferenceValidation(certificate) {
    const anomalies = [];
    const prisma = getPrismaClient();

    try {
      // Check for duplicate certificates
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
                    { passingYear: certificate.passingYear }
                  ]
                }
              ]
            }
          ]
        }
      });

      if (duplicates.length > 0) {
        anomalies.push({
          type: 'DUPLICATE_CERTIFICATE',
          severity: 'CRITICAL',
          confidence: 95,
          description: `Found ${duplicates.length} potential duplicate certificate(s)`,
          riskScore: 90
        });
      }

      // Check blacklisted entities
      const blacklisted = await prisma.blacklistedEntity.findFirst({
        where: {
          OR: [
            { 
              type: 'CERTIFICATE',
              identifier: certificate.certificateNumber,
              isActive: true
            },
            {
              type: 'STUDENT',
              identifier: certificate.studentName,
              isActive: true
            }
          ]
        }
      });

      if (blacklisted) {
        anomalies.push({
          type: 'BLACKLISTED_ENTITY',
          severity: 'CRITICAL',
          confidence: 100,
          description: `Certificate or student is blacklisted: ${blacklisted.reason}`,
          riskScore: 100
        });
      }

    } catch (error) {
      logger.error('Cross-reference validation error:', error);
    }

    return anomalies;
  }

  prioritizeAnomalies(anomalies) {
    return anomalies
      .sort((a, b) => b.riskScore - a.riskScore)
      .map((anomaly, index) => ({
        ...anomaly,
        priority: index + 1,
        detectionMethod: 'AI_ML',
        timestamp: new Date()
      }));
  }

  calculateOverallRiskScore(anomalies) {
    if (anomalies.length === 0) return 0;

    const totalRisk = anomalies.reduce((sum, anomaly) => sum + anomaly.riskScore, 0);
    const maxPossibleRisk = anomalies.length * 100;
    
    return Math.min(100, Math.round((totalRisk / maxPossibleRisk) * 100));
  }

  getRiskLevel(riskScore) {
    if (riskScore >= this.thresholds.highRisk) return 'HIGH';
    if (riskScore >= this.thresholds.mediumRisk) return 'MEDIUM';
    if (riskScore >= this.thresholds.lowRisk) return 'LOW';
    return 'MINIMAL';
  }

  async storeAnomalies(certificateId, anomalies) {
    const prisma = getPrismaClient();
    
    try {
      for (const anomaly of anomalies) {
        await prisma.anomaly.create({
          data: {
            certificateId,
            type: anomaly.type,
            severity: anomaly.severity,
            description: anomaly.description,
            detectionMethod: anomaly.detectionMethod,
            confidence: anomaly.confidence / 100,
            metadata: {
              riskScore: anomaly.riskScore,
              priority: anomaly.priority,
              timestamp: anomaly.timestamp
            }
          }
        });
      }
    } catch (error) {
      logger.error('Error storing anomalies:', error);
    }
  }
}

module.exports = new AnomalyDetectionService();
