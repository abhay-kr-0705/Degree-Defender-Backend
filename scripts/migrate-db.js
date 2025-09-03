const { PrismaClient } = require('@prisma/client');
const { logger } = require('../src/utils/logger');

async function migrateDatabase() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    logger.info('🔄 Starting database migration...');
    
    // Test connection
    await prisma.$connect();
    logger.info('✅ Database connection established');
    
    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    logger.info(`📊 Found ${tables.length} tables in database`);
    
    if (tables.length === 0) {
      logger.info('🏗️ No tables found, database schema needs to be created');
      logger.info('Please run: npx prisma db push --force-reset');
    } else {
      logger.info('✅ Database schema exists');
      
      // Test basic operations
      const userCount = await prisma.user.count();
      logger.info(`👥 Found ${userCount} users in database`);
    }
    
  } catch (error) {
    logger.error('❌ Database migration failed:', {
      error: error.message,
      code: error.code,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    logger.info('🔌 Database connection closed');
  }
}

if (require.main === module) {
  migrateDatabase();
}

module.exports = { migrateDatabase };
