const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { getPrismaClient } = require('../config/database');
const { validateVerificationRequest, validateId } = require('../middleware/validation');
const ocrService = require('../services/ocrService');
const verificationService = require('../services/verificationService');
const blockchainService = require('../services/blockchainService');
const { logger, auditLogger } = require('../utils/logger');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for public verification endpoints
const verificationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    success: false,
    error: 'Too many verification requests, please try again later'
  }
});

// Configure multer for certificate uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'verification');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `verify-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png', 'tiff'];
    const fileExt = path.extname(file.originalname).toLowerCase().slice(1);
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
});

// @route   POST /api/verification/upload
// @desc    Upload and verify a certificate (Public endpoint)
// @access  Public (with rate limiting)
router.post('/upload',
  verificationRateLimit,
  upload.single('certificate'),
  validateVerificationRequest,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No certificate file uploaded'
        });
      }

      const { requestedBy, requestorEmail, requestorPhone, purpose } = req.body;
      const prisma = getPrismaClient();

      // Extract text using OCR
      logger.info(`Processing verification upload: ${req.file.filename}`);
      
      let ocrResult;
      if (req.file.mimetype === 'application/pdf') {
        ocrResult = await ocrService.extractTextFromPDF(req.file.path);
      } else {
        ocrResult = await ocrService.extractTextFromImage(req.file.path);
      }

      const extractedData = ocrService.extractCertificateData(ocrResult);
      const ocrValidation = ocrService.validateOCRResults(ocrResult, extractedData);

      // Search for matching certificate in database
      const matchingCertificate = await findMatchingCertificate(extractedData);

      let verificationResult = null;
      if (matchingCertificate) {
        // Perform comprehensive verification
        verificationResult = await verificationService.verifyCertificate(
          matchingCertificate,
          {
            requestedBy,
            requestorEmail,
            requestorPhone,
            purpose,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            institutionId: matchingCertificate.institutionId
          }
        );
      } else {
        // Certificate not found in database
        const verification = await prisma.verification.create({
          data: {
            requestedBy,
            requestorEmail,
            requestorPhone,
            purpose,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            status: 'FAILED',
            isValid: false,
            confidenceScore: 0,
            verificationNotes: 'Certificate not found in database',
            flaggedReasons: ['CERTIFICATE_NOT_FOUND'],
            verifiedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        });

        verificationResult = {
          verificationId: verification.id,
          verificationCode: verification.verificationCode,
          isValid: false,
          confidenceScore: 0,
          checks: {
            databaseMatch: {
              passed: false,
              confidence: 0,
              message: 'Certificate not found in database'
            }
          },
          flaggedReasons: ['CERTIFICATE_NOT_FOUND'],
          notes: 'Certificate not found in institutional database'
        };
      }

      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        logger.warn('File cleanup error:', cleanupError);
      }

      // Log verification attempt
      auditLogger.info('Public certificate verification', {
        verificationId: verificationResult.verificationId,
        requestedBy,
        requestorEmail,
        isValid: verificationResult.isValid,
        confidenceScore: verificationResult.confidenceScore,
        ip: req.ip,
        extractedData: extractedData
      });

      res.json({
        success: true,
        data: {
          verificationId: verificationResult.verificationId,
          verificationCode: verificationResult.verificationCode,
          isValid: verificationResult.isValid,
          confidenceScore: verificationResult.confidenceScore,
          status: verificationResult.isValid ? 'VERIFIED' : 'INVALID',
          message: verificationResult.isValid ? 
            'Certificate is authentic and verified' : 
            'Certificate could not be verified',
          extractedData,
          ocrValidation,
          checks: verificationResult.checks,
          flaggedReasons: verificationResult.flaggedReasons
        }
      });
    } catch (error) {
      logger.error('Verification upload error:', error);
      
      // Clean up uploaded file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          logger.error('File cleanup error:', cleanupError);
        }
      }

      res.status(500).json({
        success: false,
        error: 'Verification failed'
      });
    }
  }
);

