const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPrismaClient } = require('../config/database');
const { validateUserLogin, validateUserRegistration } = require('../middleware/validation');
const { logger, auditLogger } = require('../utils/logger');

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateUserLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const prisma = getPrismaClient();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { institution: true }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Log successful login
    auditLogger.info('User login successful', {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, role = 'PUBLIC' } = req.body;
    const prisma = getPrismaClient();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Log successful registration
    auditLogger.info('User registration successful', {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    logger.error('Registration error:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      prismaError: error.code || 'Unknown'
    });
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Invalid reference data provided'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

module.exports = router;