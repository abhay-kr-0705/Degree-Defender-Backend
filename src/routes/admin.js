const express = require('express');
const { getPrismaClient } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');
const blockchainService = require('../services/blockchainService');
const { logger, auditLogger } = require('../utils/logger');

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard with forgery analytics
// @access  Private (Admin roles only)
router.get('/dashboard',
  authenticate,
  authorize('SUPER_ADMIN', 'UNIVERSITY_ADMIN'),
  async (req, res) => {
    try {
      const prisma = getPrismaClient();
      const { timeframe = '30d' } = req.query;

      const now = new Date();
      let startDate;
      switch (timeframe) {
        case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
        default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      let whereClause = {};
      if (req.user.role === 'UNIVERSITY_ADMIN') {
        whereClause.institutionId = req.user.institutionId;
      }

      const [
        totalCertificates,
        verifiedCertificates,
        pendingCertificates,
        flaggedCertificates,
        totalVerifications,
        totalAnomalies,
        criticalAnomalies
      ] = await Promise.all([
        prisma.certificate.count({ where: whereClause }),
        prisma.certificate.count({ where: { ...whereClause, status: 'VERIFIED' } }),
        prisma.certificate.count({ where: { ...whereClause, status: 'PENDING' } }),
        prisma.certificate.count({ where: { ...whereClause, status: 'FLAGGED' } }),
        prisma.verification.count({ where: { ...whereClause, createdAt: { gte: startDate } } }),
        prisma.anomaly.count({ where: { createdAt: { gte: startDate } } }),
        prisma.anomaly.count({ where: { severity: 'CRITICAL', createdAt: { gte: startDate } } })
      ]);

      // Get blockchain network status
      const blockchainStatus = await blockchainService.getNetworkStatus();
      
      // Get blockchain-verified certificates count
      const blockchainVerifiedCerts = await prisma.certificate.count({
        where: { ...whereClause, blockchainHash: { not: null } }
      });

      res.json({
        success: true,
        data: {
          overview: {
            totalCertificates,
            verifiedCertificates,
            pendingCertificates,
            flaggedCertificates,
            blockchainVerifiedCerts,
            verificationRate: totalCertificates > 0 ? Math.round((verifiedCertificates / totalCertificates) * 100) : 0,
            blockchainCoverage: totalCertificates > 0 ? Math.round((blockchainVerifiedCerts / totalCertificates) * 100) : 0
          },
          verifications: { total: totalVerifications },
          forgeryAnalytics: { totalAnomalies, criticalAnomalies },
          blockchain: blockchainStatus,
          timeframe
        }
      });
    } catch (error) {
      logger.error('Admin dashboard error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
    }
  }
);

// @route   GET /api/admin/anomalies
// @desc    Get anomalies with filtering
// @access  Private (Admin roles only)
router.get('/anomalies',
  authenticate,
  authorize('SUPER_ADMIN', 'UNIVERSITY_ADMIN'),
  validatePagination,
  async (req, res) => {
    try {
      const prisma = getPrismaClient();
      const { page = 1, limit = 10, severity, type } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      let where = {};
      if (req.user.role === 'UNIVERSITY_ADMIN') {
        where.certificate = { institutionId: req.user.institutionId };
      }
      if (severity) where.severity = severity;
      if (type) where.type = type;

      const [anomalies, total] = await Promise.all([
        prisma.anomaly.findMany({
          where,
          skip,
          take,
          include: {
            certificate: {
              select: {
                certificateNumber: true,
                studentName: true,
                institution: { select: { name: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.anomaly.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          anomalies,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      logger.error('Get anomalies error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch anomalies' });
    }
  }
);

// @route   GET /api/admin/users
// @desc    Get users with pagination
// @access  Private (Super Admin only)
router.get('/users',
  authenticate,
  authorize('SUPER_ADMIN'),
  validatePagination,
  async (req, res) => {
    try {
      const prisma = getPrismaClient();
      const { page = 1, limit = 10, role, search } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      let where = {};
      if (role) where.role = role;
      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true,
            institution: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      logger.error('Get users error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
  }
);

// @route   GET /api/admin/blockchain/status
// @desc    Get blockchain network status and statistics
// @access  Private (Admin roles only)
router.get('/blockchain/status',
  authenticate,
  authorize('SUPER_ADMIN', 'UNIVERSITY_ADMIN'),
  async (req, res) => {
    try {
      const prisma = getPrismaClient();
      
      // Get blockchain network status
      const networkStatus = await blockchainService.getNetworkStatus();
      
      // Get blockchain statistics
      const [totalBlockchainCerts, recentBlockchainActivity] = await Promise.all([
        prisma.certificate.count({ where: { blockchainHash: { not: null } } }),
        prisma.certificate.findMany({
          where: { 
            blockchainHash: { not: null },
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          },
          select: { id: true, certificateNumber: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10
        })
      ]);

      res.json({
        success: true,
        data: {
          networkStatus,
          statistics: {
            totalBlockchainCertificates: totalBlockchainCerts,
            recentActivity: recentBlockchainActivity.length,
            recentCertificates: recentBlockchainActivity
          }
        }
      });
    } catch (error) {
      logger.error('Blockchain status error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch blockchain status' });
    }
  }
);

// @route   POST /api/admin/blockchain/verify-batch
// @desc    Batch verify certificates using blockchain
// @access  Private (Admin roles only)
router.post('/blockchain/verify-batch',
  authenticate,
  authorize('SUPER_ADMIN', 'UNIVERSITY_ADMIN'),
  async (req, res) => {
    try {
      const { certificateIds } = req.body;
      
      if (!certificateIds || !Array.isArray(certificateIds)) {
        return res.status(400).json({
          success: false,
          error: 'Certificate IDs array is required'
        });
      }

      const prisma = getPrismaClient();
      const results = [];

      for (const certId of certificateIds) {
        try {
          const certificate = await prisma.certificate.findUnique({
            where: { id: certId }
          });

          if (certificate && certificate.blockchainHash) {
            const validation = await blockchainService.validateCertificate(certificate.blockchainHash);
            results.push({
              certificateId: certId,
              certificateNumber: certificate.certificateNumber,
              isValid: validation.isValid,
              blockchainHash: certificate.blockchainHash
            });
          } else {
            results.push({
              certificateId: certId,
              error: 'Certificate not found or missing blockchain hash'
            });
          }
        } catch (error) {
          results.push({
            certificateId: certId,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        data: {
          totalProcessed: certificateIds.length,
          results
        }
      });
    } catch (error) {
      logger.error('Batch blockchain verification error:', error);
      res.status(500).json({ success: false, error: 'Batch verification failed' });
    }
  }
);

module.exports = router;