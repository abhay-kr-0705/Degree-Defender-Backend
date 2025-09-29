const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { logger } = require('../utils/logger');

class CertificateGenerationService {
  constructor() {
    this.templatesDir = path.join(process.cwd(), 'templates', 'certificates');
    this.outputDir = path.join(process.cwd(), 'generated', 'certificates');
  }

  /**
   * Generate a complete certificate PDF with QR code, digital signature, and watermark
   * @param {Object} certificateData - Certificate information
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated certificate details
   */
  async generateCertificate(certificateData, options = {}) {
    try {
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Generate unique filename
      const filename = `cert_${certificateData.certificateNumber.replace(/\//g, '_')}_${Date.now()}.pdf`;
      const filepath = path.join(this.outputDir, filename);

      // Generate certificate fingerprint (SHA-256 hash)
      const fingerprint = this.generateCertificateFingerprint(certificateData);

      // Generate QR code data
      const qrData = JSON.stringify({
        certificateNumber: certificateData.certificateNumber,
        studentName: certificateData.studentName,
        course: certificateData.course,
        institution: certificateData.institution?.name || certificateData.institutionName,
        passingYear: certificateData.passingYear,
        dateOfIssue: certificateData.dateOfIssue,
        fingerprint: fingerprint,
        blockchainHash: certificateData.blockchainHash,
        verificationUrl: `${process.env.FRONTEND_URL}/verify?cert=${certificateData.certificateNumber}`
      });

      // Generate QR code as buffer
      const qrCodeBuffer = await QRCode.toBuffer(qrData, {
        errorCorrectionLevel: 'H',
        type: 'png',
        width: 200,
        margin: 1
      });

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `Certificate - ${certificateData.certificateNumber}`,
          Author: certificateData.institution?.name || 'Degree Defenders',
          Subject: 'Academic Certificate',
          Keywords: 'certificate, degree, academic, verification',
          Creator: 'Degree Defenders Certificate System'
        }
      });

      // Pipe to file
      const writeStream = require('fs').createWriteStream(filepath);
      doc.pipe(writeStream);

      // Add digital watermark (invisible)
      await this.addDigitalWatermark(doc, certificateData, fingerprint);

      // Render certificate based on type
      if (certificateData.type === 'DEGREE') {
        await this.renderDegreeCertificate(doc, certificateData, qrCodeBuffer, fingerprint);
      } else if (certificateData.type === 'DIPLOMA') {
        await this.renderDiplomaCertificate(doc, certificateData, qrCodeBuffer, fingerprint);
      } else if (certificateData.type === 'MARKSHEET') {
        await this.renderMarksheetCertificate(doc, certificateData, qrCodeBuffer, fingerprint);
      } else {
        await this.renderGenericCertificate(doc, certificateData, qrCodeBuffer, fingerprint);
      }

      // Finalize PDF
      doc.end();

      // Wait for file to be written
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      logger.info(`Certificate generated: ${filename}`);

      return {
        filename,
        filepath,
        fingerprint,
        qrData,
        size: (await fs.stat(filepath)).size,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Certificate generation error:', error);
      throw new Error(`Failed to generate certificate: ${error.message}`);
    }
  }

  /**
   * Generate multi-layer certificate fingerprint using SHA-256
   */
  generateCertificateFingerprint(certificateData) {
    const fingerprintData = {
      certificateNumber: certificateData.certificateNumber,
      studentName: certificateData.studentName,
      fatherName: certificateData.fatherName,
      motherName: certificateData.motherName,
      rollNumber: certificateData.rollNumber,
      registrationNumber: certificateData.registrationNumber,
      course: certificateData.course,
      branch: certificateData.branch,
      passingYear: certificateData.passingYear,
      grade: certificateData.grade,
      cgpa: certificateData.cgpa,
      percentage: certificateData.percentage,
      dateOfIssue: certificateData.dateOfIssue,
      institutionId: certificateData.institutionId,
      type: certificateData.type,
      blockchainHash: certificateData.blockchainHash,
      timestamp: Date.now()
    };

    // Create multi-layer hash
    const dataString = JSON.stringify(fingerprintData);
    const hash1 = crypto.createHash('sha256').update(dataString).digest('hex');
    const hash2 = crypto.createHash('sha256').update(hash1 + certificateData.certificateNumber).digest('hex');
    
    return hash2;
  }

  /**
   * Add invisible digital watermark to PDF
   */
  async addDigitalWatermark(doc, certificateData, fingerprint) {
    // Add invisible metadata watermark
    doc.info['Fingerprint'] = fingerprint;
    doc.info['CertificateNumber'] = certificateData.certificateNumber;
    doc.info['GeneratedBy'] = 'Degree Defenders v1.0';
    doc.info['SecurityLevel'] = 'High';
    
    // Add visible watermark (semi-transparent)
    doc.save();
    doc.opacity(0.05);
    doc.fontSize(60)
       .fillColor('#000000')
       .text('VERIFIED', 100, 400, {
         align: 'center',
         width: 400,
         rotate: -45
       });
    doc.restore();
  }

  /**
   * Render Degree Certificate
   */
  async renderDegreeCertificate(doc, data, qrCodeBuffer, fingerprint) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Border
    doc.rect(30, 30, pageWidth - 60, pageHeight - 60)
       .lineWidth(3)
       .stroke('#1e40af');

    doc.rect(35, 35, pageWidth - 70, pageHeight - 70)
       .lineWidth(1)
       .stroke('#1e40af');

    // Institution Logo/Header
    doc.fontSize(24)
       .fillColor('#1e40af')
       .font('Helvetica-Bold')
       .text(data.institution?.name || 'University Name', 50, 70, {
         align: 'center',
         width: pageWidth - 100
       });

    doc.fontSize(12)
       .fillColor('#666666')
       .font('Helvetica')
       .text('(Established under State Act)', 50, 105, {
         align: 'center',
         width: pageWidth - 100
       });

    // Certificate Title
    doc.fontSize(28)
       .fillColor('#1e40af')
       .font('Helvetica-Bold')
       .text('DEGREE CERTIFICATE', 50, 160, {
         align: 'center',
         width: pageWidth - 100
       });

    // Certificate Number
    doc.fontSize(11)
       .fillColor('#000000')
       .font('Helvetica')
       .text(`Certificate No: ${data.certificateNumber}`, 50, 200, {
         align: 'center',
         width: pageWidth - 100
       });

    // Main Content
    const contentY = 250;
    doc.fontSize(14)
       .fillColor('#000000')
       .font('Helvetica')
       .text('This is to certify that', 50, contentY, {
         align: 'center',
         width: pageWidth - 100
       });

    doc.fontSize(20)
       .fillColor('#1e40af')
       .font('Helvetica-Bold')
       .text(data.studentName.toUpperCase(), 50, contentY + 30, {
         align: 'center',
         width: pageWidth - 100
       });

    doc.fontSize(12)
       .fillColor('#000000')
       .font('Helvetica')
       .text(`Son/Daughter of ${data.fatherName}`, 50, contentY + 60, {
         align: 'center',
         width: pageWidth - 100
       });

    doc.text(`Roll No: ${data.rollNumber} | Registration No: ${data.registrationNumber}`, 50, contentY + 80, {
      align: 'center',
      width: pageWidth - 100
    });

    doc.fontSize(14)
       .text('has successfully completed the requirements for', 50, contentY + 110, {
         align: 'center',
         width: pageWidth - 100
       });

    doc.fontSize(18)
       .fillColor('#1e40af')
       .font('Helvetica-Bold')
       .text(data.course, 50, contentY + 140, {
         align: 'center',
         width: pageWidth - 100
       });

    if (data.branch) {
      doc.fontSize(14)
         .fillColor('#000000')
         .font('Helvetica')
         .text(`Specialization: ${data.branch}`, 50, contentY + 170, {
           align: 'center',
           width: pageWidth - 100
         });
    }

    // Grade Information
    let gradeText = '';
    if (data.grade) gradeText += `Grade: ${data.grade}`;
    if (data.cgpa) gradeText += ` | CGPA: ${data.cgpa}`;
    if (data.percentage) gradeText += ` | Percentage: ${data.percentage}%`;

    if (gradeText) {
      doc.fontSize(12)
         .text(gradeText, 50, contentY + 200, {
           align: 'center',
           width: pageWidth - 100
         });
    }

    doc.fontSize(14)
       .text(`in the year ${data.passingYear}`, 50, contentY + 230, {
         align: 'center',
         width: pageWidth - 100
       });

    // Date of Issue
    const issueDate = new Date(data.dateOfIssue).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    doc.fontSize(12)
       .text(`Date of Issue: ${issueDate}`, 50, contentY + 260, {
         align: 'center',
         width: pageWidth - 100
       });

    // QR Code
    doc.image(qrCodeBuffer, pageWidth - 150, pageHeight - 200, {
      width: 100,
      height: 100
    });

    doc.fontSize(8)
       .fillColor('#666666')
       .text('Scan to Verify', pageWidth - 150, pageHeight - 90, {
         width: 100,
         align: 'center'
       });

    // Digital Signature Section
    doc.fontSize(10)
       .fillColor('#000000')
       .font('Helvetica-Bold')
       .text('Authorized Signatory', 80, pageHeight - 150);

    doc.fontSize(8)
       .fillColor('#666666')
       .font('Helvetica')
       .text('Registrar/Controller of Examinations', 80, pageHeight - 130);

    // Security Features
    doc.fontSize(7)
       .fillColor('#999999')
       .text(`Security Hash: ${fingerprint.substring(0, 32)}...`, 50, pageHeight - 70);

    if (data.blockchainHash) {
      doc.text(`Blockchain: ${data.blockchainHash.substring(0, 32)}...`, 50, pageHeight - 55);
    }

    doc.text('This is a digitally generated and verified certificate', 50, pageHeight - 40, {
      align: 'center',
      width: pageWidth - 100
    });
  }

  /**
   * Render Diploma Certificate
   */
  async renderDiplomaCertificate(doc, data, qrCodeBuffer, fingerprint) {
    // Similar to degree but with diploma-specific formatting
    await this.renderDegreeCertificate(doc, data, qrCodeBuffer, fingerprint);
    // Customize title
    doc.fontSize(28)
       .fillColor('#1e40af')
       .font('Helvetica-Bold')
       .text('DIPLOMA CERTIFICATE', 50, 160, {
         align: 'center',
         width: doc.page.width - 100
       });
  }

  /**
   * Render Marksheet Certificate
   */
  async renderMarksheetCertificate(doc, data, qrCodeBuffer, fingerprint) {
    // Marksheet with detailed grades
    await this.renderDegreeCertificate(doc, data, qrCodeBuffer, fingerprint);
    // Customize title
    doc.fontSize(28)
       .fillColor('#1e40af')
       .font('Helvetica-Bold')
       .text('MARKSHEET', 50, 160, {
         align: 'center',
         width: doc.page.width - 100
       });
  }

  /**
   * Render Generic Certificate
   */
  async renderGenericCertificate(doc, data, qrCodeBuffer, fingerprint) {
    await this.renderDegreeCertificate(doc, data, qrCodeBuffer, fingerprint);
  }

  /**
   * Verify certificate fingerprint
   */
  verifyCertificateFingerprint(certificateData, providedFingerprint) {
    const calculatedFingerprint = this.generateCertificateFingerprint(certificateData);
    return calculatedFingerprint === providedFingerprint;
  }

  /**
   * Extract metadata from generated PDF
   */
  async extractPDFMetadata(filepath) {
    try {
      // This would use pdf-parse or similar library
      // For now, return basic info
      const stats = await fs.stat(filepath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      logger.error('PDF metadata extraction error:', error);
      return null;
    }
  }
}

module.exports = new CertificateGenerationService();
