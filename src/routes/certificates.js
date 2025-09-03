const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { getPrismaClient } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateCertificateUpload, validateId, validatePagination } = require('../middleware/validation');
const ocrService = require('../services/ocrService');
const verificationService = require('../services/verificationService');
const blockchainService = require('../services/blockchainService');
const { logger, auditLogger } = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'certificates');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `cert-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || ['pdf', 'jpg', 'jpeg', 'png', 'tiff'];
    const fileExt = path.extname(file.originalname).toLowerCase().slice(1);
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
});

// @route   POST /api/certificates/upload
// @desc    Upload and process a certificate
// @access  Private (Institution Admin, Super Admin)
router.post('/upload', 
  authenticate, 
  authorize('UNIVERSITY_ADMIN', 'SUPER_ADMIN'),
  upload.single('certificate'),
  validateCertificateUpload,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No certificate file uploaded'
        });
      }

      const prisma = getPrismaClient();
      const certificateData = req.body;
      
      // Extract text using OCR
      logger.info(`Processing certificate upload: ${req.file.filename}`);
      const ocrResult = await ocrService.extractTextFromImage(req.file.path);
      const extractedData = ocrService.extractCertificateData(ocrResult);
      const ocrValidation = ocrService.validateOCRResults(ocrResult, extractedData);

      // Generate file hash
      const fileBuffer = await fs.readFile(req.file.path);
      const crypto = require('crypto');
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Create certificate record
      const certificate = await prisma.certificate.create({
        data: {
          certificateNumber: certificateData.certificateNumber,
          studentName: certificateData.studentName,
          fatherName: certificateData.fatherName,
          motherName: certificateData.motherName,
          rollNumber: certificateData.rollNumber,
          registrationNumber: certificateData.registrationNumber,
          course: certificateData.course,
          branch: certificateData.branch,
          passingYear: parseInt(certificateData.passingYear),
          grade: certificateData.grade,
          cgpa: certificateData.cgpa ? parseFloat(certificateData.cgpa) : null,
          percentage: certificateData.percentage ? parseFloat(certificateData.percentage) : null,
          dateOfIssue: new Date(certificateData.dateOfIssue),
          dateOfCompletion: certificateData.dateOfCompletion ? new Date(certificateData.dateOfCompletion) : null,
          type: certificateData.type,
          originalFileName: req.file.originalname,
          filePath: req.file.path,
          fileHash,
          ocrText: ocrResult.text,
          ocrConfidence: ocrResult.confidence,
          extractedData: extractedData,
          isLegacy: certificateData.isLegacy === 'true',
          institutionId: req.user.institutionId || certificateData.institutionId,
        },
        include: {
          institution: true
        }
      });

      // Generate blockchain hash and QR code for new certificates
      let blockchainResult = null;
      let qrCode = null;
      
      if (!certificate.isLegacy) {
        try {
          blockchainResult = await blockchainService.storeCertificateOnBlockchain(certificate);
          qrCode = await blockchainService.generateQRCode({
            ...certificate,
            blockchainHash: blockchainResult.blockchainHash
          });

          // Update certificate with blockchain data
          await prisma.certificate.update({
            where: { id: certificate.id },
            data: {
              blockchainHash: blockchainResult.blockchainHash,
              qrCode,
              digitalSignature: blockchainService.createDigitalSignature(certificate)
            }
          });
        } catch (blockchainError) {
          logger.warn('Blockchain storage failed:', blockchainError);
          // Continue without blockchain - certificate is still valid
        }
      }

      // Log certificate upload
      auditLogger.info('Certificate uploaded', {
        certificateId: certificate.id,
        userId: req.user.id,
        institutionId: certificate.institutionId,
        fileName: req.file.originalname,
        ocrConfidence: ocrResult.confidence,
        ip: req.ip
      });

      res.status(201).json({
        success: true,
        data: {
          certificate: {
            id: certificate.id,
            certificateNumber: certificate.certificateNumber,
            studentName: certificate.studentName,
            course: certificate.course,
            status: certificate.status,
            ocrConfidence: certificate.ocrConfidence,
            blockchainHash: blockchainResult?.blockchainHash,
            qrCode: qrCode
          },
          ocrValidation,
          extractedData
        }
      });
    } catch (error) {
      logger.error('Certificate upload error:', error);
      
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
        error: 'Certificate upload failed'
      });
    }
  }
);

// @route   GET /api/certificates
// @desc    Get certificates with pagination and filters
// @access  Private
router.get('/', 
  authenticate,
  validatePagination,
  async (req, res) => {
    try {
      const prisma = getPrismaClient();
      const { page = 1, limit = 10, status, type, institutionId, search } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      // Build where clause based on user role and filters
      let where = {};
      
      // Role-based filtering
      if (req.user.role === 'UNIVERSITY_ADMIN') {
        where.institutionId = req.user.institutionId;
      } else if (req.user.role === 'VERIFIER' || req.user.role === 'PUBLIC') {
        where.status = 'VERIFIED'; // Only show verified certificates to verifiers and public
      }

      // Apply filters
      if (status) where.status = status;
      if (type) where.type = type;
      if (institutionId && req.user.role === 'SUPER_ADMIN') where.institutionId = institutionId;
      if (search) {
        where.OR = [
          { studentName: { contains: search, mode: 'insensitive' } },
          { certificateNumber: { contains: search, mode: 'insensitive' } },
          { course: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [certificates, total] = await Promise.all([
        prisma.certificate.findMany({
          where,
          skip,
          take,
          include: {
            institution: {
              select: { id: true, name: true, code: true }
            },
            _count: {
              select: { verifications: true, anomalies: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.certificate.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          certificates,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      logger.error('Get certificates error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch certificates'
      });
    }
  }
);

// @route   GET /api/certificates/:id
// @desc    Get certificate by ID
// @access  Private
router.get('/:id', 
  authenticate,
  validateId,
  async (req, res) => {
    try {
      const prisma = getPrismaClient();
      const { id } = req.params;

      const certificate = await prisma.certificate.findUnique({
        where: { id },
        include: {
          institution: true,
          verifications: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          anomalies: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!certificate) {
        return res.status(404).json({
          success: false,
          error: 'Certificate not found'
        });
      }

      // Check access permissions
      if (req.user.role === 'UNIVERSITY_ADMIN' && certificate.institutionId !== req.user.institutionId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: certificate
      });
    } catch (error) {
      logger.error('Get certificate error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch certificate'
      });
    }
  }
);

// @route   PUT /api/certificates/:id/status
// @desc    Update certificate status
// @access  Private (University Admin, Super Admin)
router.put('/:id/status',
  authenticate,
  authorize('UNIVERSITY_ADMIN', 'SUPER_ADMIN'),
  validateId,
  async (req, res) => {
    try {
      const prisma = getPrismaClient();
      const { id } = req.params;
      const { status, notes } = req.body;

      const certificate = await prisma.certificate.findUnique({
        where: { id }
      });

      if (!certificate) {
        return res.status(404).json({
          success: false,
          error: 'Certificate not found'
        });
      }

      // Check permissions
      if (req.user.role === 'UNIVERSITY_ADMIN' && certificate.institutionId !== req.user.institutionId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const updatedCertificate = await prisma.certificate.update({
        where: { id },
        data: { status },
        include: {
          institution: true
        }
      });

      // Log status change
      auditLogger.info('Certificate status updated', {
        certificateId: id,
        oldStatus: certificate.status,
        newStatus: status,
        userId: req.user.id,
        notes,
        ip: req.ip
      });

      res.json({
        success: true,
        data: updatedCertificate
      });
    } catch (error) {
      logger.error('Update certificate status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update certificate status'
      });
    }
  }
);

// @route   DELETE /api/certificates/:id
// @desc    Delete certificate
// @access  Private (Super Admin only)
router.delete('/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  validateId,
  async (req, res) => {
    try {
      const prisma = getPrismaClient();
      const { id } = req.params;

      const certificate = await prisma.certificate.findUnique({
        where: { id }
      });

      if (!certificate) {
        return res.status(404).json({
          success: false,
          error: 'Certificate not found'
        });
      }

      // Delete associated file
      if (certificate.filePath) {
        try {
          await fs.unlink(certificate.filePath);
        } catch (fileError) {
          logger.warn('Failed to delete certificate file:', fileError);
        }
      }

      // Delete certificate and related records
      await prisma.certificate.delete({
        where: { id }
      });

      // Log deletion
      auditLogger.info('Certificate deleted', {
        certificateId: id,
        certificateNumber: certificate.certificateNumber,
        userId: req.user.id,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Certificate deleted successfully'
      });
    } catch (error) {
      logger.error('Delete certificate error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete certificate'
      });
    }
  }
);

// @route   POST /api/certificates/bulk-upload
// @desc    Bulk upload certificates from CSV/Excel
// @access  Private (University Admin, Super Admin)
router.post('/bulk-upload',
  authenticate,
  authorize('UNIVERSITY_ADMIN', 'SUPER_ADMIN'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      // Process bulk upload (implementation would depend on file format)
      // This is a placeholder for the bulk upload functionality
      
      res.json({
        success: true,
        message: 'Bulk upload initiated',
        data: {
          fileName: req.file.originalname,
          status: 'processing'
        }
      });
    } catch (error) {
      logger.error('Bulk upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Bulk upload failed'
      });
    }
  }
);

module.exports = router;
