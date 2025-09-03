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
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connection established');
    
    // Check if tables exist
    try {
      await prisma.user.findFirst();
      console.log('✅ Database schema already exists');
      return;
    } catch (error) {
      if (error.code === 'P2021' || error.message.includes('does not exist')) {
        console.log('📋 Database schema not found, creating...');
        
        // Read and execute SQL migration
        const sqlPath = path.join(__dirname, 'init-db.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Split SQL into individual statements and execute
        const statements = sql.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
          if (statement.trim()) {
            try {
              await prisma.$executeRawUnsafe(statement + ';');
            } catch (err) {
              if (!err.message.includes('already exists')) {
                console.warn('⚠️ SQL statement warning:', err.message);
              }
            }
          }
        }
        
        console.log('✅ Database schema created successfully');
      } else {
        throw error;
      }
    }
    
    // Verify schema
    const userCount = await prisma.user.count();
    console.log(`👥 Database ready with ${userCount} users`);
    
  } catch (error) {
    console.error('❌ Schema deployment failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  deploySchema();
}

module.exports = { deploySchema };
