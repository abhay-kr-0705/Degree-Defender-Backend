const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const { logger } = require('../utils/logger');

class OCRService {
  constructor() {
    this.tesseractWorker = null;
    this.initializeTesseract();
    
    // Common patterns for Indian certificates
    this.patterns = {
      certificateNumber: /(?:certificate\s*(?:no|number|#)[\s:]*|cert[\s:]*|reg[\s:]*no[\s:]*|serial[\s:]*no[\s:]*)([\w\/-]+)/i,
      rollNumber: /(?:roll\s*(?:no|number)[\s:]*|roll[\s:]*|student[\s:]*id[\s:]*)([\w\/-]+)/i,
      registrationNumber: /(?:registration\s*(?:no|number)[\s:]*|reg[\s:]*(?:no|number)[\s:]*)([\w\/-]+)/i,
      studentName: /(?:name[\s:]*|student[\s:]*name[\s:]*|candidate[\s:]*name[\s:]*)([A-Za-z\s\.]+)(?:\n|$)/i,
      fatherName: /(?:father'?s?\s*name[\s:]*|father[\s:]*|s\/o[\s:]*|son\s*of[\s:]*)([A-Za-z\s\.]+)(?:\n|$)/i,
      motherName: /(?:mother'?s?\s*name[\s:]*|mother[\s:]*|d\/o[\s:]*|daughter\s*of[\s:]*)([A-Za-z\s\.]+)(?:\n|$)/i,
      course: /(?:course[\s:]*|degree[\s:]*|program[\s:]*|qualification[\s:]*)([A-Za-z\s\.\(\)]+)(?:\n|$)/i,
      branch: /(?:branch[\s:]*|specialization[\s:]*|stream[\s:]*|subject[\s:]*)([A-Za-z\s\.\(\)]+)(?:\n|$)/i,
      passingYear: /(?:year[\s:]*|passing\s*year[\s:]*|graduated[\s:]*|completion[\s:]*|(?:19|20)\d{2})/i,
      grade: /(?:grade[\s:]*|class[\s:]*|division[\s:]*)([A-Za-z\+\-\s]+)(?:\n|$)/i,
      cgpa: /(?:cgpa[\s:]*|gpa[\s:]*|point[\s:]*)(\d+\.?\d*)/i,
      percentage: /(?:percentage[\s:]*|marks[\s:]*|%[\s:]*)(\d+\.?\d*)/i,
      dateOfIssue: /(?:date\s*of\s*issue[\s:]*|issued\s*on[\s:]*|date[\s:]*)((?:\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(?:\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{2,4}))/i,
      institution: /(?:university[\s:]*|college[\s:]*|institute[\s:]*|institution[\s:]*)([A-Za-z\s\.\,\(\)]+)(?:\n|$)/i
    };

    // Confidence thresholds
    this.confidenceThresholds = {
      high: 85,
      medium: 70,
      low: 50
    };
  }

  /**
   * Initialize Tesseract worker
   */
  async initializeTesseract() {
    try {
      this.tesseractWorker = await Tesseract.createWorker('eng');
      await this.tesseractWorker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,/:-()[]{}@#$%^&*+=_|\\;\'\"<>?`~',
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      });
      logger.info('✅ Tesseract OCR initialized successfully');
    } catch (error) {
      logger.error('❌ Tesseract initialization failed:', error);
    }
  }

  /**
   * Extract text from image using Tesseract OCR
   */
  async extractTextFromImage(imagePath) {
    try {
      if (!this.tesseractWorker) {
        await this.initializeTesseract();
      }

      // Preprocess image for better OCR accuracy
      const preprocessedPath = await this.preprocessImage(imagePath);
      
      // Perform OCR
      const { data } = await this.tesseractWorker.recognize(preprocessedPath);
      
      // Clean up preprocessed image
      if (preprocessedPath !== imagePath) {
        await fs.unlink(preprocessedPath).catch(() => {});
      }

      logger.info(`OCR completed with confidence: ${data.confidence}%`);
      
      return {
        text: data.text,
        confidence: data.confidence,
        words: data.words,
        lines: data.lines,
        paragraphs: data.paragraphs,
        blocks: data.blocks
      };
    } catch (error) {
      logger.error('OCR extraction error:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  /**
   * Extract text from PDF
   */
  async extractTextFromPDF(pdfPath) {
    try {
      const dataBuffer = await fs.readFile(pdfPath);
      const data = await pdfParse(dataBuffer);
      
      return {
        text: data.text,
        confidence: 95, // PDF text extraction is generally reliable
        pages: data.numpages,
        info: data.info,
        metadata: data.metadata
      };
    } catch (error) {
      logger.error('PDF text extraction error:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Preprocess image for better OCR accuracy
   */
  async preprocessImage(imagePath) {
    try {
      const outputPath = imagePath.replace(/\.[^/.]+$/, '_processed.png');
      
      await sharp(imagePath)
        .resize(null, 2000, { 
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3 
        })
        .normalize()
        .sharpen()
        .threshold(128)
        .png({ quality: 100 })
        .toFile(outputPath);
      
      return outputPath;
    } catch (error) {
      logger.warn('Image preprocessing failed, using original:', error);
      return imagePath;
    }
  }

  /**
   * Extract structured certificate data from OCR text
   */
  extractCertificateData(ocrResult) {
    const text = ocrResult.text;
    const extractedData = {};

    try {
      // Extract each field using regex patterns
      for (const [field, pattern] of Object.entries(this.patterns)) {
        const match = text.match(pattern);
        if (match) {
          let value = match[1] || match[0];
          
          // Clean and format the extracted value
          value = this.cleanExtractedValue(value, field);
          
          if (value) {
            extractedData[field] = value;
            logger.debug(`Extracted ${field}: ${value}`);
          }
        }
      }

      // Post-process and validate extracted data
      this.postProcessExtractedData(extractedData, text);
      
      return extractedData;
    } catch (error) {
      logger.error('Data extraction error:', error);
      return {};
    }
  }

  /**
   * Clean and format extracted values
   */
  cleanExtractedValue(value, field) {
    if (!value) return null;
    
    // Remove extra whitespace and clean up
    value = value.trim().replace(/\s+/g, ' ');
    
    switch (field) {
      case 'studentName':
      case 'fatherName':
      case 'motherName':
        // Clean names - remove common OCR artifacts
        value = value.replace(/[^A-Za-z\s\.]/g, '').trim();
        value = value.replace(/\b(Mr|Mrs|Ms|Dr|Prof)\b\.?/gi, '').trim();
        return value.length > 2 ? value : null;
        
      case 'certificateNumber':
      case 'rollNumber':
      case 'registrationNumber':
        // Clean numbers/IDs
        value = value.replace(/[^\w\/-]/g, '').trim();
        return value.length > 2 ? value : null;
        
      case 'course':
      case 'branch':
        // Clean course/branch names
        value = value.replace(/[^A-Za-z\s\.\(\)]/g, ' ').trim();
        return value.length > 3 ? value : null;
        
      case 'passingYear':
        // Extract 4-digit year
        const yearMatch = value.match(/(19|20)\d{2}/);
        if (yearMatch) {
          const year = parseInt(yearMatch[0]);
          return (year >= 1950 && year <= new Date().getFullYear()) ? year : null;
        }
        return null;
        
      case 'cgpa':
        const cgpa = parseFloat(value);
        return (cgpa >= 0 && cgpa <= 10) ? cgpa : null;
        
      case 'percentage':
        const percentage = parseFloat(value);
        return (percentage >= 0 && percentage <= 100) ? percentage : null;
        
      case 'dateOfIssue':
        return this.parseDate(value);
        
      default:
        return value;
    }
  }

  /**
   * Parse date from various formats
   */
  parseDate(dateString) {
    if (!dateString) return null;
    
    try {
      // Try different date formats
      const formats = [
        /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/,
        /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{2,4})/i
      ];
      
      for (const format of formats) {
        const match = dateString.match(format);
        if (match) {
          let day, month, year;
          
          if (format.source.includes('jan|feb')) {
            // Month name format
            day = parseInt(match[1]);
            month = this.getMonthNumber(match[2]);
            year = parseInt(match[3]);
          } else {
            // Numeric format (assume DD/MM/YYYY for Indian certificates)
            day = parseInt(match[1]);
            month = parseInt(match[2]);
            year = parseInt(match[3]);
          }
          
          // Convert 2-digit year to 4-digit
          if (year < 100) {
            year += year < 50 ? 2000 : 1900;
          }
          
          // Validate date
          if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1950) {
            return new Date(year, month - 1, day);
          }
        }
      }
      
      return null;
    } catch (error) {
      logger.warn('Date parsing error:', error);
      return null;
    }
  }

  /**
   * Get month number from month name
   */
  getMonthNumber(monthName) {
    const months = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
    };
    return months[monthName.toLowerCase().substring(0, 3)] || 1;
  }

  /**
   * Post-process extracted data for consistency
   */
  postProcessExtractedData(extractedData, fullText) {
    // If no certificate number found, try alternative patterns
    if (!extractedData.certificateNumber) {
      const altPatterns = [
        /(?:no[\s:]*|#[\s:]*)(\w{3,})/i,
        /([A-Z]{2,}\d{4,})/,
        /(\d{4,}[A-Z]{2,})/
      ];
      
      for (const pattern of altPatterns) {
        const match = fullText.match(pattern);
        if (match && match[1].length >= 5) {
          extractedData.certificateNumber = match[1];
          break;
        }
      }
    }

    // Try to extract institution name if not found
    if (!extractedData.institution) {
      const lines = fullText.split('\n');
      for (const line of lines.slice(0, 5)) { // Check first 5 lines
        if (line.length > 10 && /university|college|institute/i.test(line)) {
          extractedData.institution = line.trim();
          break;
        }
      }
    }

    // Validate and cross-check extracted data
    this.validateExtractedData(extractedData);
  }

  /**
   * Validate extracted data for consistency
   */
  validateExtractedData(extractedData) {
    const issues = [];

    // Check for required fields
    const requiredFields = ['studentName', 'course'];
    for (const field of requiredFields) {
      if (!extractedData[field]) {
        issues.push(`Missing required field: ${field}`);
      }
    }

    // Check data consistency
    if (extractedData.cgpa && extractedData.percentage) {
      const expectedPercentage = extractedData.cgpa * 9.5;
      const difference = Math.abs(extractedData.percentage - expectedPercentage);
      if (difference > 25) {
        issues.push('CGPA and percentage values are inconsistent');
      }
    }

    // Check year validity
    if (extractedData.passingYear) {
      const currentYear = new Date().getFullYear();
      if (extractedData.passingYear > currentYear || extractedData.passingYear < 1950) {
        issues.push('Invalid passing year');
      }
    }

    extractedData.validationIssues = issues;
    return issues.length === 0;
  }

  /**
   * Validate OCR results and extracted data
   */
  validateOCRResults(ocrResult, extractedData) {
    const validation = {
      overall: 'PASS',
      confidence: ocrResult.confidence,
      issues: [],
      recommendations: []
    };

    // Check OCR confidence
    if (ocrResult.confidence < this.confidenceThresholds.low) {
      validation.overall = 'FAIL';
      validation.issues.push('Very low OCR confidence - image quality may be poor');
      validation.recommendations.push('Try uploading a higher quality image');
    } else if (ocrResult.confidence < this.confidenceThresholds.medium) {
      validation.overall = 'WARNING';
      validation.issues.push('Low OCR confidence - some data may be inaccurate');
      validation.recommendations.push('Verify extracted data manually');
    }

    // Check extracted data completeness
    const extractedFields = Object.keys(extractedData).filter(key => 
      extractedData[key] && key !== 'validationIssues'
    );
    
    if (extractedFields.length < 3) {
      validation.overall = 'FAIL';
      validation.issues.push('Insufficient data extracted from certificate');
      validation.recommendations.push('Ensure certificate is clearly visible and not rotated');
    }

    // Check for validation issues in extracted data
    if (extractedData.validationIssues && extractedData.validationIssues.length > 0) {
      validation.issues.push(...extractedData.validationIssues);
      if (validation.overall === 'PASS') {
        validation.overall = 'WARNING';
      }
    }

    return validation;
  }

  /**
   * Detect potential tampering in certificate image
   */
  async detectImageTampering(imagePath) {
    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const stats = await image.stats();
      
      const tamperingIndicators = [];

      // Check for unusual compression artifacts
      if (metadata.format === 'jpeg' && metadata.density && metadata.density < 72) {
        tamperingIndicators.push({
          type: 'LOW_RESOLUTION',
          severity: 'MEDIUM',
          description: 'Image has unusually low resolution which may indicate tampering'
        });
      }

      // Check for inconsistent lighting/shadows
      const channels = stats.channels;
      if (channels && channels.length >= 3) {
        const variance = this.calculateVariance([
          channels[0].mean,
          channels[1].mean,
          channels[2].mean
        ]);
        
        if (variance > 1000) {
          tamperingIndicators.push({
            type: 'INCONSISTENT_LIGHTING',
            severity: 'LOW',
            description: 'Detected inconsistent lighting patterns'
          });
        }
      }

      return tamperingIndicators;
    } catch (error) {
      logger.error('Image tampering detection error:', error);
      return [];
    }
  }

  /**
   * Calculate variance for array of numbers
   */
  calculateVariance(numbers) {
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
    return variance;
  }

  /**
   * Get OCR statistics and performance metrics
   */
  getOCRStats() {
    return {
      tesseractInitialized: !!this.tesseractWorker,
      confidenceThresholds: this.confidenceThresholds,
      supportedPatterns: Object.keys(this.patterns),
      version: '1.0.0'
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
      logger.info('Tesseract worker terminated');
    }
  }
}

module.exports = new OCRService();