// @route   POST /api/verification/quick
// @desc    Quick verification using certificate details (Public endpoint)
// @access  Public (with rate limiting)
router.post('/quick',
  verificationRateLimit,
  async (req, res) => {
    try {
      const { 
        certificateNumber, 
        studentName, 
        rollNumber, 
        course, 
        passingYear,
        institutionCode,
        requestedBy,
        requestorEmail,
        purpose 
      } = req.body;

      if (!certificateNumber && !studentName) {
        return res.status(400).json({
          success: false,
          error: 'Certificate number or student name is required'
        });
      }

      const prisma = getPrismaClient();

      // Search for certificate
      const whereClause = {
        AND: []
      };

      if (certificateNumber) {
        whereClause.AND.push({ certificateNumber });
      }

      if (studentName) {
        whereClause.AND.push({ 
          studentName: { contains: studentName, mode: 'insensitive' } 
        });
      }

      if (rollNumber) {
        whereClause.AND.push({ rollNumber });
      }

      if (course) {
        whereClause.AND.push({ 
          course: { contains: course, mode: 'insensitive' } 
        });
      }

      if (passingYear) {
        whereClause.AND.push({ passingYear: parseInt(passingYear) });
      }

      if (institutionCode) {
        whereClause.AND.push({
          institution: { code: institutionCode }
        });
      }

      const certificate = await prisma.certificate.findFirst({
        where: whereClause,
        include: {
          institution: true,
          verifications: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      let verificationResult;
      if (certificate && certificate.status === 'VERIFIED') {
        // Perform verification
        verificationResult = await verificationService.verifyCertificate(
          certificate,
          {
            requestedBy,
            requestorEmail,
            purpose,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            institutionId: certificate.institutionId
          }
        );
      } else {
        // Create failed verification record
        const verification = await prisma.verification.create({
          data: {
            requestedBy,
            requestorEmail,
            purpose,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            status: 'FAILED',
            isValid: false,
            confidenceScore: 0,
            verificationNotes: certificate ? 'Certificate found but not verified' : 'Certificate not found',
            flaggedReasons: certificate ? ['CERTIFICATE_NOT_VERIFIED'] : ['CERTIFICATE_NOT_FOUND'],
            verifiedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        });

        verificationResult = {
          verificationId: verification.id,
          verificationCode: verification.verificationCode,
          isValid: false,
          confidenceScore: 0,
          flaggedReasons: certificate ? ['CERTIFICATE_NOT_VERIFIED'] : ['CERTIFICATE_NOT_FOUND'],
          notes: certificate ? 'Certificate found but not verified by institution' : 'Certificate not found'
        };
      }

      // Log verification attempt
      auditLogger.info('Quick certificate verification', {
        verificationId: verificationResult.verificationId,
        requestedBy,
        certificateNumber,
        studentName,
        isValid: verificationResult.isValid,
        ip: req.ip
      });

      res.json({
        success: true,
        data: {
          verificationId: verificationResult.verificationId,
          verificationCode: verificationResult.verificationCode,
          isValid: verificationResult.isValid,
          confidenceScore: verificationResult.confidenceScore,
          status: verificationResult.isValid ? 'VERIFIED' : 'INVALID',
          message: verificationResult.isValid ? 
            'Certificate is authentic and verified' : 
            verificationResult.notes,
          certificate: verificationResult.isValid ? {
            studentName: certificate.studentName,
            course: certificate.course,
            passingYear: certificate.passingYear,
            grade: certificate.grade,
            institution: certificate.institution.name,
            dateOfIssue: certificate.dateOfIssue
          } : null,
          flaggedReasons: verificationResult.flaggedReasons
        }
      });
    } catch (error) {
      logger.error('Quick verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Verification failed'
      });
    }
  }
);

// @route   POST /api/verification/qr
// @desc    Verify certificate using QR code data
// @access  Public (with rate limiting)
router.post('/qr',
  verificationRateLimit,
  async (req, res) => {
    try {
      const { qrData, requestedBy, requestorEmail, purpose } = req.body;

      if (!qrData) {
        return res.status(400).json({
          success: false,
          error: 'QR code data is required'
        });
      }

      let qrInfo;
      try {
        qrInfo = JSON.parse(qrData);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid QR code format'
        });
      }

      if (qrInfo.type !== 'CERTIFICATE_VERIFICATION') {
        return res.status(400).json({
          success: false,
          error: 'Invalid certificate QR code'
        });
      }

      const prisma = getPrismaClient();

      // Find certificate by ID or blockchain hash
      let certificate;
      if (qrInfo.certificateId) {
        certificate = await prisma.certificate.findUnique({
          where: { id: qrInfo.certificateId },
          include: { institution: true }
        });
      } else if (qrInfo.blockchainHash) {
        certificate = await prisma.certificate.findUnique({
          where: { blockchainHash: qrInfo.blockchainHash },
          include: { institution: true }
        });
      }

      if (!certificate) {
        return res.status(404).json({
          success: false,
          error: 'Certificate not found'
        });
      }

      // Verify blockchain hash if present
      let blockchainValid = true;
      if (qrInfo.blockchainHash) {
        const blockchainResult = await blockchainService.validateCertificate(qrInfo.blockchainHash);
        blockchainValid = blockchainResult.isValid;
      }

      // Perform verification
      const verificationResult = await verificationService.verifyCertificate(
        certificate,
        {
          requestedBy,
          requestorEmail,
          purpose,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          institutionId: certificate.institutionId
        }
      );

      // Additional QR-specific validation
      const qrValid = blockchainValid && verificationResult.isValid;

      // Log QR verification
      auditLogger.info('QR certificate verification', {
        verificationId: verificationResult.verificationId,
        certificateId: certificate.id,
        blockchainHash: qrInfo.blockchainHash,
        requestedBy,
        isValid: qrValid,
        ip: req.ip
      });

      res.json({
        success: true,
        data: {
          verificationId: verificationResult.verificationId,
          verificationCode: verificationResult.verificationCode,
          isValid: qrValid,
          confidenceScore: qrValid ? verificationResult.confidenceScore : 0,
          status: qrValid ? 'VERIFIED' : 'INVALID',
          message: qrValid ? 
            'Certificate is authentic and verified via QR code' : 
            'Certificate verification failed',
          certificate: qrValid ? {
            certificateNumber: certificate.certificateNumber,
            studentName: certificate.studentName,
            course: certificate.course,
            passingYear: certificate.passingYear,
            grade: certificate.grade,
            institution: certificate.institution.name,
            dateOfIssue: certificate.dateOfIssue,
            blockchainHash: certificate.blockchainHash
          } : null,
          blockchain: {
            validated: blockchainValid,
            hash: qrInfo.blockchainHash
          }
        }
      });
    } catch (error) {
      logger.error('QR verification error:', error);
      res.status(500).json({
        success: false,
        error: 'QR verification failed'
      });
    }
  }
);

// @route   GET /api/verification/:verificationCode
// @desc    Get verification result by verification code
// @access  Public
router.get('/:verificationCode', async (req, res) => {
  try {
    const { verificationCode } = req.params;
    const prisma = getPrismaClient();

    const verification = await prisma.verification.findUnique({
      where: { verificationCode },
      include: {
        certificate: {
          include: {
            institution: true
          }
        }
      }
    });

    if (!verification) {
      return res.status(404).json({
        success: false,
        error: 'Verification record not found'
      });
    }

    // Check if verification has expired
    if (verification.expiresAt && new Date() > verification.expiresAt) {
      return res.status(410).json({
        success: false,
        error: 'Verification result has expired'
      });
    }

    res.json({
      success: true,
      data: {
        verificationCode: verification.verificationCode,
        status: verification.status,
        isValid: verification.isValid,
        confidenceScore: verification.confidenceScore,
        verifiedAt: verification.verifiedAt,
        expiresAt: verification.expiresAt,
        requestedBy: verification.requestedBy,
        purpose: verification.purpose,
        flaggedReasons: verification.flaggedReasons,
        certificate: verification.certificate ? {
          certificateNumber: verification.certificate.certificateNumber,
          studentName: verification.certificate.studentName,
          course: verification.certificate.course,
          passingYear: verification.certificate.passingYear,
          grade: verification.certificate.grade,
          institution: verification.certificate.institution?.name,
          dateOfIssue: verification.certificate.dateOfIssue
        } : null
      }
    });
  } catch (error) {
    logger.error('Get verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch verification result'
    });
  }
});

