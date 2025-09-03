const express = require('express');
const { getPrismaClient } = require('../config/database');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { validateVerificationRequest, validateId, validatePagination } = require('../middleware/validation');
const verificationService = require('../services/verificationService');
const { logger, auditLogger } = require('../utils/logger');

const router = express.Router();

// @route   POST /api/verifications/verify
// @desc    Verify a certificate
// @access  Public (with optional authentication)
router.post('/verify', 
  optionalAuth,
  validateVerificationRequest,
  async (req, res) => {
    try {
      const { certificateId, certificateNumber, requestedBy, requestorEmail, requestorPhone, purpose } = req.body;
      const prisma = getPrismaClient();

      // Find certificate by ID or certificate number
      let certificate = null;
      if (certificateId) {
        certificate = await prisma.certificate.findUnique({
          where: { id: certificateId },
          include: { institution: true }
        });
      } else if (certificateNumber) {
        certificate = await prisma.certificate.findFirst({
          where: { certificateNumber },
          include: { institution: true }
        });
      }

      if (!certificate) {
        return res.status(404).json({
          success: false,
          error: 'Certificate not found'
        });
      }

      // Prepare verification request
      const verificationRequest = {
        requestedBy,
        requestorEmail,
        requestorPhone,
        purpose,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        institutionId: certificate.institutionId,
        verifiedById: req.user?.id
      };

      // Perform verification
      const verificationResult = await verificationService.verifyCertificate(certificate, verificationRequest);

      // Log verification attempt
      auditLogger.info('Certificate verification requested', {
        certificateId: certificate.id,
        certificateNumber: certificate.certificateNumber,
        requestedBy,
        requestorEmail,
        isValid: verificationResult.isValid,
        confidenceScore: verificationResult.confidenceScore,
        ip: req.ip
      });

      res.json({
        success: true,
        data: {
          verificationId: verificationResult.verificationId,
          verificationCode: verificationResult.verificationCode,
          certificate: {
            id: certificate.id,
            certificateNumber: certificate.certificateNumber,
            studentName: certificate.studentName,
            course: certificate.course,
            passingYear: certificate.passingYear,
            institution: certificate.institution.name,
            dateOfIssue: certificate.dateOfIssue
          },
          verification: {
            isValid: verificationResult.isValid,
            confidenceScore: verificationResult.confidenceScore,
            flaggedReasons: verificationResult.flaggedReasons,
            verifiedAt: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      logger.error('Verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Verification failed'
      });
    }
  }
);

// @route   GET /api/verifications/:verificationCode
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
            institution: {
              select: { id: true, name: true, code: true }
            }
          }
        }
      }
    });

    if (!verification) {
      return res.status(404).json({
        success: false,
        error: 'Verification not found'
      });
    }

    // Check if verification has expired
    if (verification.expiresAt && new Date() > verification.expiresAt) {
      return res.status(410).json({
        success: false,
        error: 'Verification has expired'
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
        certificate: {
          certificateNumber: verification.certificate.certificateNumber,
          studentName: verification.certificate.studentName,
          course: verification.certificate.course,
          passingYear: verification.certificate.passingYear,
          institution: verification.certificate.institution.name,
          dateOfIssue: verification.certificate.dateOfIssue
        },
        requestedBy: verification.requestedBy,
        purpose: verification.purpose
      }
    });
  } catch (error) {
    logger.error('Get verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch verification'
    });
  }
});

// @route   GET /api/verifications
// @desc    Get verifications with pagination
// @access  Private
router.get('/', 
  authenticate,
  validatePagination,
  async (req, res) => {
    try {
      const prisma = getPrismaClient();
      const { page = 1, limit = 10, status, institutionId } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      let where = {};
      
      // Role-based filtering
      if (req.user.role === 'UNIVERSITY_ADMIN') {
        where.institutionId = req.user.institutionId;
      } else if (req.user.role === 'VERIFIER') {
        where.verifiedById = req.user.id;
      }

      // Apply filters
      if (status) where.status = status;
      if (institutionId && req.user.role === 'SUPER_ADMIN') where.institutionId = institutionId;

      const [verifications, total] = await Promise.all([
        prisma.verification.findMany({
          where,
          skip,
          take,
          include: {
            certificate: {
              select: {
                id: true,
                certificateNumber: true,
                studentName: true,
                course: true
              }
            },
            institution: {
              select: { id: true, name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.verification.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          verifications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      logger.error('Get verifications error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch verifications'
      });
    }
  }
);

// @route   POST /api/verifications/qr-verify
// @desc    Verify certificate using QR code data
// @access  Public
router.post('/qr-verify', async (req, res) => {
  try {
    const { qrData } = req.body;
    
    if (!qrData) {
      return res.status(400).json({
        success: false,
        error: 'QR data is required'
      });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid QR code data format'
      });
    }

    if (parsedData.type !== 'CERTIFICATE_VERIFICATION') {
      return res.status(400).json({
        success: false,
        error: 'Invalid QR code type'
      });
    }

    const prisma = getPrismaClient();
    const certificate = await prisma.certificate.findUnique({
      where: { id: parsedData.certificateId },
      include: { institution: true }
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found'
      });
    }

    // Verify blockchain hash if available
    let blockchainValid = true;
    if (certificate.blockchainHash && parsedData.blockchainHash) {
      blockchainValid = certificate.blockchainHash === parsedData.blockchainHash;
    }

    res.json({
      success: true,
      data: {
        certificate: {
          id: certificate.id,
          certificateNumber: certificate.certificateNumber,
          studentName: certificate.studentName,
          course: certificate.course,
          passingYear: certificate.passingYear,
          institution: certificate.institution.name,
          dateOfIssue: certificate.dateOfIssue,
          status: certificate.status
        },
        qrVerification: {
          isValid: blockchainValid && certificate.status === 'VERIFIED',
          blockchainValid,
          qrTimestamp: parsedData.timestamp
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
});

// @route   GET /api/verifications/stats/summary
// @desc    Get verification statistics
// @access  Private (Admin roles)
router.get('/stats/summary',
  authenticate,
  authorize('UNIVERSITY_ADMIN', 'SUPER_ADMIN'),
  async (req, res) => {
    try {
      const prisma = getPrismaClient();
      const { timeframe = '30d' } = req.query;

      // Calculate date range
      const now = new Date();
      let startDate;
      switch (timeframe) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      let where = {
        createdAt: {
          gte: startDate
        }
      };

      // Role-based filtering
      if (req.user.role === 'UNIVERSITY_ADMIN') {
        where.institutionId = req.user.institutionId;
      }

      const [
        totalVerifications,
        validVerifications,
        invalidVerifications,
        pendingVerifications,
        averageConfidence
      ] = await Promise.all([
        prisma.verification.count({ where }),
        prisma.verification.count({ 
          where: { ...where, isValid: true } 
        }),
        prisma.verification.count({ 
          where: { ...where, isValid: false } 
        }),
        prisma.verification.count({ 
          where: { ...where, status: 'IN_PROGRESS' } 
        }),
        prisma.verification.aggregate({
          where,
          _avg: { confidenceScore: true }
        })
      ]);

      res.json({
        success: true,
        data: {
          timeframe,
          totalVerifications,
          validVerifications,
          invalidVerifications,
          pendingVerifications,
          averageConfidence: Math.round(averageConfidence._avg.confidenceScore || 0),
          validationRate: totalVerifications > 0 ? 
            Math.round((validVerifications / totalVerifications) * 100) : 0
        }
      });
    } catch (error) {
      logger.error('Verification stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch verification statistics'
      });
    }
  }
);

module.exports = router;
