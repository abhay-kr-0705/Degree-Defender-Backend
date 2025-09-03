const winston = require('winston');
const path = require('path');
const { getPrismaClient } = require('../config/database');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure Winston logger for audit trails
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'degree-defenders-audit' },
  transports: [
    // Error logs
    new winston.transports.File({ 
      filename: path.join(logsDir, 'audit-error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Combined logs
    new winston.transports.File({ 
      filename: path.join(logsDir, 'audit-combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10
    }),
    // Security-specific logs
    new winston.transports.File({ 
      filename: path.join(logsDir, 'security-audit.log'),
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  auditLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

class AuditService {
  constructor() {
    this.logger = auditLogger;
  }

  /**
   * Log user authentication events
   */
  async logAuthentication(userId, email, action, ipAddress, userAgent, success = true, reason = null) {
    const logData = {
      category: 'AUTHENTICATION',
      action,
      userId,
      email,
      ipAddress,
      userAgent,
      success,
      reason,
      timestamp: new Date().toISOString()
    };

    this.logger.info('Authentication event', logData);

    try {
      const prisma = getPrismaClient();
      await prisma.auditLog.create({
        data: {
          category: 'AUTHENTICATION',
          action,
          userId,
          details: JSON.stringify(logData),
          ipAddress,
          userAgent,
          success
        }
      });
    } catch (error) {
      this.logger.error('Failed to save authentication audit log to database', error);
    }
  }

  /**
   * Log certificate operations
   */
  async logCertificateOperation(userId, certificateId, action, details = {}, ipAddress = null, userAgent = null) {
    const logData = {
      category: 'CERTIFICATE',
      action,
      userId,
      certificateId,
      details,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    };

    this.logger.info('Certificate operation', logData);

    try {
      const prisma = getPrismaClient();
      await prisma.auditLog.create({
        data: {
          category: 'CERTIFICATE',
          action,
          userId,
          certificateId,
          details: JSON.stringify(logData),
          ipAddress,
          userAgent,
          success: true
        }
      });
    } catch (error) {
      this.logger.error('Failed to save certificate audit log to database', error);
    }
  }

  /**
   * Log verification activities
   */
  async logVerification(userId, verificationId, certificateId, action, result, ipAddress = null, userAgent = null) {
    const logData = {
      category: 'VERIFICATION',
      action,
      userId,
      verificationId,
      certificateId,
      result,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    };

    this.logger.info('Verification activity', logData);

    try {
      const prisma = getPrismaClient();
      await prisma.auditLog.create({
        data: {
          category: 'VERIFICATION',
          action,
          userId,
          verificationId,
          certificateId,
          details: JSON.stringify(logData),
          ipAddress,
          userAgent,
          success: result.success || false
        }
      });
    } catch (error) {
      this.logger.error('Failed to save verification audit log to database', error);
    }
  }

  /**
   * Log security events and anomalies
   */
  async logSecurityEvent(type, severity, description, userId = null, certificateId = null, ipAddress = null, details = {}) {
    const logData = {
      category: 'SECURITY',
      type,
      severity,
      description,
      userId,
      certificateId,
      ipAddress,
      details,
      timestamp: new Date().toISOString()
    };

    // Use appropriate log level based on severity
    if (severity === 'HIGH' || severity === 'CRITICAL') {
      this.logger.error('Security event', logData);
    } else if (severity === 'MEDIUM') {
      this.logger.warn('Security event', logData);
    } else {
      this.logger.info('Security event', logData);
    }

    try {
      const prisma = getPrismaClient();
      await prisma.auditLog.create({
        data: {
          category: 'SECURITY',
          action: type,
          userId,
          certificateId,
          details: JSON.stringify(logData),
          ipAddress,
          success: false // Security events are typically failures or alerts
        }
      });

      // Also create a security incident record for high/critical events
      if (severity === 'HIGH' || severity === 'CRITICAL') {
        await prisma.securityIncident.create({
          data: {
            type,
            severity,
            description,
            userId,
            certificateId,
            ipAddress,
            details: JSON.stringify(details),
            status: 'OPEN'
          }
        });
      }
    } catch (error) {
      this.logger.error('Failed to save security audit log to database', error);
    }
  }

  /**
   * Log administrative actions
   */
  async logAdminAction(adminUserId, action, targetUserId = null, targetResource = null, details = {}, ipAddress = null, userAgent = null) {
    const logData = {
      category: 'ADMINISTRATION',
      action,
      adminUserId,
      targetUserId,
      targetResource,
      details,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    };

    this.logger.warn('Administrative action', logData); // Admin actions are important

    try {
      const prisma = getPrismaClient();
      await prisma.auditLog.create({
        data: {
          category: 'ADMINISTRATION',
          action,
          userId: adminUserId,
          details: JSON.stringify(logData),
          ipAddress,
          userAgent,
          success: true
        }
      });
    } catch (error) {
      this.logger.error('Failed to save admin audit log to database', error);
    }
  }

  /**
   * Log blockchain operations
   */
  async logBlockchainOperation(userId, certificateId, operation, transactionHash = null, success = true, error = null, gasUsed = null) {
    const logData = {
      category: 'BLOCKCHAIN',
      operation,
      userId,
      certificateId,
      transactionHash,
      success,
      error,
      gasUsed,
      timestamp: new Date().toISOString()
    };

    if (success) {
      this.logger.info('Blockchain operation', logData);
    } else {
      this.logger.error('Blockchain operation failed', logData);
    }

    try {
      const prisma = getPrismaClient();
      await prisma.auditLog.create({
        data: {
          category: 'BLOCKCHAIN',
          action: operation,
          userId,
          certificateId,
          details: JSON.stringify(logData),
          success
        }
      });
    } catch (dbError) {
      this.logger.error('Failed to save blockchain audit log to database', dbError);
    }
  }

  /**
   * Log data access and privacy events
   */
  async logDataAccess(userId, dataType, resourceId, action, purpose = null, ipAddress = null, userAgent = null) {
    const logData = {
      category: 'DATA_ACCESS',
      action,
      userId,
      dataType,
      resourceId,
      purpose,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    };

    this.logger.info('Data access event', logData);

    try {
      const prisma = getPrismaClient();
      await prisma.auditLog.create({
        data: {
          category: 'DATA_ACCESS',
          action,
          userId,
          details: JSON.stringify(logData),
          ipAddress,
          userAgent,
          success: true
        }
      });
    } catch (error) {
      this.logger.error('Failed to save data access audit log to database', error);
    }
  }

  /**
   * Log system events
   */
  async logSystemEvent(event, severity = 'INFO', details = {}) {
    const logData = {
      category: 'SYSTEM',
      event,
      severity,
      details,
      timestamp: new Date().toISOString()
    };

    if (severity === 'ERROR' || severity === 'CRITICAL') {
      this.logger.error('System event', logData);
    } else if (severity === 'WARN') {
      this.logger.warn('System event', logData);
    } else {
      this.logger.info('System event', logData);
    }

    try {
      const prisma = getPrismaClient();
      await prisma.auditLog.create({
        data: {
          category: 'SYSTEM',
          action: event,
          details: JSON.stringify(logData),
          success: severity !== 'ERROR' && severity !== 'CRITICAL'
        }
      });
    } catch (error) {
      this.logger.error('Failed to save system audit log to database', error);
    }
  }

  /**
   * Log API access
   */
  async logApiAccess(method, url, statusCode, userId = null, ipAddress = null, userAgent = null, responseTime = null) {
    const logData = {
      category: 'API_ACCESS',
      method,
      url,
      statusCode,
      userId,
      ipAddress,
      userAgent,
      responseTime,
      timestamp: new Date().toISOString()
    };

    if (statusCode >= 400) {
      this.logger.warn('API access - error', logData);
    } else {
      this.logger.info('API access', logData);
    }

    try {
      const prisma = getPrismaClient();
      await prisma.auditLog.create({
        data: {
          category: 'API_ACCESS',
          action: `${method} ${url}`,
          userId,
          details: JSON.stringify(logData),
          ipAddress,
          userAgent,
          success: statusCode < 400
        }
      });
    } catch (error) {
      this.logger.error('Failed to save API access audit log to database', error);
    }
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(startDate, endDate, category = null, userId = null) {
    try {
      const prisma = getPrismaClient();
      
      const whereClause = {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      };

      if (category) {
        whereClause.category = category;
      }

      if (userId) {
        whereClause.userId = userId;
      }

      const logs = await prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          },
          certificate: {
            select: {
              id: true,
              certificateNumber: true,
              studentName: true
            }
          }
        }
      });

      // Generate summary statistics
      const summary = {
        totalLogs: logs.length,
        categories: {},
        users: {},
        timeRange: { startDate, endDate },
        securityEvents: 0,
        failedOperations: 0
      };

      logs.forEach(log => {
        // Count by category
        summary.categories[log.category] = (summary.categories[log.category] || 0) + 1;
        
        // Count by user
        if (log.userId) {
          const userKey = log.user ? `${log.user.firstName} ${log.user.lastName}` : log.userId;
          summary.users[userKey] = (summary.users[userKey] || 0) + 1;
        }
        
        // Count security events
        if (log.category === 'SECURITY') {
          summary.securityEvents++;
        }
        
        // Count failed operations
        if (!log.success) {
          summary.failedOperations++;
        }
      });

      return {
        summary,
        logs,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to generate audit report', error);
      throw error;
    }
  }

  /**
   * Clean old audit logs (for compliance and storage management)
   */
  async cleanOldLogs(retentionDays = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const prisma = getPrismaClient();
      
      const deletedCount = await prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          },
          // Keep security logs longer
          NOT: {
            category: 'SECURITY'
          }
        }
      });

      this.logger.info(`Cleaned ${deletedCount.count} old audit logs older than ${retentionDays} days`);
      
      return deletedCount.count;
    } catch (error) {
      this.logger.error('Failed to clean old audit logs', error);
      throw error;
    }
  }

  /**
   * Export audit logs for compliance
   */
  async exportAuditLogs(startDate, endDate, format = 'json') {
    try {
      const report = await this.generateAuditReport(startDate, endDate);
      
      if (format === 'csv') {
        return this.convertToCSV(report.logs);
      }
      
      return JSON.stringify(report, null, 2);
    } catch (error) {
      this.logger.error('Failed to export audit logs', error);
      throw error;
    }
  }

  /**
   * Convert logs to CSV format
   */
  convertToCSV(logs) {
    const headers = ['Timestamp', 'Category', 'Action', 'User', 'IP Address', 'Success', 'Details'];
    const csvRows = [headers.join(',')];

    logs.forEach(log => {
      const row = [
        log.createdAt.toISOString(),
        log.category,
        log.action,
        log.user ? `${log.user.firstName} ${log.user.lastName}` : log.userId || 'System',
        log.ipAddress || 'N/A',
        log.success ? 'Yes' : 'No',
        `"${JSON.stringify(log.details).replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }
}

module.exports = new AuditService();
