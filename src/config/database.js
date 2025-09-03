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

      logger.info('🔗 Connecting to Neon database...');
      
      prisma = new PrismaClient({
        log: ['error', 'warn'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
        errorFormat: 'pretty',
      });

      // Test the connection with retry logic
      let retries = 3;
      while (retries > 0) {
        try {
          await prisma.$connect();
          await prisma.$queryRaw`SELECT 1 as test`;
          logger.info('✅ Database connected successfully to Neon');
          break;
        } catch (error) {
          retries--;
          if (retries === 0) {
            logger.error('❌ All connection attempts failed');
            throw error;
          }
          logger.warn(`Database connection attempt failed, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    return prisma;
  } catch (error) {
    logger.error('❌ Database connection failed:', {
      message: error.message,
      code: error.code,
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

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing database connection...');
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing database connection...');
  await disconnectDB();
  process.exit(0);
});

module.exports = {
  connectDB,
  disconnectDB,
  getPrismaClient,
};
