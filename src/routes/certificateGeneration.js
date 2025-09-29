const express = require('express');
const { getPrismaClient } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateId } = require('../middleware/validation');
const certificateGenerationService = require('../services/certificateGenerationService');
const { logger, auditLogger } = require('../utils/logger');

const router = express.Router();

// @route   POST /api/certificate-generation/generate/:id
// @desc    Generate PDF certificate with QR code for existing certificate
// @access  Private (University Admin, Super Admin)
router.post('/generate/:id',
  authenticate,
  authorize('UNIVERSITY_ADMIN', 'SUPER_ADMIN'),
  validateId,
  async (req, res) => {
    try {
      const prisma = getPrismaClient();
      const { id } = req.params;

      // Get certificate data
      const certificate = await prisma.certificate.findUnique({
        where: { id },
        include: {
          institution: true
        }
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

      // Generate PDF certificate
      const generatedCertificate = await certificateGenerationService.generateCertificate(certificate, {
        includeWatermark: true,
        includeQRCode: true,
        includeDigitalSignature: true
      });

      // Update certificate record with generated PDF path
      await prisma.certificate.update({
        where: { id },
        data: {
          generatedPdfPath: generatedCertificate.filepath,
          pdfFingerprint: generatedCertificate.fingerprint,
          pdfGeneratedAt: generatedCertificate.generatedAt
        }
      });

      // Log certificate generation
      auditLogger.info('Certificate PDF generated', {
        certificateId: id,
        userId: req.user.id,
        filename: generatedCertificate.filename,
        fingerprint: generatedCertificate.fingerprint,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Certificate PDF generated successfully',
        data: {
          filename: generatedCertificate.filename,
          fingerprint: generatedCertificate.fingerprint,
          size: generatedCertificate.size,
          downloadUrl: `/api/certificate-generation/download/${id}`
        }
      });
    } catch (error) {
      logger.error('Certificate generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate certificate PDF'
      });
    }
  }
);

// @route   GET /api/certificate-generation/download/:id
// @desc    Download generated PDF certificate
// @access  Private
router.get('/download/:id',
  authenticate,
  validateId,
  async (req, res) => {
    try {
      const prisma = getPrismaClient();
      const { id } = req.params;

      const certificate = await prisma.certificate.findUnique({
        where: { id },
        select: {
          generatedPdfPath: true,
          certificateNumber: true,
          institutionId: true
        }
      });

      if (!certificate) {
        return res.status(404).json({
          success: false,
          error: 'Certificate not found'
        });
      }

      if (!certificate.generatedPdfPath) {
        return res.status(404).json({
          success: false,
          error: 'PDF certificate not generated yet'
        });
      }

      // Check permissions
      if (req.user.role === 'UNIVERSITY_ADMIN' && certificate.institutionId !== req.user.institutionId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Send file
      res.download(certificate.generatedPdfPath, `certificate_${certificate.certificateNumber.replace(/\//g, '_')}.pdf`, (err) => {
        if (err) {
          logger.error('PDF download error:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              error: 'Failed to download certificate'
            });
          }
        }
      });

      // Log download
      auditLogger.info('Certificate PDF downloaded', {
        certificateId: id,
        userId: req.user.id,
        ip: req.ip
      });
    } catch (error) {
      logger.error('Certificate download error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download certificate'
      });
    }
  }
);

// @route   POST /api/certificate-generation/verify-fingerprint
// @desc    Verify certificate fingerprint
// @access  Public
router.post('/verify-fingerprint', async (req, res) => {
  try {
    const { certificateNumber, fingerprint } = req.body;

    if (!certificateNumber || !fingerprint) {
      return res.status(400).json({
        success: false,
        error: 'Certificate number and fingerprint are required'
      });
    }

    const prisma = getPrismaClient();

    const certificate = await prisma.certificate.findFirst({
      where: { certificateNumber },
      include: {
        institution: true
      }
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found'
      });
    }

    // Verify fingerprint
    const isValid = certificateGenerationService.verifyCertificateFingerprint(certificate, fingerprint);

    res.json({
      success: true,
      data: {
        isValid,
        certificateNumber: certificate.certificateNumber,
        studentName: certificate.studentName,
        institution: certificate.institution?.name,
        verifiedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Fingerprint verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify fingerprint'
    });
  }
});

// @route   POST /api/certificate-generation/bulk-generate
// @desc    Bulk generate PDF certificates
// @access  Private (University Admin, Super Admin)
router.post('/bulk-generate',
  authenticate,
  authorize('UNIVERSITY_ADMIN', 'SUPER_ADMIN'),
  async (req, res) => {
    try {
      const { certificateIds } = req.body;

      if (!Array.isArray(certificateIds) || certificateIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Certificate IDs array is required'
        });
      }

      const prisma = getPrismaClient();

      // Get certificates
      const certificates = await prisma.certificate.findMany({
        where: {
          id: { in: certificateIds },
          ...(req.user.role === 'UNIVERSITY_ADMIN' ? { institutionId: req.user.institutionId } : {})
        },
        include: {
          institution: true
        }
      });

      if (certificates.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No certificates found'
        });
      }

      // Generate PDFs in parallel (with concurrency limit)
      const results = {
        total: certificates.length,
        successful: 0,
        failed: 0,
        details: []
      };

      const concurrencyLimit = 5;
      for (let i = 0; i < certificates.length; i += concurrencyLimit) {
        const batch = certificates.slice(i, i + concurrencyLimit);
        
        const batchResults = await Promise.allSettled(
          batch.map(cert => certificateGenerationService.generateCertificate(cert))
        );

        for (let j = 0; j < batchResults.length; j++) {
          const result = batchResults[j];
          const cert = batch[j];

          if (result.status === 'fulfilled') {
            // Update certificate record
            await prisma.certificate.update({
              where: { id: cert.id },
              data: {
                generatedPdfPath: result.value.filepath,
                pdfFingerprint: result.value.fingerprint,
                pdfGeneratedAt: result.value.generatedAt
              }
            });

            results.successful++;
            results.details.push({
              certificateId: cert.id,
              certificateNumber: cert.certificateNumber,
              status: 'success',
              filename: result.value.filename
            });
          } else {
            results.failed++;
            results.details.push({
              certificateId: cert.id,
              certificateNumber: cert.certificateNumber,
              status: 'failed',
              error: result.reason?.message || 'Unknown error'
            });
          }
        }
      }

      // Log bulk generation
      auditLogger.info('Bulk certificate generation', {
        userId: req.user.id,
        total: results.total,
        successful: results.successful,
        failed: results.failed,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Bulk certificate generation completed',
        data: results
      });
    } catch (error) {
      logger.error('Bulk certificate generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate certificates'
      });
    }
  }
);

module.exports = router;
