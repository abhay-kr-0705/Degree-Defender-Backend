const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const { getPrismaClient } = require('../config/database');
const blockchainService = require('./blockchainService');
const anomalyDetectionService = require('./anomalyDetectionService');
const { logger } = require('../utils/logger');
const { createReadStream } = require('fs');

class BulkUploadService {
  constructor() {
    this.requiredFields = [
      'certificateNumber',
      'studentName',
      'course',
      'passingYear'
    ];
    
    this.optionalFields = [
      'fatherName',
      'motherName',
      'rollNumber',
      'registrationNumber',
      'branch',
      'grade',
      'cgpa',
      'percentage',
      'dateOfIssue',
      'dateOfCompletion',
      'type'
    ];
  }

  async processBulkUpload(filePath, fileName, institutionId, userId) {
    try {
      logger.info(`Starting bulk upload processing: ${fileName}`);
      
      // Parse file based on extension
      const fileExt = path.extname(fileName).toLowerCase();
      let records = [];
      
      if (fileExt === '.csv') {
        records = await this.parseCSV(filePath);
      } else if (fileExt === '.xlsx' || fileExt === '.xls') {
        records = await this.parseExcel(filePath);
      } else {
        throw new Error('Unsupported file format');
      }

      // Validate and process records
      const result = await this.processRecords(records, institutionId, userId);
      
      logger.info(`Bulk upload completed: ${result.successfulUploads}/${result.totalRecords} successful`);
      
      return result;
    } catch (error) {
      logger.error('Bulk upload processing error:', error);
      throw error;
    }
  }

  async parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const records = [];
      
      createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          // Clean and normalize field names
          const cleanedRow = {};
          for (const [key, value] of Object.entries(row)) {
            const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '');
            cleanedRow[this.mapFieldName(cleanKey)] = value?.trim();
          }
          records.push(cleanedRow);
        })
        .on('end', () => {
          logger.info(`Parsed ${records.length} records from CSV`);
          resolve(records);
        })
        .on('error', (error) => {
          logger.error('CSV parsing error:', error);
          reject(error);
        });
    });
  }

  async parseExcel(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        throw new Error('Excel file must contain at least a header row and one data row');
      }

      const headers = jsonData[0].map(header => 
        this.mapFieldName(header.toString().trim().toLowerCase().replace(/\s+/g, ''))
      );
      
      const records = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const record = {};
        
        headers.forEach((header, index) => {
          if (row[index] !== undefined && row[index] !== null) {
            record[header] = row[index].toString().trim();
          }
        });
        
        // Skip empty rows
        if (Object.keys(record).length > 0) {
          records.push(record);
        }
      }

      logger.info(`Parsed ${records.length} records from Excel`);
      return records;
    } catch (error) {
      logger.error('Excel parsing error:', error);
      throw error;
    }
  }

  mapFieldName(fieldName) {
    const fieldMapping = {
      'certificatenumber': 'certificateNumber',
      'certno': 'certificateNumber',
      'certnum': 'certificateNumber',
      'studentname': 'studentName',
      'name': 'studentName',
      'candidatename': 'studentName',
      'fathername': 'fatherName',
      'father': 'fatherName',
      'mothername': 'motherName',
      'mother': 'motherName',
      'rollnumber': 'rollNumber',
      'rollno': 'rollNumber',
      'roll': 'rollNumber',
      'registrationnumber': 'registrationNumber',
      'regno': 'registrationNumber',
      'regnum': 'registrationNumber',
      'course': 'course',
      'degree': 'course',
      'program': 'course',
      'branch': 'branch',
      'specialization': 'branch',
      'stream': 'branch',
      'passingyear': 'passingYear',
      'year': 'passingYear',
      'graduationyear': 'passingYear',
      'grade': 'grade',
      'class': 'grade',
      'division': 'grade',
      'cgpa': 'cgpa',
      'gpa': 'cgpa',
      'percentage': 'percentage',
      'marks': 'percentage',
      'dateofissue': 'dateOfIssue',
      'issuedate': 'dateOfIssue',
      'dateofcompletion': 'dateOfCompletion',
      'completiondate': 'dateOfCompletion',
      'type': 'type',
      'certificatetype': 'type'
    };

    return fieldMapping[fieldName] || fieldName;
  }

  async processRecords(records, institutionId, userId) {
    const prisma = getPrismaClient();
    const result = {
      totalRecords: records.length,
      successfulUploads: 0,
      failedUploads: 0,
      errors: [],
      warnings: [],
      duplicates: []
    };

    for (let i = 0; i < records.length; i++) {
      try {
        const record = records[i];
        const rowNumber = i + 2; // Account for header row

        // Validate required fields
        const validationErrors = this.validateRecord(record);
        if (validationErrors.length > 0) {
          result.errors.push({
            row: rowNumber,
            errors: validationErrors,
            data: record
          });
          result.failedUploads++;
          continue;
        }

        // Check for duplicates
        const existingCertificate = await prisma.certificate.findFirst({
          where: {
            OR: [
              { certificateNumber: record.certificateNumber },
              {
                AND: [
                  { studentName: record.studentName },
                  { rollNumber: record.rollNumber },
                  { institutionId }
                ]
              }
            ]
          }
        });

        if (existingCertificate) {
          result.duplicates.push({
            row: rowNumber,
            certificateNumber: record.certificateNumber,
            studentName: record.studentName,
            existingId: existingCertificate.id
          });
          result.failedUploads++;
          continue;
        }

        // Process and clean data
        const processedRecord = this.processRecord(record, institutionId);

        // Create certificate
        const certificate = await prisma.certificate.create({
          data: processedRecord,
          include: { institution: true }
        });

        // Generate blockchain hash for new certificates
        if (!processedRecord.isLegacy) {
          try {
            const blockchainResult = await blockchainService.storeCertificateOnBlockchain(certificate);
            const qrCode = await blockchainService.generateQRCode({
              ...certificate,
              blockchainHash: blockchainResult.blockchainHash
            });

            await prisma.certificate.update({
              where: { id: certificate.id },
              data: {
                blockchainHash: blockchainResult.blockchainHash,
                qrCode,
                digitalSignature: blockchainService.createDigitalSignature(certificate)
              }
            });
          } catch (blockchainError) {
            logger.warn(`Blockchain storage failed for certificate ${certificate.id}:`, blockchainError);
            result.warnings.push({
              row: rowNumber,
              message: 'Certificate created but blockchain storage failed',
              certificateId: certificate.id
            });
          }
        }

        // Run anomaly detection
        try {
          const anomalies = await anomalyDetectionService.detectAllAnomalies(certificate, {
            text: `${certificate.studentName} ${certificate.course} ${certificate.certificateNumber}`,
            confidence: 95
          });

          if (anomalies.length > 0) {
            await anomalyDetectionService.storeAnomalies(certificate.id, anomalies);
            
            // Flag certificate if high-risk anomalies found
            const highRiskAnomalies = anomalies.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH');
            if (highRiskAnomalies.length > 0) {
              await prisma.certificate.update({
                where: { id: certificate.id },
                data: { status: 'FLAGGED' }
              });
              
              result.warnings.push({
                row: rowNumber,
                message: `Certificate flagged due to ${highRiskAnomalies.length} high-risk anomalies`,
                certificateId: certificate.id,
                anomalies: highRiskAnomalies.map(a => a.type)
              });
            }
          }
        } catch (anomalyError) {
          logger.warn(`Anomaly detection failed for certificate ${certificate.id}:`, anomalyError);
        }

        result.successfulUploads++;
        
        // Log progress every 100 records
        if ((i + 1) % 100 === 0) {
          logger.info(`Processed ${i + 1}/${records.length} records`);
        }

      } catch (error) {
        logger.error(`Error processing record ${i + 2}:`, error);
        result.errors.push({
          row: i + 2,
          errors: [error.message],
          data: records[i]
        });
        result.failedUploads++;
      }
    }

    return result;
  }

  validateRecord(record) {
    const errors = [];

    // Check required fields
    for (const field of this.requiredFields) {
      if (!record[field] || record[field].toString().trim() === '') {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate data types and formats
    if (record.passingYear) {
      const year = parseInt(record.passingYear);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1950 || year > currentYear) {
        errors.push(`Invalid passing year: ${record.passingYear}`);
      }
    }

    if (record.cgpa) {
      const cgpa = parseFloat(record.cgpa);
      if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
        errors.push(`Invalid CGPA: ${record.cgpa}`);
      }
    }

    if (record.percentage) {
      const percentage = parseFloat(record.percentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        errors.push(`Invalid percentage: ${record.percentage}`);
      }
    }

    // Validate certificate number format
    if (record.certificateNumber && record.certificateNumber.length < 3) {
      errors.push('Certificate number too short');
    }

    return errors;
  }

  processRecord(record, institutionId) {
    const processed = {
      certificateNumber: record.certificateNumber,
      studentName: record.studentName,
      fatherName: record.fatherName || null,
      motherName: record.motherName || null,
      rollNumber: record.rollNumber || null,
      registrationNumber: record.registrationNumber || null,
      course: record.course,
      branch: record.branch || null,
      passingYear: parseInt(record.passingYear),
      grade: record.grade || null,
      cgpa: record.cgpa ? parseFloat(record.cgpa) : null,
      percentage: record.percentage ? parseFloat(record.percentage) : null,
      dateOfIssue: record.dateOfIssue ? new Date(record.dateOfIssue) : new Date(),
      dateOfCompletion: record.dateOfCompletion ? new Date(record.dateOfCompletion) : null,
      type: record.type || 'DEGREE',
      institutionId,
      isLegacy: record.isLegacy === 'true' || record.isLegacy === '1' || false,
      status: 'PENDING'
    };

    return processed;
  }

  async generateTemplate(institutionId) {
    const template = [
      {
        certificateNumber: 'CERT001',
        studentName: 'John Doe',
        fatherName: 'Robert Doe',
        motherName: 'Jane Doe',
        rollNumber: 'ROLL001',
        registrationNumber: 'REG001',
        course: 'Bachelor of Technology',
        branch: 'Computer Science',
        passingYear: 2023,
        grade: 'First Class',
        cgpa: 8.5,
        percentage: 85.0,
        dateOfIssue: '2023-06-15',
        dateOfCompletion: '2023-05-30',
        type: 'DEGREE',
        isLegacy: false
      }
    ];

    return template;
  }
}

module.exports = new BulkUploadService();
