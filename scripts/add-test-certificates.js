const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTestCertificates() {
  console.log('🔄 Adding test certificates to database...');

  try {
    // First, ensure we have an institution
    let institution = await prisma.institution.findFirst({
      where: { code: 'RU001' }
    });

    if (!institution) {
      // Create Ranchi University if it doesn't exist
      institution = await prisma.institution.create({
        data: {
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
        }
      });
      console.log('✅ Created Ranchi University');
    }

    // Test certificates with various formats for OCR testing
    const testCertificates = [
      {
        certificateNumber: 'RU/2023/BSC/001',
        studentName: 'Rahul Kumar Singh',
        course: 'Bachelor of Science in Computer Science',
        passingYear: 2023,
        dateOfIssue: new Date('2023-06-15'),
        grade: 'First Class',
        type: 'DEGREE',
        institutionId: institution.id,
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
        institutionId: institution.id,
        status: 'VERIFIED',
        isLegacy: false,
      },
      {
        certificateNumber: 'RU/2023/BTECH/123',
        studentName: 'Amit Kumar',
        course: 'Bachelor of Technology in Information Technology',
        passingYear: 2023,
        dateOfIssue: new Date('2023-07-10'),
        grade: 'Second Class',
        type: 'DEGREE',
        institutionId: institution.id,
        status: 'VERIFIED',
        isLegacy: false,
      },
      {
        certificateNumber: 'CERT001',
        studentName: 'John Doe',
        course: 'Computer Science',
        passingYear: 2023,
        dateOfIssue: new Date('2023-08-01'),
        grade: 'A+',
        type: 'DEGREE',
        institutionId: institution.id,
        status: 'VERIFIED',
        isLegacy: false,
      },
      {
        certificateNumber: '12345',
        studentName: 'Jane Smith',
        course: 'Engineering',
        passingYear: 2022,
        dateOfIssue: new Date('2022-12-15'),
        grade: 'First Class',
        type: 'DEGREE',
        institutionId: institution.id,
        status: 'VERIFIED',
        isLegacy: false,
      }
    ];

    let addedCount = 0;
    for (const certData of testCertificates) {
      try {
        const existingCert = await prisma.certificate.findUnique({
          where: { certificateNumber: certData.certificateNumber }
        });

        if (!existingCert) {
          await prisma.certificate.create({
            data: certData
          });
          console.log(`✅ Added certificate: ${certData.certificateNumber} - ${certData.studentName}`);
          addedCount++;
        } else {
          console.log(`ℹ️  Certificate already exists: ${certData.certificateNumber}`);
        }
      } catch (error) {
        console.error(`❌ Failed to add certificate ${certData.certificateNumber}:`, error.message);
      }
    }

    console.log(`\n🎉 Successfully added ${addedCount} test certificates!`);
    console.log('\n📋 Test Certificates Available for Verification:');
    console.log('================================================');
    
    const allCerts = await prisma.certificate.findMany({
      where: { status: 'VERIFIED' },
      include: { institution: true }
    });

    allCerts.forEach((cert, index) => {
      console.log(`\n${index + 1}. Certificate Number: ${cert.certificateNumber}`);
      console.log(`   Student Name: ${cert.studentName}`);
      console.log(`   Course: ${cert.course}`);
      console.log(`   Institution: ${cert.institution.name}`);
      console.log(`   Year: ${cert.passingYear}`);
      console.log(`   Status: ${cert.status} ✅`);
    });

    console.log('\n💡 You can now test verification with any of these certificates!');
    console.log('   Use manual verification or create images with these exact details.');

  } catch (error) {
    console.error('❌ Error adding test certificates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestCertificates();
