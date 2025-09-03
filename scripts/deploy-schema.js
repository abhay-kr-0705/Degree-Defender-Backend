const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function deploySchema() {
  // Validate DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔗 Using database:', process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@'));

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    console.log('🔄 Starting database schema deployment...');
    
    // Connect to database with retry
    let connected = false;
    for (let i = 0; i < 3; i++) {
      try {
        await prisma.$connect();
        connected = true;
        console.log('✅ Connected to database');
        break;
      } catch (error) {
        console.log(`⚠️ Connection attempt ${i + 1} failed, retrying...`);
        if (i === 2) throw error;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (!connected) {
      throw new Error('Failed to connect to database after 3 attempts');
    }

    // Check if schema already exists
    let existingTables = [];
    try {
      existingTables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'institutions', 'certificates')
      `;
    } catch (error) {
      console.log('⚠️ Could not check existing tables, proceeding with deployment');
    }

    if (existingTables.length >= 3) {
      console.log('✅ Database schema already exists, skipping deployment');
      return;
    }

    console.log(`⚠️ Found ${existingTables.length}/3 core tables, deploying schema...`);

    // Read SQL file
    const sqlPath = path.join(__dirname, 'init-db.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL file not found: ${sqlPath}`);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log('📄 SQL file loaded, executing...');

    // Split SQL into individual statements and execute
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      try {
        await prisma.$executeRawUnsafe(statements[i]);
        if (i % 10 === 0) {
          console.log(`  ✓ Executed ${i + 1}/${statements.length} statements`);
        }
      } catch (error) {
        // Ignore "already exists" errors
        if (error.message.includes('already exists')) {
          console.log(`  ⚠️ Skipping existing: ${error.message.split('\n')[0]}`);
          continue;
        }
        throw error;
      }
    }

    console.log('✅ Database schema deployed successfully');

    // Verify deployment
    const verifyTables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log(`✅ Verification: ${verifyTables.length} tables created`);
    verifyTables.forEach(table => console.log(`  - ${table.table_name}`));

    // Test a simple query on users table
    try {
      const userCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM users`;
      console.log(`✅ Users table accessible, count: ${userCount[0].count}`);
    } catch (error) {
      console.log('⚠️ Users table test failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Schema deployment failed:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    try {
      await prisma.$disconnect();
      console.log('🔌 Database connection closed');
    } catch (error) {
      console.log('⚠️ Warning during disconnect:', error.message);
    }
  }
}

if (require.main === module) {
  deploySchema();
}

module.exports = { deploySchema };
