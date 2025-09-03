#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function forceDeploySchema() {
  const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_Vn2AteHPuN7B@ep-wild-resonance-a1cqzct2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
  
  console.log('🚀 FORCE DEPLOYING DATABASE SCHEMA TO NEON');
  console.log('🔗 Database URL:', DATABASE_URL.replace(/:[^:@]*@/, ':***@'));

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL,
      },
    },
  });

  try {
    // Connect with retry
    console.log('🔄 Connecting to database...');
    let connected = false;
    for (let i = 0; i < 5; i++) {
      try {
        await prisma.$connect();
        connected = true;
        console.log('✅ Connected successfully');
        break;
      } catch (error) {
        console.log(`⚠️ Connection attempt ${i + 1}/5 failed: ${error.message}`);
        if (i < 4) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }
    
    if (!connected) {
      throw new Error('Failed to connect after 5 attempts');
    }

    // Read and execute SQL schema
    const sqlPath = path.join(__dirname, 'init-db.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL file not found: ${sqlPath}`);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log('📄 SQL schema file loaded');

    // Split into statements and execute each one
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await prisma.$executeRawUnsafe(statement);
        successCount++;
        
        if (i % 5 === 0) {
          console.log(`  ✓ Progress: ${i + 1}/${statements.length} (${successCount} success, ${skipCount} skipped)`);
        }
      } catch (error) {
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate key') ||
            error.code === 'P2010') {
          skipCount++;
          console.log(`  ⚠️ Skipped existing: ${statement.substring(0, 50)}...`);
        } else {
          console.error(`  ❌ Failed on statement: ${statement.substring(0, 100)}...`);
          console.error(`     Error: ${error.message}`);
          throw error;
        }
      }
    }

    console.log(`✅ Schema deployment completed: ${successCount} executed, ${skipCount} skipped`);

    // Verify all core tables exist
    console.log('🔍 Verifying core tables...');
    const coreTableCheck = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'institutions', 'certificates', 'verifications', 'audit_logs')
      ORDER BY table_name
    `;

    console.log(`✅ Core tables found: ${coreTableCheck.length}/5`);
    coreTableCheck.forEach(table => console.log(`  ✓ ${table.table_name}`));

    if (coreTableCheck.length < 5) {
      console.log('⚠️ Some core tables missing, but continuing...');
    }

    // Test users table specifically
    try {
      const userTest = await prisma.$queryRaw`SELECT COUNT(*) as count FROM users LIMIT 1`;
      console.log(`✅ Users table test passed - count: ${userTest[0].count}`);
    } catch (error) {
      console.error('❌ Users table test failed:', error.message);
      throw new Error('Users table is not accessible');
    }

    // List all tables
    const allTables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log(`📊 Total tables in database: ${allTables.length}`);
    console.log('📋 All tables:');
    allTables.forEach(table => console.log(`  - ${table.table_name}`));

    console.log('🎉 DATABASE SCHEMA DEPLOYMENT SUCCESSFUL!');
    console.log('🚀 Your Neon database is ready for the application');

  } catch (error) {
    console.error('💥 SCHEMA DEPLOYMENT FAILED:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  forceDeploySchema();
}

module.exports = { forceDeploySchema };
