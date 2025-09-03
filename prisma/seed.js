const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create system configuration
  const systemConfig = await prisma.systemConfig.upsert({
    where: { key: 'SYSTEM_INITIALIZED' },
    update: {},
    create: {
      key: 'SYSTEM_INITIALIZED',
      value: 'true',
      description: 'System initialization flag',
    },
  });

  // Create admin users with different roles for testing
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const verifierPassword = await bcrypt.hash('Verifier@123', 12);
  const universityPassword = await bcrypt.hash('University@123', 12);
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@degreedefenders.gov.in' },
    update: {},
    create: {
      email: 'admin@degreedefenders.gov.in',
      password: adminPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'SUPER_ADMIN',
      isActive: true,
      emailVerified: true,
    },
  });

  // Create Verifier account
  const verifierAdmin = await prisma.user.upsert({
    where: { email: 'verifier@degreedefenders.gov.in' },
    update: {},
    create: {
      email: 'verifier@degreedefenders.gov.in',
      password: verifierPassword,
      firstName: 'Certificate',
      lastName: 'Verifier',
      role: 'VERIFIER',
      isActive: true,
      emailVerified: true,
    },
  });

  // Create University Admin account
  const universityAdmin = await prisma.user.upsert({
    where: { email: 'university@degreedefenders.gov.in' },
    update: {},
    create: {
      email: 'university@degreedefenders.gov.in',
      password: universityPassword,
      firstName: 'University',
      lastName: 'Administrator',
      role: 'UNIVERSITY_ADMIN',
      isActive: true,
      emailVerified: true,
    },
  });

  // Create sample institutions
  const institutions = [
    {
      name: 'Ranchi University',
      code: 'RU001',
      type: 'UNIVERSITY',
      address: 'Ranchi, Jharkhand',
      city: 'Ranchi',
      state: 'Jharkhand',
      pincode: '834008',
      phone: '+91-651-2345678',
      email: 'admin@ranchiuniversity.ac.in',
      website: 'https://ranchiuniversity.ac.in',
      establishedYear: 1960,
      isVerified: true,
      isActive: true,
    },
    {
      name: 'Birla Institute of Technology',
      code: 'BIT001',
      type: 'TECHNICAL_INSTITUTE',
      address: 'Mesra, Ranchi, Jharkhand',
      city: 'Ranchi',
      state: 'Jharkhand',
      pincode: '835215',
      phone: '+91-651-2275444',
      email: 'admin@bitmesra.ac.in',
      website: 'https://bitmesra.ac.in',
      establishedYear: 1955,
      isVerified: true,
      isActive: true,
    },
    {
      name: 'Jharkhand University of Technology',
      code: 'JUT001',
      type: 'UNIVERSITY',
      address: 'Ranchi, Jharkhand',
      city: 'Ranchi',
      state: 'Jharkhand',
      pincode: '834004',
      phone: '+91-651-2234567',
      email: 'admin@jut.ac.in',
      website: 'https://jut.ac.in',
      establishedYear: 2009,
      isVerified: true,
      isActive: true,
    },
  ];

  for (const institutionData of institutions) {
    await prisma.institution.upsert({
      where: { code: institutionData.code },
      update: {},
      create: institutionData,
    });
  }

  // Create institution admin users
  const institutionAdmins = [
    {
      email: 'admin@ranchiuniversity.ac.in',
      firstName: 'Ranchi University',
      lastName: 'Admin',
      institutionCode: 'RU001',
    },
    {
      email: 'admin@bitmesra.ac.in',
      firstName: 'BIT Mesra',
      lastName: 'Admin',
      institutionCode: 'BIT001',
    },
    {
      email: 'admin@jut.ac.in',
      firstName: 'JUT',
      lastName: 'Admin',
      institutionCode: 'JUT001',
    },
  ];

  for (const adminData of institutionAdmins) {
    const institution = await prisma.institution.findUnique({
      where: { code: adminData.institutionCode },
    });

    if (institution) {
      await prisma.user.upsert({
        where: { email: adminData.email },
        update: {},
        create: {
          email: adminData.email,
          password: universityPassword,
          firstName: adminData.firstName,
          lastName: adminData.lastName,
          role: 'UNIVERSITY_ADMIN',
          institutionId: institution.id,
          isActive: true,
          emailVerified: true,
        },
      });
    }
  }

  // Create student user for testing
  const studentPassword = await bcrypt.hash('Student@123', 12);
  await prisma.user.upsert({
    where: { email: 'student@degreedefenders.gov.in' },
    update: {},
    create: {
      email: 'student@degreedefenders.gov.in',
      password: studentPassword,
      firstName: 'Test',
      lastName: 'Student',
      role: 'STUDENT',
      isActive: true,
      emailVerified: true,
    },
  });

  // Create sample certificates
  const ranchiuniversity = await prisma.institution.findUnique({
    where: { code: 'RU001' },
  });

  if (ranchiuniversity) {
    const sampleCertificates = [
      {
        certificateNumber: 'RU/2023/BSC/001',
        studentName: 'Rahul Kumar Singh',
        course: 'Bachelor of Science in Computer Science',
        passingYear: 2023,
        dateOfIssue: new Date('2023-06-15'),
        grade: 'First Class',
        type: 'DEGREE',
        institutionId: ranchiuniversity.id,
        status: 'VERIFIED',
        isLegacy: false,
      },
      {
        certificateNumber: 'RU/2022/MBA/045',
        studentName: 'Priya Sharma',
        course: 'Master of Business Administration',
        passingYear: 2022,
        dateOfIssue: new Date('2022-05-20'),
        grade: 'Distinction',
        type: 'DEGREE',
        institutionId: ranchiuniversity.id,
        status: 'VERIFIED',
        isLegacy: true,
      },
      {
        certificateNumber: 'RU/2023/BTECH/123',
        studentName: 'Amit Kumar',
        course: 'Bachelor of Technology in Information Technology',
        passingYear: 2023,
        dateOfIssue: new Date('2023-07-10'),
        grade: 'Second Class',
        type: 'DEGREE',
        institutionId: ranchiuniversity.id,
        status: 'PENDING',
        isLegacy: false,
      },
    ];

    for (const certData of sampleCertificates) {
      await prisma.certificate.upsert({
        where: { certificateNumber: certData.certificateNumber },
        update: {},
        create: certData,
      });
    }
  }

  // Create system configuration entries
  const configs = [
    {
      key: 'MAX_FILE_SIZE_MB',
      value: '10',
      description: 'Maximum file size for certificate uploads in MB',
    },
    {
      key: 'ALLOWED_FILE_TYPES',
      value: 'pdf,jpg,jpeg,png',
      description: 'Allowed file types for certificate uploads',
    },
    {
      key: 'VERIFICATION_EXPIRY_DAYS',
      value: '30',
      description: 'Number of days after which verification results expire',
    },
    {
      key: 'RATE_LIMIT_REQUESTS_PER_HOUR',
      value: '100',
      description: 'Maximum API requests per hour per IP',
    },
    {
      key: 'ENABLE_EMAIL_NOTIFICATIONS',
      value: 'true',
      description: 'Enable email notifications for verifications',
    },
    {
      key: 'ENABLE_SMS_NOTIFICATIONS',
      value: 'false',
      description: 'Enable SMS notifications for verifications',
    },
    {
      key: 'BLOCKCHAIN_NETWORK',
      value: 'polygon',
      description: 'Blockchain network for certificate validation',
    },
    {
      key: 'OCR_CONFIDENCE_THRESHOLD',
      value: '0.7',
      description: 'Minimum OCR confidence threshold for text extraction',
    },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }

  console.log('✅ Database seeding completed successfully!');
  console.log('\n📊 Seeded data summary:');
  console.log('\n🔐 ADMIN CREDENTIALS:');
  console.log('====================');
  console.log('📧 Super Admin:');
  console.log('   Email: admin@degreedefenders.gov.in');
  console.log('   Password: Admin@123');
  console.log('   Role: SUPER_ADMIN (Full system access)');
  console.log('');
  console.log('📧 Certificate Verifier:');
  console.log('   Email: verifier@degreedefenders.gov.in');
  console.log('   Password: Verifier@123');
  console.log('   Role: VERIFIER (Certificate verification)');
  console.log('');
  console.log('📧 University Admin:');
  console.log('   Email: university@degreedefenders.gov.in');
  console.log('   Password: University@123');
  console.log('   Role: UNIVERSITY_ADMIN (Institution management)');
  console.log('');
  console.log('📧 Student Account:');
  console.log('   Email: student@degreedefenders.gov.in');
  console.log('   Password: Student@123');
  console.log('   Role: STUDENT (Public verification)');
  console.log('');
  console.log('🏛️ Institution Admins:');
  console.log('   Email: admin@ranchiuniversity.ac.in');
  console.log('   Email: admin@bitmesra.ac.in');
  console.log('   Email: admin@jut.ac.in');
  console.log('   Password: University@123 (for all institution admins)');
  console.log('   Role: UNIVERSITY_ADMIN');
  console.log('');
  console.log(`📊 Seeded: ${institutions.length} institutions, ${institutionAdmins.length} institution admins, 3 certificates, ${configs.length + 1} configs`);
  console.log('\n⚠️  IMPORTANT: Change default passwords in production!');
  console.log('🔗 Frontend URL: https://degree-defenders-frontend.netlify.app');
  console.log('🔗 Backend URL: https://degree-defender-backend.onrender.com');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
