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
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'https://degree-defender-frontend.vercel.app',
      'https://degree-defenders-frontend.vercel.app',
      'https://degree-defender-frontend.netlify.app',
      'https://degree-defenders-frontend.netlify.app'
    ];
    
    // Add origins from environment variable
    if (process.env.CORS_ORIGIN) {
      const envOrigins = process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
      allowedOrigins.push(...envOrigins);
    }
    
    logger.info(`CORS check for origin: ${origin}`);
    logger.info(`Allowed origins: ${allowedOrigins.join(', ')}`);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      logger.info(`CORS allowed for origin: ${origin}`);
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

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

// API base route - show available endpoints
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Degree Defenders API - Available Endpoints',
    version: '1.0.0',
    endpoints: {
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