// @route   GET /api/verification/stats/public
// @desc    Get public verification statistics
// @access  Public
router.get('/stats/public', async (req, res) => {
  try {
    const prisma = getPrismaClient();

    const stats = await prisma.verification.aggregate({
      _count: {
        id: true
      },
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    const validVerifications = await prisma.verification.count({
      where: {
        isValid: true,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    const totalCertificates = await prisma.certificate.count({
      where: {
        status: 'VERIFIED'
      }
    });

    res.json({
      success: true,
      data: {
        totalVerifications: stats._count.id,
        validVerifications,
        invalidVerifications: stats._count.id - validVerifications,
        successRate: stats._count.id > 0 ? Math.round((validVerifications / stats._count.id) * 100) : 0,
        totalCertificatesInDatabase: totalCertificates,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Get verification stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch verification statistics'
    });
  }
});

/**
 * Helper function to find matching certificate in database
 */
async function findMatchingCertificate(extractedData) {
  const prisma = getPrismaClient();

  if (!extractedData.certificateNumber && !extractedData.studentName) {
    return null;
  }

  const whereConditions = [];

  // Search by certificate number (highest priority)
  if (extractedData.certificateNumber) {
    whereConditions.push({
      certificateNumber: extractedData.certificateNumber
    });
  }

  // Search by student details (fallback)
  if (extractedData.studentName) {
    const studentCondition = {
      studentName: { contains: extractedData.studentName, mode: 'insensitive' }
    };

    if (extractedData.rollNumber) {
      studentCondition.rollNumber = extractedData.rollNumber;
    }

    if (extractedData.course) {
      studentCondition.course = { contains: extractedData.course, mode: 'insensitive' };
    }

    if (extractedData.passingYear) {
      studentCondition.passingYear = extractedData.passingYear;
    }

    whereConditions.push(studentCondition);
  }

  try {
    const certificate = await prisma.certificate.findFirst({
      where: {
        OR: whereConditions,
        status: 'VERIFIED' // Only search in verified certificates
      },
      include: {
        institution: true
      }
    });

    return certificate;
  } catch (error) {
    logger.error('Error finding matching certificate:', error);
    return null;
  }
}

module.exports = router;
