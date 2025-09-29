const { logger } = require('../utils/logger');
const { getPrismaClient } = require('../config/database');

class EnhancedVerificationService {
  constructor() {
    this.mismatchThreshold = 30; // Percentage threshold for flagging mismatches
  }

  /**
   * Enhanced certificate verification with mismatch detection
   * @param {Object} extractedData - Data extracted from OCR
   * @param {Object} databaseCertificate - Certificate from database
   * @returns {Object} Verification result with detailed mismatch analysis
   */
  async verifyWithMismatchDetection(extractedData, databaseCertificate) {
    try {
      const mismatches = [];
      const formattingIssues = [];
      let matchScore = 100;
      let confidenceScore = 100;

      // 1. Certificate Number Verification
      if (extractedData.certificateNumber && databaseCertificate.certificateNumber) {
        const certMatch = this.compareStrings(
          extractedData.certificateNumber,
          databaseCertificate.certificateNumber
        );
        
        if (certMatch.similarity < 80) {
          mismatches.push({
            field: 'certificateNumber',
            extracted: extractedData.certificateNumber,
            database: databaseCertificate.certificateNumber,
            similarity: certMatch.similarity,
            severity: 'CRITICAL'
          });
          matchScore -= 30;
        }
      }

      // 2. Student Name Verification
      if (extractedData.studentName && databaseCertificate.studentName) {
        const nameMatch = this.compareStrings(
          extractedData.studentName,
          databaseCertificate.studentName
        );
        
        if (nameMatch.similarity < 70) {
          mismatches.push({
            field: 'studentName',
            extracted: extractedData.studentName,
            database: databaseCertificate.studentName,
            similarity: nameMatch.similarity,
            severity: 'HIGH'
          });
          matchScore -= 20;
        }
      }

      // 3. Roll Number Verification
      if (extractedData.rollNumber && databaseCertificate.rollNumber) {
        const rollMatch = this.compareStrings(
          extractedData.rollNumber,
          databaseCertificate.rollNumber
        );
        
        if (rollMatch.similarity < 80) {
          mismatches.push({
            field: 'rollNumber',
            extracted: extractedData.rollNumber,
            database: databaseCertificate.rollNumber,
            similarity: rollMatch.similarity,
            severity: 'HIGH'
          });
          matchScore -= 15;
        }
      }

      // 4. Course Verification
      if (extractedData.course && databaseCertificate.course) {
        const courseMatch = this.compareStrings(
          extractedData.course,
          databaseCertificate.course
        );
        
        if (courseMatch.similarity < 60) {
          mismatches.push({
            field: 'course',
            extracted: extractedData.course,
            database: databaseCertificate.course,
            similarity: courseMatch.similarity,
            severity: 'MEDIUM'
          });
          matchScore -= 10;
        }
      }

      // 5. Passing Year Verification
      if (extractedData.passingYear && databaseCertificate.passingYear) {
        if (extractedData.passingYear !== databaseCertificate.passingYear) {
          mismatches.push({
            field: 'passingYear',
            extracted: extractedData.passingYear,
            database: databaseCertificate.passingYear,
            similarity: 0,
            severity: 'HIGH'
          });
          matchScore -= 15;
        }
      }

      // 6. Grade/Marks Verification
      if (extractedData.grade && databaseCertificate.grade) {
        const gradeMatch = this.compareStrings(
          extractedData.grade,
          databaseCertificate.grade
        );
        
        if (gradeMatch.similarity < 70) {
          mismatches.push({
            field: 'grade',
            extracted: extractedData.grade,
            database: databaseCertificate.grade,
            similarity: gradeMatch.similarity,
            severity: 'MEDIUM'
          });
          matchScore -= 10;
        }
      }

      // 7. CGPA Verification
      if (extractedData.cgpa && databaseCertificate.cgpa) {
        const cgpaDiff = Math.abs(extractedData.cgpa - databaseCertificate.cgpa);
        if (cgpaDiff > 0.5) {
          mismatches.push({
            field: 'cgpa',
            extracted: extractedData.cgpa,
            database: databaseCertificate.cgpa,
            difference: cgpaDiff,
            severity: 'HIGH'
          });
          matchScore -= 15;
        }
      }

      // 8. Percentage Verification
      if (extractedData.percentage && databaseCertificate.percentage) {
        const percentageDiff = Math.abs(extractedData.percentage - databaseCertificate.percentage);
        if (percentageDiff > 5) {
          mismatches.push({
            field: 'percentage',
            extracted: extractedData.percentage,
            database: databaseCertificate.percentage,
            difference: percentageDiff,
            severity: 'HIGH'
          });
          matchScore -= 15;
        }
      }

      // 9. Formatting Inconsistency Detection
      formattingIssues.push(...this.detectFormattingIssues(extractedData));

      // 10. Calculate final confidence score
      confidenceScore = Math.max(0, matchScore - (formattingIssues.length * 5));

      // 11. Determine verification status
      const isValid = confidenceScore >= 70 && mismatches.filter(m => m.severity === 'CRITICAL').length === 0;

      // 12. Generate flagged reasons
      const flaggedReasons = [];
      
      if (mismatches.length > 0) {
        flaggedReasons.push(`${mismatches.length} field mismatch(es) detected`);
      }
      
      if (formattingIssues.length > 0) {
        flaggedReasons.push(`${formattingIssues.length} formatting inconsistency(ies) detected`);
      }

      mismatches.forEach(mismatch => {
        if (mismatch.severity === 'CRITICAL' || mismatch.severity === 'HIGH') {
          flaggedReasons.push(`${mismatch.field}: Mismatch detected (${mismatch.similarity}% match)`);
        }
      });

      return {
        isValid,
        confidenceScore: Math.round(confidenceScore),
        matchScore: Math.round(matchScore),
        mismatches,
        formattingIssues,
        flaggedReasons,
        verifiedAt: new Date(),
        summary: {
          totalFields: Object.keys(extractedData).length,
          matchedFields: Object.keys(extractedData).length - mismatches.length,
          mismatchedFields: mismatches.length,
          criticalMismatches: mismatches.filter(m => m.severity === 'CRITICAL').length,
          highMismatches: mismatches.filter(m => m.severity === 'HIGH').length,
          mediumMismatches: mismatches.filter(m => m.severity === 'MEDIUM').length
        }
      };
    } catch (error) {
      logger.error('Enhanced verification error:', error);
      throw error;
    }
  }

