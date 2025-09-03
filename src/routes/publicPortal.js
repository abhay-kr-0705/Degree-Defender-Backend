const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { getPrismaClient } = require('../config/database');
const ocrService = require('../services/ocrService');
const verificationService = require('../services/verificationService');
const blockchainService = require('../services/blockchainService');
const digitalWatermarkService = require('../services/digitalWatermarkService');
const { logger } = require('../utils/logger');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for public portal
const publicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later'
  }
});

// Configure multer for file uploads
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
    cb(null, `public-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for public uploads
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png'];
    const fileExt = path.extname(file.originalname).toLowerCase().slice(1);
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
});

// @route   GET /api/public/portal
// @desc    Get public portal information
// @access  Public
router.get('/portal', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    
    // Get basic statistics for public display
    const [totalCertificates, totalVerifications, totalInstitutions] = await Promise.all([
      prisma.certificate.count({ where: { status: 'VERIFIED' } }),
      prisma.verification.count({ where: { isValid: true } }),
      prisma.institution.count({ where: { isActive: true, isVerified: true } })
    ]);

    res.json({
      success: true,
      data: {
        portalInfo: {
          title: 'Degree Defenders - Certificate Verification Portal',
          subtitle: 'Government of Jharkhand - Department of Higher and Technical Education',
          description: 'Verify the authenticity of academic certificates and degrees issued by institutions in Jharkhand'
        },
        statistics: {
          totalCertificates,
          totalVerifications,
          totalInstitutions,
          lastUpdated: new Date().toISOString()
        },
        features: [
          'Upload and verify certificates instantly',
          'QR code scanning for quick verification',
          'Blockchain-powered authenticity validation',
          'AI-powered anomaly detection',
          'Secure and tamper-proof verification'
        ]
      }
    });
  } catch (error) {
    logger.error('Public portal info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load portal information'
    });
  }
});

// @route   POST /api/public/verify-upload
// @desc    Public certificate verification by upload
// @access  Public (with rate limiting)
router.post('/verify-upload',
  publicRateLimit,
  upload.single('certificate'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Please upload a certificate file'
        });
      }

      const { name, email, purpose } = req.body;

      if (!name || !email) {
        return res.status(400).json({
          success: false,
          error: 'Name and email are required'
        });
      }

      // Extract text using OCR
      let ocrResult;
      if (req.file.mimetype === 'application/pdf') {
        ocrResult = await ocrService.extractTextFromPDF(req.file.path);
      } else {
        ocrResult = await ocrService.extractTextFromImage(req.file.path);
      }

      const extractedData = ocrService.extractCertificateData(ocrResult);
      
      // Search for matching certificate
      const prisma = getPrismaClient();
      const matchingCertificate = await findMatchingCertificate(extractedData);

      let result = {
        uploadId: `PUB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        extractedData,
        ocrConfidence: ocrResult.confidence
      };

      if (matchingCertificate) {
        // Perform verification
        const verificationResult = await verificationService.verifyCertificate(
          matchingCertificate,
          {
            requestedBy: name,
            requestorEmail: email,
            purpose: purpose || 'Public verification',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            institutionId: matchingCertificate.institutionId
          }
        );

        result.verification = {
          isValid: verificationResult.isValid,
          confidenceScore: verificationResult.confidenceScore,
          verificationCode: verificationResult.verificationCode,
          status: verificationResult.isValid ? 'AUTHENTIC' : 'INVALID',
          message: verificationResult.isValid ? 
            'Certificate is authentic and verified' : 
            'Certificate could not be verified'
        };

        if (verificationResult.isValid) {
          result.certificate = {
            studentName: matchingCertificate.studentName,
            course: matchingCertificate.course,
            institution: matchingCertificate.institution.name,
            passingYear: matchingCertificate.passingYear,
            grade: matchingCertificate.grade,
            dateOfIssue: matchingCertificate.dateOfIssue
          };
        }
      } else {
        result.verification = {
          isValid: false,
          confidenceScore: 0,
          status: 'NOT_FOUND',
          message: 'Certificate not found in our database'
        };
      }

      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        logger.warn('File cleanup error:', cleanupError);
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Public verification upload error:', error);
      
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          logger.error('File cleanup error:', cleanupError);
        }
      }

      res.status(500).json({
        success: false,
        error: 'Verification failed. Please try again.'
      });
    }
  }
);

