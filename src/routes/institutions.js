const express = require('express');
const { getPrismaClient } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateInstitution, validateId, validatePagination } = require('../middleware/validation');
const { logger, auditLogger } = require('../utils/logger');

const router = express.Router();

// @route   POST /api/institutions
// @desc    Create a new institution
// @access  Private (Super Admin only)
router.post('/', 
  authenticate,
  authorize('SUPER_ADMIN'),
  validateInstitution,
  async (req, res) => {
    try {
      const prisma = getPrismaClient();
      const institutionData = req.body;

      // Check if institution code already exists
      const existingInstitution = await prisma.institution.findUnique({
        where: { code: institutionData.code }
      });

      if (existingInstitution) {
        return res.status(400).json({
          success: false,
          error: 'Institution with this code already exists'
        });
      }

      // Generate API key for institution
      const crypto = require('crypto');
      const apiKey = crypto.randomBytes(32).toString('hex');

      const institution = await prisma.institution.create({
        data: {
          ...institutionData,
          apiKey
        }
      });

      // Log institution creation
      auditLogger.info('Institution created', {
        institutionId: institution.id,
        institutionCode: institution.code,
        createdBy: req.user.id,
        ip: req.ip
      });

      res.status(201).json({
        success: true,
        data: institution
      });
    } catch (error) {
      logger.error('Create institution error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create institution'
      });
    }
  }
);

// @route   GET /api/institutions
// @desc    Get institutions with pagination
// @access  Private
router.get('/', 
  authenticate,
  validatePagination,
  async (req, res) => {
    try {
      const prisma = getPrismaClient();
      const { page = 1, limit = 10, type, isActive, search } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      let where = {};
      
      // Role-based filtering
      if (req.user.role === 'UNIVERSITY_ADMIN') {
        where.id = req.user.institutionId;
      }

      // Apply filters
      if (type) where.type = type;
      if (isActive !== undefined) where.isActive = isActive === 'true';
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [institutions, total] = await Promise.all([
        prisma.institution.findMany({
          where,
          skip,
          take,
          include: {
            _count: {
              select: { 
                certificates: true,
                users: true,
                verifications: true
              }
            }
          },
          orderBy: { name: 'asc' }
        }),
        prisma.institution.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          institutions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      logger.error('Get institutions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch institutions'
      });
    }
  }
);

// @route   GET /api/institutions/:id
// @desc    Get institution by ID
// @access  Private
router.get('/:id', 
  authenticate,
  validateId,
  async (req, res) => {
    try {
      const prisma = getPrismaClient();
      const { id } = req.params;

      // Check access permissions
      if (req.user.role === 'UNIVERSITY_ADMIN' && req.user.institutionId !== id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const institution = await prisma.institution.findUnique({
        where: { id },
        include: {
          _count: {
            select: { 
              certificates: true,
              users: true,
              verifications: true
            }
          }
        }
      });

      if (!institution) {
        return res.status(404).json({
          success: false,
          error: 'Institution not found'
        });
      }

      res.json({
        success: true,
        data: institution
      });
    } catch (error) {
      logger.error('Get institution error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch institution'
      });
    }
  }
);

// @route   PUT /api/institutions/:id
// @desc    Update institution
// @access  Private (Super Admin, University Admin for own institution)
router.put('/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'UNIVERSITY_ADMIN'),
  validateId,
  async (req, res) => {
    try {
      const prisma = getPrismaClient();
      const { id } = req.params;
      const updateData = req.body;

      // Check permissions
      if (req.user.role === 'UNIVERSITY_ADMIN' && req.user.institutionId !== id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const institution = await prisma.institution.findUnique({
        where: { id }
      });

      if (!institution) {
        return res.status(404).json({
          success: false,
          error: 'Institution not found'
        });
      }

      // University admins can only update certain fields
      if (req.user.role === 'UNIVERSITY_ADMIN') {
        const allowedFields = ['name', 'address', 'city', 'phone', 'email', 'website'];
        updateData = Object.keys(updateData)
          .filter(key => allowedFields.includes(key))
          .reduce((obj, key) => {
            obj[key] = updateData[key];
            return obj;
          }, {});
      }

      const updatedInstitution = await prisma.institution.update({
        where: { id },
        data: updateData
      });

      // Log institution update
      auditLogger.info('Institution updated', {
        institutionId: id,
        updatedBy: req.user.id,
        changes: Object.keys(updateData),
        ip: req.ip
      });

      res.json({
        success: true,
        data: updatedInstitution
      });
    } catch (error) {
      logger.error('Update institution error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update institution'
      });
    }
  }
);

// @route   POST /api/institutions/:id/regenerate-api-key
// @desc    Regenerate API key for institution
// @access  Private (Super Admin only)
router.post('/:id/regenerate-api-key',
  authenticate,
  authorize('SUPER_ADMIN'),
  validateId,
  async (req, res) => {
    try {
      const prisma = getPrismaClient();
      const { id } = req.params;

      const institution = await prisma.institution.findUnique({
        where: { id }
      });

      if (!institution) {
        return res.status(404).json({
          success: false,
          error: 'Institution not found'
        });
      }

      // Generate new API key
      const crypto = require('crypto');
      const newApiKey = crypto.randomBytes(32).toString('hex');

      await prisma.institution.update({
        where: { id },
        data: { apiKey: newApiKey }
      });

      // Log API key regeneration
      auditLogger.info('Institution API key regenerated', {
        institutionId: id,
        regeneratedBy: req.user.id,
        ip: req.ip
      });

      res.json({
        success: true,
        data: { apiKey: newApiKey }
      });
    } catch (error) {
      logger.error('Regenerate API key error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to regenerate API key'
      });
    }
  }
);

module.exports = router;
