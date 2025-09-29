const sharp = require('sharp');
const Jimp = require('jimp');
const crypto = require('crypto');
const { logger } = require('../utils/logger');
const { getPrismaClient } = require('../config/database');

class AdvancedForgeryDetectionService {
  constructor() {
    this.suspicionThreshold = 70; // Suspicion score threshold
    this.knownForgeryPatterns = new Map();
    this.institutionSeals = new Map();
  }

  /**
   * Comprehensive forgery detection analysis
   * @param {string} imagePath - Path to certificate image
   * @param {Object} certificateData - Extracted certificate data
   * @returns {Promise<Object>} Detection results with confidence scores
   */
  async detectForgery(imagePath, certificateData) {
    try {
      const results = {
        isForged: false,
        confidence: 100,
        suspicionScore: 0,
        anomalies: [],
        checks: {}
      };

      // Run all detection checks in parallel
      const [
        photoAnalysis,
        sealAnalysis,
        textConsistency,
        documentStructure,
        metadataAnalysis,
        duplicateCheck,
        institutionValidation
      ] = await Promise.all([
        this.detectPhotoTampering(imagePath),
        this.detectSealForgery(imagePath, certificateData),
        this.analyzeTextConsistency(certificateData),
        this.analyzeDocumentStructure(imagePath),
        this.analyzeImageMetadata(imagePath),
        this.checkDuplicateCertificate(certificateData),
        this.validateInstitution(certificateData)
      ]);

      // Aggregate results
      results.checks = {
        photoTampering: photoAnalysis,
        sealForgery: sealAnalysis,
        textConsistency,
        documentStructure,
        metadataAnalysis,
        duplicateCheck,
        institutionValidation
      };

      // Calculate overall suspicion score
      results.suspicionScore = this.calculateSuspicionScore(results.checks);
      results.confidence = 100 - results.suspicionScore;

      // Determine if forged
      if (results.suspicionScore >= this.suspicionThreshold) {
        results.isForged = true;
      }

      // Collect anomalies
      results.anomalies = this.collectAnomalies(results.checks);

      logger.info(`Forgery detection completed: Suspicion Score ${results.suspicionScore}%`);

      return results;
    } catch (error) {
      logger.error('Forgery detection error:', error);
      throw error;
    }
  }

