const { PrismaClient } = require('@prisma/client');

async function checkConnectionHealth() {
  // Validate DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔗 Testing connection to:', process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@'));

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    console.log('🔄 Testing database connection health...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Basic connection established');
    
    // Test query execution
    const result = await prisma.$queryRaw`SELECT NOW() as current_time, version() as db_version`;
    console.log('✅ Query execution successful:', result[0]);
    
    // Test connection pool
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(prisma.$queryRaw`SELECT ${i} as test_query`);
    }
    
    await Promise.all(promises);
    console.log('✅ Connection pool test passed');
    
    // Test table existence
    try {
      const tableCheck = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'institutions', 'certificates')
      `;
      console.log(`✅ Found ${tableCheck.length} core tables`);
    } catch (error) {
      console.log('⚠️ Schema check failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Connection health check failed:', {
      error: error.message,
      code: error.code,
      meta: error.meta
    });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Connection closed');
  }
}

if (require.main === module) {
  checkConnectionHealth();
}

module.exports = { checkConnectionHealth };
