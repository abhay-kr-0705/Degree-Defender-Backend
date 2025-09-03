const express = require('express');
const { getPrismaClient } = require('../config/database');
const { validateVerificationRequest } = require('../middleware/validation');
const verificationService = require('../services/verificationService');
const ocrService = require('../services/ocrService');
const { logger } = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Configure multer for public file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'public');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `public-cert-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, JPEG, and PNG files are allowed'));
    }
  }
});

// @route   POST /api/public/verify
// @desc    Public certificate verification endpoint
// @access  Public
router.post('/verify', 
  validateVerificationRequest,
  async (req, res) => {
    try {
      const { certificateNumber, studentName, requestedBy, requestorEmail, purpose } = req.body;
      const prisma = getPrismaClient();

      // Find certificate
      const certificate = await prisma.certificate.findFirst({
        where: {
          certificateNumber,
          studentName: { contains: studentName, mode: 'insensitive' },
          status: 'VERIFIED'
        },
        include: { institution: true }
      });

      if (!certificate) {
        return res.status(404).json({
          success: false,
          error: 'Certificate not found or not verified'
        });
      }

      // Create verification request
      const verificationRequest = {
        requestedBy,
        requestorEmail,
        purpose,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        institutionId: certificate.institutionId
      };

      const result = await verificationService.verifyCertificate(certificate, verificationRequest);

      res.json({
        success: true,
        data: {
          verificationCode: result.verificationCode,
          certificate: {
            certificateNumber: certificate.certificateNumber,
            studentName: certificate.studentName,
            course: certificate.course,
            passingYear: certificate.passingYear,
            grade: certificate.grade,
            institution: certificate.institution.name
          },
          isValid: result.isValid,
          confidenceScore: result.confidenceScore,
          verificationDate: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Public verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Verification failed'
      });
    }
  }
);

// @route   POST /api/public/verify-file
// @desc    Public certificate verification via file upload
// @access  Public
router.post('/verify-file', 
  upload.single('certificate'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Certificate file is required'
        });
      }

      const { requestedBy, requestorEmail, purpose } = req.body;
      
      // Extract text from uploaded certificate using OCR
      const ocrResult = await ocrService.extractText(req.file.path);
      
      if (!ocrResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Failed to extract text from certificate'
        });
      }

      // Parse extracted data
      const extractedData = ocrService.parseCertificateData(ocrResult.text);
      
      if (!extractedData.certificateNumber || !extractedData.studentName) {
        return res.status(400).json({
          success: false,
          error: 'Could not extract required certificate details'
        });
      }

      const prisma = getPrismaClient();

      // Find certificate in database
      const certificate = await prisma.certificate.findFirst({
        where: {
          certificateNumber: extractedData.certificateNumber,
          studentName: { contains: extractedData.studentName, mode: 'insensitive' },
          status: 'VERIFIED'
        },
        include: { institution: true }
      });

      if (!certificate) {
        return res.status(404).json({
          success: false,
          error: 'Certificate not found in database or not verified'
        });
      }

      // Perform additional forgery detection
      const forgeryAnalysis = await verificationService.detectForgery(req.file.path, certificate);

      // Create verification request
      const verificationRequest = {
        requestedBy,
        requestorEmail,
        purpose,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        institutionId: certificate.institutionId,
        filePath: req.file.path,
        ocrData: extractedData
      };

      const result = await verificationService.verifyCertificate(certificate, verificationRequest);

      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        logger.warn('Failed to cleanup uploaded file:', cleanupError);
      }

      res.json({
        success: true,
        data: {
          verificationCode: result.verificationCode,
          certificate: {
            certificateNumber: certificate.certificateNumber,
            studentName: certificate.studentName,
            course: certificate.course,
            passingYear: certificate.passingYear,
            grade: certificate.grade,
            institution: certificate.institution.name
          },
          isValid: result.isValid,
          confidenceScore: result.confidenceScore,
          forgeryAnalysis,
          extractedData,
          verificationDate: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Public file verification error:', error);
      
      // Clean up uploaded file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          logger.warn('Failed to cleanup uploaded file on error:', cleanupError);
        }
      }
      
      res.status(500).json({
        success: false,
        error: 'File verification failed'
      });
    }
  }
);

// @route   POST /api/public/verify-qr
// @desc    Public certificate verification via QR code
// @access  Public
router.post('/verify-qr', async (req, res) => {
  try {
    const { qrData, requestedBy, requestorEmail, purpose } = req.body;
    
    if (!qrData) {
      return res.status(400).json({
        success: false,
        error: 'QR code data is required'
      });
    }

    // Parse QR code data (should contain certificate number and verification hash)
    let qrInfo;
    try {
      qrInfo = JSON.parse(qrData);
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid QR code format'
      });
    }

    const { certificateNumber, verificationHash } = qrInfo;
    
    if (!certificateNumber || !verificationHash) {
      return res.status(400).json({
        success: false,
        error: 'QR code missing required data'
      });
    }

    const prisma = getPrismaClient();

    // Find certificate and verify hash
    const certificate = await prisma.certificate.findFirst({
      where: {
        certificateNumber,
        verificationHash,
        status: 'VERIFIED'
      },
      include: { institution: true }
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found or QR code invalid'
      });
    }

    // Create verification request
    const verificationRequest = {
      requestedBy,
      requestorEmail,
      purpose,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      institutionId: certificate.institutionId,
      verificationMethod: 'QR_CODE'
    };

    const result = await verificationService.verifyCertificate(certificate, verificationRequest);

    res.json({
      success: true,
      data: {
        verificationCode: result.verificationCode,
        certificate: {
          certificateNumber: certificate.certificateNumber,
          studentName: certificate.studentName,
          course: certificate.course,
          passingYear: certificate.passingYear,
          grade: certificate.grade,
          institution: certificate.institution.name
        },
        isValid: result.isValid,
        confidenceScore: result.confidenceScore,
        verificationMethod: 'QR_CODE',
        verificationDate: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('QR verification error:', error);
    res.status(500).json({
      success: false,
      error: 'QR verification failed'
    });
  }
});

// @route   GET /api/public/institutions
// @desc    Get list of verified institutions
// @access  Public
router.get('/institutions', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    
    const institutions = await prisma.institution.findMany({
      where: {
        isActive: true,
        isVerified: true
      },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        city: true,
        state: true,
        establishedYear: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: institutions
    });
  } catch (error) {
    logger.error('Get public institutions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch institutions'
    });
  }
});

// @route   GET /api/public/verification/:code
// @desc    Get verification details by verification code
// @access  Public
router.get('/verification/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const prisma = getPrismaClient();
    
    const verification = await prisma.verification.findFirst({
      where: {
        verificationCode: code,
        expiresAt: { gt: new Date() }
      },
      include: {
        certificate: {
          include: { institution: true }
        }
      }
    });

    if (!verification) {
      return res.status(404).json({
        success: false,
        error: 'Verification code not found or expired'
      });
    }

    res.json({
      success: true,
      data: {
        verificationCode: verification.verificationCode,
        certificate: {
          certificateNumber: verification.certificate.certificateNumber,
          studentName: verification.certificate.studentName,
          course: verification.certificate.course,
          passingYear: verification.certificate.passingYear,
          grade: verification.certificate.grade,
          institution: verification.certificate.institution.name
        },
        isValid: verification.isValid,
        confidenceScore: verification.confidenceScore,
        verificationDate: verification.createdAt,
        expiresAt: verification.expiresAt,
        requestedBy: verification.requestedBy
      }
    });
  } catch (error) {
    logger.error('Get verification details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch verification details'
    });
  }
});

// @route   GET /api/public/stats
// @desc    Get public statistics
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    
    const [
      totalCertificates,
      totalInstitutions,
      totalVerifications,
      recentVerifications
    ] = await Promise.all([
      prisma.certificate.count({ where: { status: 'VERIFIED' } }),
      prisma.institution.count({ where: { isActive: true, isVerified: true } }),
      prisma.verification.count(),
      prisma.verification.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalCertificates,
        totalInstitutions,
        totalVerifications,
        recentVerifications,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Get public stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

module.exports = router;