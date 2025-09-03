const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');

let prisma = null;

const connectDB = async () => {
  try {
    if (!prisma) {
      // Validate DATABASE_URL exists
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not set');
      }

      prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        errorFormat: 'pretty',
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });

      // Test the connection with retry logic and connection pooling
      let retries = 5;
      while (retries > 0) {
        try {
          await prisma.$connect();
          await prisma.$queryRaw`SELECT 1`;
          logger.info('✅ Database connected successfully');
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          logger.warn(`Database connection attempt failed, retrying... (${retries} attempts left)`);
          
          // Disconnect before retry to avoid connection pool issues
          try {
            await prisma.$disconnect();
          } catch (disconnectError) {
            // Ignore disconnect errors during retry
          }
          
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }
    return prisma;
  } catch (error) {
    logger.error('❌ Database connection failed:', {
      error: error.message,
      stack: error.stack,
      databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set'
    });
    throw error;
  }
};

const disconnectDB = async () => {
  if (prisma) {
    try {
      await prisma.$disconnect();
      prisma = null;
      logger.info('🔌 Database disconnected');
    } catch (error) {
      logger.warn('Warning during disconnect:', error.message);
      prisma = null;
    }
  }
};

const getPrismaClient = () => {
  if (!prisma) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return prisma;
};

module.exports = {
  connectDB,
  disconnectDB,
  getPrismaClient,
};
