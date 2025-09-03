#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_Vn2AteHPuN7B@ep-wild-resonance-a1cqzct2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
  
  console.log('🔄 Testing Neon database connection...');
  console.log('🔗 Database URL:', DATABASE_URL.replace(/:[^:@]*@/, ':***@'));

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL,
      },
    },
  });

  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Connection established');

    // Test basic query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query test passed:', result);

    // Test database info
    const dbInfo = await prisma.$queryRaw`SELECT version() as version, current_database() as database`;
    console.log('✅ Database info:', dbInfo[0]);

    console.log('🎉 All connection tests passed!');

  } catch (error) {
    console.error('❌ Connection test failed:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Connection closed');
  }
}

testConnection();
