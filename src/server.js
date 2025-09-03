const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const certificateRoutes = require('./routes/certificates');
const verificationRoutes = require('./routes/verifications');
const institutionRoutes = require('./routes/institutions');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');

const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');
const { connectDB } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 10000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const { getPrismaClient } = require('./config/database');
    const prisma = getPrismaClient();
    
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      database: 'Connected',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'Service Unavailable',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      database: 'Disconnected',
      error: error.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/verifications', verificationRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Root route - API status
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Degree Defenders API',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      certificates: '/api/certificates',
      verifications: '/api/verifications',
      institutions: '/api/institutions',
      admin: '/api/admin',
      public: '/api/public'
    },
    documentation: 'https://github.com/abhay-kr-0705/Degree-Defender-Backend'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested endpoint ${req.originalUrl} does not exist.`,
    availableEndpoints: ['/health', '/api/auth', '/api/certificates', '/api/verifications', '/api/institutions', '/api/admin', '/api/public']
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, async () => {
  try {
    // Initialize database connection
    await connectDB();
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🔗 API Base URL: http://localhost:${PORT}/api`);
    logger.info(`🗄️ Database: ${process.env.DATABASE_URL ? 'Connected to Neon' : 'Not configured'}`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    logger.error('Database URL configured:', !!process.env.DATABASE_URL);
    process.exit(1);
  }
});

module.exports = app;
