#!/usr/bin/env node

// Manual deployment script to run schema and seed directly
const { execSync } = require('child_process');
const path = require('path');

async function manualDeploy() {
  console.log('🚀 MANUAL DEPLOYMENT STARTING...');
  
  try {
    // Set working directory
    const projectRoot = path.join(__dirname, '..');
    process.chdir(projectRoot);
    
    console.log('📍 Working directory:', process.cwd());
    console.log('🔗 Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
    // Step 1: Force deploy schema
    console.log('\n🔧 Step 1: Deploying database schema...');
    execSync('node scripts/force-deploy-schema.js', { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    // Step 2: Wait a moment
    console.log('\n⏳ Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 3: Seed database
    console.log('\n🌱 Step 2: Seeding database...');
    execSync('node prisma/seed.js', { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    console.log('\n✅ MANUAL DEPLOYMENT COMPLETED SUCCESSFULLY!');
    console.log('\n🎉 Your database is ready with admin accounts:');
    console.log('- Super Admin: admin@degreedefenders.gov.in (Admin@123)');
    console.log('- Verifier: verifier@degreedefenders.gov.in (Verifier@123)');
    console.log('- University Admin: university@degreedefenders.gov.in (University@123)');
    
  } catch (error) {
    console.error('💥 MANUAL DEPLOYMENT FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  manualDeploy();
}

module.exports = { manualDeploy };