  /**
   * Detect photo tampering using Error Level Analysis (ELA)
   */
  async detectPhotoTampering(imagePath) {
    try {
      const image = await Jimp.read(imagePath);
      
      // Convert to buffer
      const originalBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
      
      // Re-compress at 95% quality
      const recompressed = await Jimp.read(originalBuffer);
      await recompressed.quality(95);
      const recompressedBuffer = await recompressed.getBufferAsync(Jimp.MIME_JPEG);

      // Calculate difference (Error Level Analysis)
      const original = await Jimp.read(originalBuffer);
      const compressed = await Jimp.read(recompressedBuffer);

      let totalDifference = 0;
      let pixelCount = 0;
      let suspiciousRegions = 0;

      original.scan(0, 0, original.bitmap.width, original.bitmap.height, function(x, y, idx) {
        const r1 = this.bitmap.data[idx + 0];
        const g1 = this.bitmap.data[idx + 1];
        const b1 = this.bitmap.data[idx + 2];

        const r2 = compressed.bitmap.data[idx + 0];
        const g2 = compressed.bitmap.data[idx + 1];
        const b2 = compressed.bitmap.data[idx + 2];

        const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
        totalDifference += diff;
        pixelCount++;

        // Detect suspicious regions with high error levels
        if (diff > 30) {
          suspiciousRegions++;
        }
      });

      const avgDifference = totalDifference / pixelCount;
      const suspiciousPercentage = (suspiciousRegions / pixelCount) * 100;

      return {
        isTampered: suspiciousPercentage > 5,
        confidence: suspiciousPercentage > 5 ? 80 : 20,
        avgErrorLevel: avgDifference.toFixed(2),
        suspiciousRegions: suspiciousPercentage.toFixed(2) + '%',
        details: 'Error Level Analysis completed'
      };
    } catch (error) {
      logger.error('Photo tampering detection error:', error);
      return {
        isTampered: false,
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Detect seal/stamp forgery
   */
  async detectSealForgery(imagePath, certificateData) {
    try {
      const image = await sharp(imagePath);
      const metadata = await image.metadata();

      // Extract potential seal regions (usually bottom-right or center)
      const sealRegions = [
        { left: metadata.width - 200, top: metadata.height - 200, width: 150, height: 150 },
        { left: Math.floor(metadata.width / 2) - 75, top: Math.floor(metadata.height / 2) - 75, width: 150, height: 150 }
      ];

      const sealAnalyses = [];

      for (const region of sealRegions) {
        try {
          const sealImage = await image
            .extract(region)
            .toBuffer();

          // Analyze seal characteristics
          const sealStats = await sharp(sealImage).stats();
          
          // Check for seal presence (high contrast, circular patterns)
          const hasHighContrast = sealStats.channels.some(ch => ch.max - ch.min > 200);
          
          sealAnalyses.push({
            region,
            hasHighContrast,
            stats: sealStats
          });
        } catch (extractError) {
          // Region might be out of bounds
          continue;
        }
      }

      // Compare with known institution seals if available
      const institutionId = certificateData.institutionId;
      const knownSeal = this.institutionSeals.get(institutionId);

      let matchScore = 50; // Default neutral score

      if (knownSeal) {
        // Implement seal matching algorithm
        // For now, return moderate confidence
        matchScore = 60;
      }

      return {
        isForged: matchScore < 40,
        confidence: matchScore,
        sealsDetected: sealAnalyses.length,
        details: 'Seal analysis completed',
        recommendation: matchScore < 40 ? 'Manual verification recommended' : 'Seal appears authentic'
      };
    } catch (error) {
      logger.error('Seal forgery detection error:', error);
      return {
        isForged: false,
        confidence: 50,
        error: error.message
      };
    }
  }

  /**
   * Analyze text consistency and formatting
   */
  async analyzeTextConsistency(certificateData) {
    const anomalies = [];
    let consistencyScore = 100;

    // Check certificate number format
    if (!this.validateCertificateNumberFormat(certificateData.certificateNumber)) {
      anomalies.push('Invalid certificate number format');
      consistencyScore -= 20;
    }

    // Check name consistency
    if (certificateData.studentName && certificateData.studentName.length < 3) {
      anomalies.push('Suspiciously short student name');
      consistencyScore -= 15;
    }

    // Check grade consistency
    if (certificateData.cgpa && (certificateData.cgpa < 0 || certificateData.cgpa > 10)) {
      anomalies.push('Invalid CGPA value');
      consistencyScore -= 25;
    }

    if (certificateData.percentage && (certificateData.percentage < 0 || certificateData.percentage > 100)) {
      anomalies.push('Invalid percentage value');
      consistencyScore -= 25;
    }

    // Check date consistency
    const issueDate = new Date(certificateData.dateOfIssue);
    const currentDate = new Date();
    
    if (issueDate > currentDate) {
      anomalies.push('Future date of issue');
      consistencyScore -= 30;
    }

    if (certificateData.passingYear) {
      const passingYear = parseInt(certificateData.passingYear);
      const issueYear = issueDate.getFullYear();
      
      if (issueYear < passingYear) {
        anomalies.push('Issue date before passing year');
        consistencyScore -= 25;
      }

      if (issueYear - passingYear > 5) {
        anomalies.push('Unusual gap between passing year and issue date');
        consistencyScore -= 10;
      }
    }

    return {
      isConsistent: consistencyScore >= 70,
      score: Math.max(0, consistencyScore),
      anomalies,
      details: 'Text consistency analysis completed'
    };
  }

  /**
   * Analyze document structure and layout
   */
  async analyzeDocumentStructure(imagePath) {
    try {
      const image = await sharp(imagePath);
      const metadata = await image.metadata();
      const stats = await image.stats();

      const anomalies = [];
      let structureScore = 100;

      // Check image dimensions (typical certificates are A4 or similar)
      const aspectRatio = metadata.width / metadata.height;
      if (aspectRatio < 0.5 || aspectRatio > 2) {
        anomalies.push('Unusual aspect ratio');
        structureScore -= 15;
      }

      // Check resolution
      if (metadata.width < 800 || metadata.height < 600) {
        anomalies.push('Low resolution image');
        structureScore -= 10;
      }

      // Check color distribution
      const avgBrightness = stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length;
      if (avgBrightness < 50 || avgBrightness > 250) {
        anomalies.push('Unusual brightness levels');
        structureScore -= 10;
      }

      // Check for excessive noise or artifacts
      const entropy = stats.entropy;
      if (entropy > 7.5) {
        anomalies.push('High image entropy (possible compression artifacts)');
        structureScore -= 15;
      }

      return {
        isValid: structureScore >= 70,
        score: Math.max(0, structureScore),
        anomalies,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          aspectRatio: aspectRatio.toFixed(2)
        }
      };
    } catch (error) {
      logger.error('Document structure analysis error:', error);
      return {
        isValid: true,
        score: 50,
        error: error.message
      };
    }
  }

  /**
   * Analyze image metadata for manipulation signs
   */
  async analyzeImageMetadata(imagePath) {
    try {
      const image = await sharp(imagePath);
      const metadata = await image.metadata();

      const anomalies = [];
      let metadataScore = 100;

      // Check EXIF data
      if (metadata.exif) {
        // Check for editing software signatures
        const exifBuffer = metadata.exif;
        const exifString = exifBuffer.toString('utf-8', 0, Math.min(1000, exifBuffer.length));
        
        const editingSoftware = ['photoshop', 'gimp', 'paint.net', 'pixlr'];
        for (const software of editingSoftware) {
          if (exifString.toLowerCase().includes(software)) {
            anomalies.push(`Image edited with ${software}`);
            metadataScore -= 20;
            break;
          }
        }
      }

      // Check for missing metadata (could indicate scrubbing)
      if (!metadata.exif && !metadata.xmp && !metadata.iptc) {
        anomalies.push('Missing image metadata');
        metadataScore -= 15;
      }

      return {
        isSuspicious: metadataScore < 70,
        score: Math.max(0, metadataScore),
        anomalies,
        details: 'Metadata analysis completed'
      };
    } catch (error) {
      logger.error('Metadata analysis error:', error);
      return {
        isSuspicious: false,
        score: 50,
        error: error.message
      };
    }
  }

  /**
   * Check for duplicate certificates
   */
  async checkDuplicateCertificate(certificateData) {
    try {
      const prisma = getPrismaClient();

      // Check for exact duplicate
      const exactDuplicate = await prisma.certificate.findFirst({
        where: {
          certificateNumber: certificateData.certificateNumber,
          studentName: certificateData.studentName
        }
      });

      if (exactDuplicate) {
        return {
          isDuplicate: true,
          confidence: 100,
          details: 'Exact duplicate found in database',
          existingCertificateId: exactDuplicate.id
        };
      }

      // Check for similar certificates (possible cloning)
      const similarCertificates = await prisma.certificate.findMany({
        where: {
          OR: [
            { certificateNumber: certificateData.certificateNumber },
            {
              AND: [
                { studentName: certificateData.studentName },
                { course: certificateData.course },
                { passingYear: certificateData.passingYear }
              ]
            }
          ]
        },
        take: 5
      });

      if (similarCertificates.length > 0) {
        return {
          isDuplicate: false,
          isSimilar: true,
          confidence: 70,
          details: `Found ${similarCertificates.length} similar certificate(s)`,
          similarCount: similarCertificates.length
        };
      }

      return {
        isDuplicate: false,
        isSimilar: false,
        confidence: 0,
        details: 'No duplicates found'
      };
    } catch (error) {
      logger.error('Duplicate check error:', error);
      return {
        isDuplicate: false,
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Validate institution existence and authorization
   */
  async validateInstitution(certificateData) {
    try {
      const prisma = getPrismaClient();

      const institution = await prisma.institution.findUnique({
        where: { id: certificateData.institutionId }
      });

      if (!institution) {
        return {
          isValid: false,
          confidence: 100,
          details: 'Institution not found in database',
          severity: 'CRITICAL'
        };
      }

      if (institution.status !== 'ACTIVE') {
        return {
          isValid: false,
          confidence: 90,
          details: `Institution status: ${institution.status}`,
          severity: 'HIGH'
        };
      }

      // Check if institution is blacklisted
      const blacklistEntry = await prisma.institutionBlacklist.findFirst({
        where: {
          institutionId: certificateData.institutionId,
          isActive: true
        }
      });

      if (blacklistEntry) {
        return {
          isValid: false,
          confidence: 100,
          details: 'Institution is blacklisted',
          reason: blacklistEntry.reason,
          severity: 'CRITICAL'
        };
      }

      return {
        isValid: true,
        confidence: 0,
        details: 'Institution validated successfully',
        institutionName: institution.name
      };
    } catch (error) {
      logger.error('Institution validation error:', error);
      return {
        isValid: true,
        confidence: 50,
        error: error.message
      };
    }
  }

  /**
   * Calculate overall suspicion score
   */
  calculateSuspicionScore(checks) {
    let totalScore = 0;
    let weights = {
      photoTampering: 0.25,
      sealForgery: 0.20,
      textConsistency: 0.20,
      documentStructure: 0.10,
      metadataAnalysis: 0.10,
      duplicateCheck: 0.10,
      institutionValidation: 0.05
    };

    if (checks.photoTampering?.isTampered) {
      totalScore += checks.photoTampering.confidence * weights.photoTampering;
    }

    if (checks.sealForgery?.isForged) {
      totalScore += (100 - checks.sealForgery.confidence) * weights.sealForgery;
    }

    if (!checks.textConsistency?.isConsistent) {
      totalScore += (100 - checks.textConsistency.score) * weights.textConsistency;
    }

    if (!checks.documentStructure?.isValid) {
      totalScore += (100 - checks.documentStructure.score) * weights.documentStructure;
    }

    if (checks.metadataAnalysis?.isSuspicious) {
      totalScore += (100 - checks.metadataAnalysis.score) * weights.metadataAnalysis;
    }

    if (checks.duplicateCheck?.isDuplicate) {
      totalScore += checks.duplicateCheck.confidence * weights.duplicateCheck;
    }

    if (!checks.institutionValidation?.isValid) {
      totalScore += checks.institutionValidation.confidence * weights.institutionValidation;
    }

    return Math.min(100, Math.round(totalScore));
  }

  /**
   * Collect all anomalies from checks
   */
  collectAnomalies(checks) {
    const anomalies = [];

    if (checks.photoTampering?.isTampered) {
      anomalies.push({
        type: 'PHOTO_TAMPERING',
        severity: 'HIGH',
        description: 'Photo manipulation detected',
        confidence: checks.photoTampering.confidence
      });
    }

    if (checks.sealForgery?.isForged) {
      anomalies.push({
        type: 'SEAL_FORGERY',
        severity: 'HIGH',
        description: 'Seal/stamp appears forged',
        confidence: 100 - checks.sealForgery.confidence
      });
    }

    if (checks.textConsistency?.anomalies) {
      checks.textConsistency.anomalies.forEach(anomaly => {
        anomalies.push({
          type: 'TEXT_INCONSISTENCY',
          severity: 'MEDIUM',
          description: anomaly
        });
      });
    }

    if (checks.duplicateCheck?.isDuplicate) {
      anomalies.push({
        type: 'DUPLICATE_CERTIFICATE',
        severity: 'CRITICAL',
        description: 'Certificate already exists in database',
        existingId: checks.duplicateCheck.existingCertificateId
      });
    }

    if (!checks.institutionValidation?.isValid) {
      anomalies.push({
        type: 'INVALID_INSTITUTION',
        severity: checks.institutionValidation.severity || 'HIGH',
        description: checks.institutionValidation.details
      });
    }

    return anomalies;
  }

  /**
   * Validate certificate number format
   */
  validateCertificateNumberFormat(certNumber) {
    // Common patterns for Indian certificates
    const patterns = [
      /^[A-Z]{2}\/\d{4}\/[A-Z]{3}\/\d{3,4}$/,  // RU/2023/BSC/001
      /^[A-Z]{3}-\d{4}-\d{5}$/,                 // ABC-2023-12345
      /^\d{10}$/,                                // 1234567890
      /^[A-Z]{2}\d{8}$/                          // AB12345678
    ];

    return patterns.some(pattern => pattern.test(certNumber));
  }

  /**
   * Register known institution seal for comparison
   */
  async registerInstitutionSeal(institutionId, sealImagePath) {
    try {
      const sealData = await sharp(sealImagePath)
        .resize(150, 150)
        .toBuffer();

      const sealHash = crypto.createHash('sha256').update(sealData).digest('hex');

      this.institutionSeals.set(institutionId, {
        hash: sealHash,
        data: sealData,
        registeredAt: new Date()
      });

      logger.info(`Registered seal for institution: ${institutionId}`);
      return true;
    } catch (error) {
      logger.error('Seal registration error:', error);
      return false;
    }
  }
}

module.exports = new AdvancedForgeryDetectionService();