  /**
   * Compare two strings and return similarity score
   * Uses Levenshtein distance algorithm
   */
  compareStrings(str1, str2) {
    if (!str1 || !str2) return { similarity: 0 };

    // Normalize strings
    str1 = str1.toLowerCase().trim();
    str2 = str2.toLowerCase().trim();

    if (str1 === str2) return { similarity: 100 };

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    const similarity = ((maxLength - distance) / maxLength) * 100;

    return {
      similarity: Math.round(similarity),
      distance,
      str1Length: str1.length,
      str2Length: str2.length
    };
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Detect formatting inconsistencies in extracted data
   */
  detectFormattingIssues(extractedData) {
    const issues = [];

    // 1. Certificate Number Format
    if (extractedData.certificateNumber) {
      const certNum = extractedData.certificateNumber;
      
      // Check for common Indian certificate formats
      const validFormats = [
        /^[A-Z]{2}\/\d{4}\/[A-Z]{3,4}\/\d{3,4}$/,  // RU/2023/BSC/001
        /^[A-Z]{3}-\d{4}-\d{5}$/,                   // ABC-2023-12345
        /^\d{10}$/,                                  // 1234567890
        /^[A-Z]{2}\d{8}$/                            // AB12345678
      ];

      const hasValidFormat = validFormats.some(format => format.test(certNum));
      
      if (!hasValidFormat) {
        issues.push({
          field: 'certificateNumber',
          issue: 'Non-standard certificate number format',
          value: certNum,
          severity: 'MEDIUM'
        });
      }
    }

    // 2. Name Format
    if (extractedData.studentName) {
      const name = extractedData.studentName;
      
      // Check for suspicious patterns
      if (name.length < 3) {
        issues.push({
          field: 'studentName',
          issue: 'Name too short',
          value: name,
          severity: 'HIGH'
        });
      }
      
      if (/\d/.test(name)) {
        issues.push({
          field: 'studentName',
          issue: 'Name contains numbers',
          value: name,
          severity: 'HIGH'
        });
      }
      
      if (/[^A-Za-z\s\.]/.test(name)) {
        issues.push({
          field: 'studentName',
          issue: 'Name contains special characters',
          value: name,
          severity: 'MEDIUM'
        });
      }
    }

    // 3. Roll Number Format
    if (extractedData.rollNumber) {
      const rollNum = extractedData.rollNumber;
      
      if (rollNum.length < 3) {
        issues.push({
          field: 'rollNumber',
          issue: 'Roll number too short',
          value: rollNum,
          severity: 'MEDIUM'
        });
      }
    }

    // 4. Year Validation
    if (extractedData.passingYear) {
      const year = parseInt(extractedData.passingYear);
      const currentYear = new Date().getFullYear();
      
      if (year < 1950 || year > currentYear) {
        issues.push({
          field: 'passingYear',
          issue: 'Invalid year range',
          value: year,
          severity: 'HIGH'
        });
      }
      
      if (year > currentYear) {
        issues.push({
          field: 'passingYear',
          issue: 'Future year detected',
          value: year,
          severity: 'CRITICAL'
        });
      }
    }

    // 5. CGPA Validation
    if (extractedData.cgpa) {
      const cgpa = parseFloat(extractedData.cgpa);
      
      if (cgpa < 0 || cgpa > 10) {
        issues.push({
          field: 'cgpa',
          issue: 'CGPA out of valid range (0-10)',
          value: cgpa,
          severity: 'HIGH'
        });
      }
    }

    // 6. Percentage Validation
    if (extractedData.percentage) {
      const percentage = parseFloat(extractedData.percentage);
      
      if (percentage < 0 || percentage > 100) {
        issues.push({
          field: 'percentage',
          issue: 'Percentage out of valid range (0-100)',
          value: percentage,
          severity: 'HIGH'
        });
      }
    }

    // 7. Date of Issue Validation
    if (extractedData.dateOfIssue) {
      const issueDate = new Date(extractedData.dateOfIssue);
      const currentDate = new Date();
      
      if (issueDate > currentDate) {
        issues.push({
          field: 'dateOfIssue',
          issue: 'Future date of issue',
          value: extractedData.dateOfIssue,
          severity: 'CRITICAL'
        });
      }
      
      if (extractedData.passingYear) {
        const passingYear = parseInt(extractedData.passingYear);
        const issueYear = issueDate.getFullYear();
        
        if (issueYear < passingYear) {
          issues.push({
            field: 'dateOfIssue',
            issue: 'Issue date before passing year',
            value: extractedData.dateOfIssue,
            severity: 'HIGH'
          });
        }
        
        if (issueYear - passingYear > 5) {
          issues.push({
            field: 'dateOfIssue',
            issue: 'Unusual gap between passing year and issue date',
            value: extractedData.dateOfIssue,
            severity: 'MEDIUM'
          });
        }
      }
    }

    return issues;
  }

  /**
   * Generate detailed verification report
   */
  generateVerificationReport(verificationResult, extractedData, databaseCertificate) {
    return {
      verificationStatus: verificationResult.isValid ? 'VERIFIED' : 'FAILED',
      confidenceScore: verificationResult.confidenceScore,
      matchScore: verificationResult.matchScore,
      timestamp: new Date(),
      
      extractedData: {
        certificateNumber: extractedData.certificateNumber,
        studentName: extractedData.studentName,
        rollNumber: extractedData.rollNumber,
        course: extractedData.course,
        passingYear: extractedData.passingYear,
        grade: extractedData.grade,
        cgpa: extractedData.cgpa,
        percentage: extractedData.percentage
      },
      
      databaseData: {
        certificateNumber: databaseCertificate.certificateNumber,
        studentName: databaseCertificate.studentName,
        rollNumber: databaseCertificate.rollNumber,
        course: databaseCertificate.course,
        passingYear: databaseCertificate.passingYear,
        grade: databaseCertificate.grade,
        cgpa: databaseCertificate.cgpa,
        percentage: databaseCertificate.percentage
      },
      
      analysis: {
        mismatches: verificationResult.mismatches,
        formattingIssues: verificationResult.formattingIssues,
        flaggedReasons: verificationResult.flaggedReasons,
        summary: verificationResult.summary
      },
      
      recommendation: this.generateRecommendation(verificationResult)
    };
  }

  /**
   * Generate recommendation based on verification result
   */
  generateRecommendation(verificationResult) {
    if (verificationResult.confidenceScore >= 90) {
      return {
        action: 'APPROVE',
        message: 'Certificate appears authentic with high confidence',
        requiresManualReview: false
      };
    } else if (verificationResult.confidenceScore >= 70) {
      return {
        action: 'REVIEW',
        message: 'Certificate verification passed but with some concerns',
        requiresManualReview: true
      };
    } else if (verificationResult.confidenceScore >= 50) {
      return {
        action: 'INVESTIGATE',
        message: 'Significant mismatches detected. Manual investigation required',
        requiresManualReview: true
      };
    } else {
      return {
        action: 'REJECT',
        message: 'Certificate verification failed. High probability of forgery',
        requiresManualReview: true
      };
    }
  }
}

module.exports = new EnhancedVerificationService();