// @route   POST /api/public/verify-qr
// @desc    Verify certificate using QR code
// @access  Public (with rate limiting)
router.post('/verify-qr',
  publicRateLimit,
  async (req, res) => {
    try {
      const { qrData, name, email } = req.body;

      if (!qrData) {
        return res.status(400).json({
          success: false,
          error: 'QR code data is required'
        });
      }

      if (!name || !email) {
        return res.status(400).json({
          success: false,
          error: 'Name and email are required'
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
          error: 'This is not a valid certificate QR code'
        });
      }

      const prisma = getPrismaClient();

      // Find certificate
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

      // Verify blockchain hash
      let blockchainValid = true;
      if (qrInfo.blockchainHash) {
        const blockchainResult = await blockchainService.validateCertificate(qrInfo.blockchainHash);
        blockchainValid = blockchainResult.isValid;
      }

      // Create verification record
      const verification = await prisma.verification.create({
        data: {
          requestedBy: name,
          requestorEmail: email,
          purpose: 'Public QR verification',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          certificateId: certificate.id,
          institutionId: certificate.institutionId,
          status: blockchainValid && certificate.status === 'VERIFIED' ? 'COMPLETED' : 'FAILED',
          isValid: blockchainValid && certificate.status === 'VERIFIED',
          confidenceScore: blockchainValid ? 100 : 0,
          verifiedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      const isValid = blockchainValid && certificate.status === 'VERIFIED';

      res.json({
        success: true,
        data: {
          verificationId: verification.id,
          verificationCode: verification.verificationCode,
          isValid,
          status: isValid ? 'AUTHENTIC' : 'INVALID',
          message: isValid ? 
            'Certificate is authentic and verified via QR code' : 
            'Certificate verification failed',
          certificate: isValid ? {
            certificateNumber: certificate.certificateNumber,
            studentName: certificate.studentName,
            course: certificate.course,
            institution: certificate.institution.name,
            passingYear: certificate.passingYear,
            grade: certificate.grade,
            dateOfIssue: certificate.dateOfIssue
          } : null,
          blockchain: {
            validated: blockchainValid,
            hash: qrInfo.blockchainHash
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Public QR verification error:', error);
      res.status(500).json({
        success: false,
        error: 'QR verification failed. Please try again.'
      });
    }
  }
);

// @route   POST /api/public/verify-details
// @desc    Verify certificate using manual details
// @access  Public (with rate limiting)
router.post('/verify-details',
  publicRateLimit,
  async (req, res) => {
    try {
      const { 
        certificateNumber, 
        studentName, 
        institutionName,
        passingYear,
        name, 
        email 
      } = req.body;

      if (!name || !email) {
        return res.status(400).json({
          success: false,
          error: 'Your name and email are required'
        });
      }

      if (!certificateNumber && !studentName) {
        return res.status(400).json({
          success: false,
          error: 'Either certificate number or student name is required'
        });
      }

      const prisma = getPrismaClient();

      // Build search criteria
      const whereClause = { AND: [] };

      if (certificateNumber) {
        whereClause.AND.push({ certificateNumber });
      }

      if (studentName) {
        whereClause.AND.push({ 
          studentName: { contains: studentName, mode: 'insensitive' } 
        });
      }

      if (institutionName) {
        whereClause.AND.push({
          institution: { 
            name: { contains: institutionName, mode: 'insensitive' } 
          }
        });
      }

      if (passingYear) {
        whereClause.AND.push({ passingYear: parseInt(passingYear) });
      }

      // Only search verified certificates
      whereClause.AND.push({ status: 'VERIFIED' });

      const certificate = await prisma.certificate.findFirst({
        where: whereClause,
        include: { institution: true }
      });

      // Create verification record
      const verification = await prisma.verification.create({
        data: {
          requestedBy: name,
          requestorEmail: email,
          purpose: 'Public manual verification',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          certificateId: certificate?.id,
          institutionId: certificate?.institutionId,
          status: certificate ? 'COMPLETED' : 'FAILED',
          isValid: !!certificate,
          confidenceScore: certificate ? 95 : 0,
          verifiedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      res.json({
        success: true,
        data: {
          verificationId: verification.id,
          verificationCode: verification.verificationCode,
          isValid: !!certificate,
          status: certificate ? 'AUTHENTIC' : 'NOT_FOUND',
          message: certificate ? 
            'Certificate found and verified' : 
            'Certificate not found with the provided details',
          certificate: certificate ? {
            certificateNumber: certificate.certificateNumber,
            studentName: certificate.studentName,
            course: certificate.course,
            institution: certificate.institution.name,
            passingYear: certificate.passingYear,
            grade: certificate.grade,
            dateOfIssue: certificate.dateOfIssue
          } : null,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Public manual verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Verification failed. Please try again.'
      });
    }
  }
);

// @route   GET /api/public/verification/:verificationCode
// @desc    Get verification result by code (public access)
// @access  Public
router.get('/verification/:verificationCode', async (req, res) => {
  try {
    const { verificationCode } = req.params;
    const prisma = getPrismaClient();

    const verification = await prisma.verification.findUnique({
      where: { verificationCode },
      include: {
        certificate: {
          include: { institution: true }
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
        error: 'This verification result has expired'
      });
    }

    res.json({
      success: true,
      data: {
        verificationCode: verification.verificationCode,
        isValid: verification.isValid,
        status: verification.isValid ? 'AUTHENTIC' : 'INVALID',
        verifiedAt: verification.verifiedAt,
        expiresAt: verification.expiresAt,
        requestedBy: verification.requestedBy,
        certificate: verification.certificate ? {
          certificateNumber: verification.certificate.certificateNumber,
          studentName: verification.certificate.studentName,
          course: verification.certificate.course,
          institution: verification.certificate.institution?.name,
          passingYear: verification.certificate.passingYear,
          grade: verification.certificate.grade,
          dateOfIssue: verification.certificate.dateOfIssue
        } : null
      }
    });
  } catch (error) {
    logger.error('Get public verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve verification result'
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
        establishedYear: true,
        _count: {
          select: {
            certificates: {
              where: { status: 'VERIFIED' }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: {
        institutions: institutions.map(inst => ({
          ...inst,
          certificateCount: inst._count.certificates
        })),
        total: institutions.length
      }
    });
  } catch (error) {
    logger.error('Get institutions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch institutions'
    });
  }
});

/**
 * Helper function to find matching certificate
 */
async function findMatchingCertificate(extractedData) {
  const prisma = getPrismaClient();

  if (!extractedData.certificateNumber && !extractedData.studentName) {
    return null;
  }

  const whereConditions = [];

  if (extractedData.certificateNumber) {
    whereConditions.push({
      certificateNumber: extractedData.certificateNumber
    });
  }

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
        status: 'VERIFIED'
      },
      include: { institution: true }
    });

    return certificate;
  } catch (error) {
    logger.error('Error finding matching certificate:', error);
    return null;
  }
}

module.exports = router;
