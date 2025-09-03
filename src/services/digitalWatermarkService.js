const crypto = require('crypto');
const sharp = require('sharp');
const { logger } = require('../utils/logger');
const blockchainService = require('./blockchainService');

class DigitalWatermarkService {
  constructor() {
    this.watermarkKey = process.env.ENCRYPTION_KEY || 'default-watermark-key-32-chars';
    this.algorithm = 'aes-256-cbc';
  }

  /**
   * Generate digital watermark for certificate
   */
  async generateWatermark(certificateData) {
    try {
      const watermarkData = {
        certificateId: certificateData.id,
        certificateNumber: certificateData.certificateNumber,
        studentName: certificateData.studentName,
        institutionId: certificateData.institutionId,
        blockchainHash: certificateData.blockchainHash,
        timestamp: Date.now(),
        version: '1.0'
      };

      // Create encrypted watermark
      const watermarkString = JSON.stringify(watermarkData);
      const cipher = crypto.createCipher(this.algorithm, this.watermarkKey);
      let encrypted = cipher.update(watermarkString, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Generate checksum for integrity verification
      const checksum = crypto
        .createHash('sha256')
        .update(watermarkString)
        .digest('hex');

      return {
        watermark: encrypted,
        checksum,
        metadata: {
          algorithm: this.algorithm,
          version: '1.0',
          created: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Watermark generation error:', error);
      throw new Error('Failed to generate digital watermark');
    }
  }

  /**
   * Verify digital watermark integrity
   */
  async verifyWatermark(watermark, checksum, certificateData) {
    try {
      // Decrypt watermark
      const decipher = crypto.createDecipher(this.algorithm, this.watermarkKey);
      let decrypted = decipher.update(watermark, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const watermarkData = JSON.parse(decrypted);

      // Verify checksum
      const expectedChecksum = crypto
        .createHash('sha256')
        .update(decrypted)
        .digest('hex');

      if (checksum !== expectedChecksum) {
        return {
          isValid: false,
          reason: 'Watermark checksum mismatch - possible tampering detected'
        };
      }

      // Verify certificate data matches watermark
      const dataMatches = 
        watermarkData.certificateId === certificateData.id &&
        watermarkData.certificateNumber === certificateData.certificateNumber &&
        watermarkData.studentName === certificateData.studentName &&
        watermarkData.institutionId === certificateData.institutionId;

      if (!dataMatches) {
        return {
          isValid: false,
          reason: 'Certificate data does not match watermark - possible forgery'
        };
      }

      // Verify blockchain hash if present
      if (watermarkData.blockchainHash && certificateData.blockchainHash) {
        if (watermarkData.blockchainHash !== certificateData.blockchainHash) {
          return {
            isValid: false,
            reason: 'Blockchain hash mismatch in watermark'
          };
        }
      }

      return {
        isValid: true,
        watermarkData,
        verifiedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Watermark verification error:', error);
      return {
        isValid: false,
        reason: 'Failed to verify watermark - invalid format or corruption'
      };
    }
  }

  /**
   * Embed invisible watermark in certificate image
   */
  async embedImageWatermark(imagePath, watermarkData) {
    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      
      // Create watermark text overlay
      const watermarkText = this.createWatermarkText(watermarkData);
      
      // Create semi-transparent watermark overlay
      const watermarkBuffer = Buffer.from(
        `<svg width="${metadata.width}" height="${metadata.height}">
          <defs>
            <pattern id="watermark" patternUnits="userSpaceOnUse" width="200" height="200" patternTransform="rotate(45)">
              <text x="10" y="20" font-family="Arial" font-size="8" fill="rgba(0,0,0,0.1)" opacity="0.3">
                ${watermarkText}
              </text>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#watermark)"/>
        </svg>`
      );

      const outputPath = imagePath.replace(/\.[^/.]+$/, '_watermarked.png');
      
      await image
        .composite([{ input: watermarkBuffer, blend: 'overlay' }])
        .png({ quality: 95 })
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      logger.error('Image watermark embedding error:', error);
      throw new Error('Failed to embed image watermark');
    }
  }

  /**
   * Create watermark text from certificate data
   */
  createWatermarkText(watermarkData) {
    const shortHash = watermarkData.checksum.substring(0, 8);
    const timestamp = new Date(watermarkData.metadata.created).toISOString().substring(0, 10);
    return `VERIFIED-${shortHash}-${timestamp}`;
  }

  /**
   * Generate tamper-evident seal
   */
  async generateTamperSeal(certificateData) {
    try {
      const sealData = {
        certificateId: certificateData.id,
        hash: blockchainService.generateCertificateHash(certificateData),
        timestamp: Date.now(),
        authority: 'Government of Jharkhand - Higher Education Department'
      };

      // Create cryptographic seal
      const sealString = JSON.stringify(sealData);
      const seal = crypto
        .createHmac('sha256', this.watermarkKey)
        .update(sealString)
        .digest('hex');

      // Generate QR code for the seal
      const qrData = {
        type: 'TAMPER_SEAL',
        seal,
        certificateId: certificateData.id,
        verifyUrl: `${process.env.FRONTEND_URL}/verify-seal/${seal}`
      };

      const QRCode = require('qrcode');
      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        errorCorrectionLevel: 'H',
        width: 200,
        margin: 2
      });

      return {
        seal,
        sealData,
        qrCode: qrCodeDataURL,
        verificationUrl: qrData.verifyUrl
      };
    } catch (error) {
      logger.error('Tamper seal generation error:', error);
      throw new Error('Failed to generate tamper-evident seal');
    }
  }

  /**
   * Verify tamper-evident seal
   */
  async verifyTamperSeal(seal, certificateData) {
    try {
      // Reconstruct seal data
      const sealData = {
        certificateId: certificateData.id,
        hash: blockchainService.generateCertificateHash(certificateData),
        timestamp: certificateData.createdAt ? new Date(certificateData.createdAt).getTime() : Date.now(),
        authority: 'Government of Jharkhand - Higher Education Department'
      };

      // Generate expected seal
      const sealString = JSON.stringify(sealData);
      const expectedSeal = crypto
        .createHmac('sha256', this.watermarkKey)
        .update(sealString)
        .digest('hex');

      const isValid = seal === expectedSeal;

      return {
        isValid,
        sealData: isValid ? sealData : null,
        verifiedAt: new Date().toISOString(),
        reason: isValid ? 'Seal verified successfully' : 'Seal verification failed - possible tampering'
      };
    } catch (error) {
      logger.error('Tamper seal verification error:', error);
      return {
        isValid: false,
        reason: 'Failed to verify tamper seal'
      };
    }
  }

  /**
   * Detect image tampering using statistical analysis
   */
  async detectImageTampering(imagePath) {
    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const stats = await image.stats();
      
      const tamperingIndicators = [];

      // Check for unusual compression artifacts
      if (metadata.format === 'jpeg' && metadata.density && metadata.density < 72) {
        tamperingIndicators.push({
          type: 'LOW_RESOLUTION',
          severity: 'MEDIUM',
          description: 'Image has unusually low resolution which may indicate tampering',
          confidence: 70
        });
      }

      // Check for inconsistent lighting/shadows
      const channels = stats.channels;
      if (channels && channels.length >= 3) {
        const variance = this.calculateChannelVariance(channels);
        
        if (variance > 1000) {
          tamperingIndicators.push({
            type: 'INCONSISTENT_LIGHTING',
            severity: 'LOW',
            description: 'Detected inconsistent lighting patterns',
            confidence: 60
          });
        }
      }

      // Check for copy-paste artifacts (simplified detection)
      const { width, height } = metadata;
      if (width && height) {
        const aspectRatio = width / height;
        if (aspectRatio < 0.5 || aspectRatio > 3) {
          tamperingIndicators.push({
            type: 'UNUSUAL_ASPECT_RATIO',
            severity: 'LOW',
            description: 'Unusual aspect ratio may indicate cropping or manipulation',
            confidence: 40
          });
        }
      }

      return {
        tamperingDetected: tamperingIndicators.length > 0,
        indicators: tamperingIndicators,
        overallRisk: this.calculateTamperingRisk(tamperingIndicators),
        analysisTimestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Image tampering detection error:', error);
      return {
        tamperingDetected: false,
        indicators: [],
        overallRisk: 'UNKNOWN',
        error: error.message
      };
    }
  }

  /**
   * Calculate channel variance for tampering detection
   */
  calculateChannelVariance(channels) {
    const means = channels.map(channel => channel.mean);
    const avgMean = means.reduce((sum, mean) => sum + mean, 0) / means.length;
    const variance = means.reduce((sum, mean) => sum + Math.pow(mean - avgMean, 2), 0) / means.length;
    return variance;
  }

  /**
   * Calculate overall tampering risk level
   */
  calculateTamperingRisk(indicators) {
    if (indicators.length === 0) return 'LOW';
    
    const highSeverityCount = indicators.filter(i => i.severity === 'HIGH').length;
    const mediumSeverityCount = indicators.filter(i => i.severity === 'MEDIUM').length;
    
    if (highSeverityCount > 0) return 'HIGH';
    if (mediumSeverityCount > 1) return 'MEDIUM';
    if (indicators.length > 2) return 'MEDIUM';
    
    return 'LOW';
  }

  /**
   * Generate comprehensive certificate security report
   */
  async generateSecurityReport(certificateData, imagePath = null) {
    try {
      const report = {
        certificateId: certificateData.id,
        certificateNumber: certificateData.certificateNumber,
        analysisTimestamp: new Date().toISOString(),
        securityFeatures: {}
      };

      // Check digital watermark
      if (certificateData.digitalSignature) {
        const watermarkResult = await this.verifyWatermark(
          certificateData.digitalSignature,
          certificateData.fileHash,
          certificateData
        );
        report.securityFeatures.digitalWatermark = watermarkResult;
      }

      // Check blockchain validation
      if (certificateData.blockchainHash) {
        const blockchainResult = await blockchainService.validateCertificate(certificateData.blockchainHash);
        report.securityFeatures.blockchain = blockchainResult;
      }

      // Check image tampering if image provided
      if (imagePath) {
        const tamperingResult = await this.detectImageTampering(imagePath);
        report.securityFeatures.imageTampering = tamperingResult;
      }

      // Generate overall security score
      report.securityScore = this.calculateSecurityScore(report.securityFeatures);
      report.securityLevel = this.getSecurityLevel(report.securityScore);

      return report;
    } catch (error) {
      logger.error('Security report generation error:', error);
      throw new Error('Failed to generate security report');
    }
  }

  /**
   * Calculate overall security score
   */
  calculateSecurityScore(securityFeatures) {
    let score = 0;
    let maxScore = 0;

    // Digital watermark (30 points)
    maxScore += 30;
    if (securityFeatures.digitalWatermark?.isValid) {
      score += 30;
    }

    // Blockchain validation (40 points)
    maxScore += 40;
    if (securityFeatures.blockchain?.isValid) {
      score += 40;
    }

    // Image tampering (30 points)
    maxScore += 30;
    if (securityFeatures.imageTampering) {
      const risk = securityFeatures.imageTampering.overallRisk;
      if (risk === 'LOW') score += 30;
      else if (risk === 'MEDIUM') score += 15;
      // HIGH risk = 0 points
    }

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  /**
   * Get security level based on score
   */
  getSecurityLevel(score) {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 75) return 'GOOD';
    if (score >= 60) return 'FAIR';
    if (score >= 40) return 'POOR';
    return 'CRITICAL';
  }
}

module.exports = new DigitalWatermarkService();
