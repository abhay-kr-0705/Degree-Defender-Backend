const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');

let prisma = null;

const connectDB = async () => {
  try {
    if (!prisma) {
      prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        errorFormat: 'pretty',
      });

      // Test the connection
      await prisma.$connect();
      logger.info('✅ Database connected successfully');
    }
    return prisma;
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
};

const disconnectDB = async () => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    logger.info('🔌 Database disconnected');
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
