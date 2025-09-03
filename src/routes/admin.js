const express = require('express');
const { getPrismaClient } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');
const blockchainService = require('../services/blockchainService');
const anomalyDetectionService = require('../services/anomalyDetectionService');
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

// @route   GET /api/admin/forgery-trends
// @desc    Get comprehensive forgery trend analysis
// @access  Private (Admin roles only)
router.get('/forgery-trends',
  authenticate,
  authorize('SUPER_ADMIN', 'UNIVERSITY_ADMIN'),
  async (req, res) => {
    try {
      const prisma = getPrismaClient();
      const { timeframe = '30d', institutionId } = req.query;

      const now = new Date();
      let startDate;
      switch (timeframe) {
        case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
        case '1y': startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
        default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      let whereClause = { createdAt: { gte: startDate } };
      if (req.user.role === 'UNIVERSITY_ADMIN') {
        whereClause.certificate = { institutionId: req.user.institutionId };
      } else if (institutionId) {
        whereClause.certificate = { institutionId };
      }

      // Get anomaly trends by type
      const anomalyTrends = await prisma.anomaly.groupBy({
        by: ['type', 'severity'],
        where: whereClause,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      });

      // Get daily anomaly counts for trend chart
      const dailyAnomalies = await prisma.$queryRaw`
        SELECT DATE(created_at) as date, COUNT(*) as count, severity
        FROM anomalies 
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at), severity
        ORDER BY date DESC
      `;

      // Get top institutions with most anomalies
      const institutionAnomalies = await prisma.anomaly.groupBy({
        by: ['certificate'],
        where: whereClause,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      });

      // Get most common forgery patterns
      const forgeryPatterns = anomalyTrends.reduce((acc, anomaly) => {
        const existing = acc.find(p => p.type === anomaly.type);
        if (existing) {
          existing.count += anomaly._count.id;
        } else {
          acc.push({ type: anomaly.type, count: anomaly._count.id });
        }
        return acc;
      }, []).sort((a, b) => b.count - a.count);

      // Calculate risk metrics
      const totalAnomalies = anomalyTrends.reduce((sum, a) => sum + a._count.id, 0);
      const criticalAnomalies = anomalyTrends
        .filter(a => a.severity === 'CRITICAL')
        .reduce((sum, a) => sum + a._count.id, 0);
      
      const riskScore = totalAnomalies > 0 ? Math.round((criticalAnomalies / totalAnomalies) * 100) : 0;

      res.json({
        success: true,
        data: {
          summary: {
            totalAnomalies,
            criticalAnomalies,
            riskScore,
            riskLevel: anomalyDetectionService.getRiskLevel(riskScore),
            timeframe
          },
          trends: {
            byType: anomalyTrends,
            daily: dailyAnomalies,
            patterns: forgeryPatterns
          },
          institutions: institutionAnomalies
        }
      });
    } catch (error) {
      logger.error('Forgery trends error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch forgery trends' });
    }
  }
);

// @route   GET /api/admin/blacklist
// @desc    Get blacklisted entities
// @access  Private (Admin roles only)
router.get('/blacklist',
  authenticate,
  authorize('SUPER_ADMIN', 'UNIVERSITY_ADMIN'),
  validatePagination,
  async (req, res) => {
    try {
      const prisma = getPrismaClient();
      const { page = 1, limit = 10, type, search } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      let where = { isActive: true };
      if (type) where.type = type;
      if (search) {
        where.OR = [
          { identifier: { contains: search, mode: 'insensitive' } },
          { reason: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [blacklistedEntities, total] = await Promise.all([
        prisma.blacklistedEntity.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.blacklistedEntity.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          blacklistedEntities,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      logger.error('Get blacklist error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch blacklist' });
    }
  }
);

// @route   POST /api/admin/blacklist
// @desc    Add entity to blacklist
// @access  Private (Super Admin only)
router.post('/blacklist',
  authenticate,
  authorize('SUPER_ADMIN'),
  async (req, res) => {
    try {
      const { type, identifier, reason } = req.body;

      if (!type || !identifier || !reason) {
        return res.status(400).json({
          success: false,
          error: 'Type, identifier, and reason are required'
        });
      }

      const validTypes = ['INSTITUTION', 'CERTIFICATE', 'USER', 'IP'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
        });
      }

      const prisma = getPrismaClient();

      // Check if already blacklisted
      const existing = await prisma.blacklistedEntity.findFirst({
        where: { type, identifier, isActive: true }
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Entity is already blacklisted'
        });
      }

      const blacklistedEntity = await prisma.blacklistedEntity.create({
        data: { type, identifier, reason }
      });

      // Log blacklist action
      auditLogger.info('Entity blacklisted', {
        entityId: blacklistedEntity.id,
        type,
        identifier,
        reason,
        userId: req.user.id,
        ip: req.ip
      });

      res.status(201).json({
        success: true,
        data: blacklistedEntity
      });
    } catch (error) {
      logger.error('Add to blacklist error:', error);
      res.status(500).json({ success: false, error: 'Failed to add to blacklist' });
    }
  }
);

// @route   DELETE /api/admin/blacklist/:id
// @desc    Remove entity from blacklist
// @access  Private (Super Admin only)
router.delete('/blacklist/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const prisma = getPrismaClient();

      const blacklistedEntity = await prisma.blacklistedEntity.findUnique({
        where: { id }
      });

      if (!blacklistedEntity) {
        return res.status(404).json({
          success: false,
          error: 'Blacklisted entity not found'
        });
      }

      await prisma.blacklistedEntity.update({
        where: { id },
        data: { isActive: false }
      });

      // Log removal action
      auditLogger.info('Entity removed from blacklist', {
        entityId: id,
        type: blacklistedEntity.type,
        identifier: blacklistedEntity.identifier,
        userId: req.user.id,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Entity removed from blacklist'
      });
    } catch (error) {
      logger.error('Remove from blacklist error:', error);
      res.status(500).json({ success: false, error: 'Failed to remove from blacklist' });
    }
  }
);

// @route   GET /api/admin/analytics/summary
// @desc    Get comprehensive analytics summary
// @access  Private (Admin roles only)
router.get('/analytics/summary',
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

      const [certificateStats, verificationStats, anomalyStats] = await Promise.all([
        // Certificate statistics
        prisma.certificate.groupBy({
          by: ['status'],
          where: whereClause,
          _count: { id: true }
        }),
        // Verification statistics
        prisma.verification.groupBy({
          by: ['status'],
          where: { createdAt: { gte: startDate } },
          _count: { id: true }
        }),
        // Anomaly statistics
        prisma.anomaly.groupBy({
          by: ['severity'],
          where: { createdAt: { gte: startDate } },
          _count: { id: true }
        })
      ]);

      // Calculate success rates
      const totalVerifications = verificationStats.reduce((sum, v) => sum + v._count.id, 0);
      const successfulVerifications = verificationStats
        .filter(v => v.status === 'COMPLETED')
        .reduce((sum, v) => sum + v._count.id, 0);
      
      const successRate = totalVerifications > 0 ? 
        Math.round((successfulVerifications / totalVerifications) * 100) : 0;

      res.json({
        success: true,
        data: {
          certificates: certificateStats,
          verifications: {
            stats: verificationStats,
            successRate,
            total: totalVerifications
          },
          anomalies: anomalyStats,
          timeframe
        }
      });
    } catch (error) {
      logger.error('Analytics summary error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch analytics summary' });
    }
  }
);

module.exports = router;