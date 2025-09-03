const nodemailer = require('nodemailer');
const twilio = require('twilio');
const { getPrismaClient } = require('../config/database');
const { logger } = require('../utils/logger');

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.twilioClient = null;
    this.initializeServices();
  }

  /**
   * Initialize email and SMS services
   */
  initializeServices() {
    // Initialize email transporter
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      logger.info('✅ Email service initialized');
    } else {
      logger.warn('⚠️ Email service not configured');
    }

    // Initialize Twilio client
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      logger.info('✅ SMS service initialized');
    } else {
      logger.warn('⚠️ SMS service not configured');
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(to, subject, htmlContent, textContent = null) {
    if (!this.emailTransporter) {
      logger.warn('Email service not available');
      return false;
    }

    try {
      const mailOptions = {
        from: `${process.env.FROM_NAME || 'Degree Defenders'} <${process.env.FROM_EMAIL}>`,
        to,
        subject,
        html: htmlContent,
        text: textContent || this.stripHtml(htmlContent),
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to}`, { messageId: result.messageId });
      return true;
    } catch (error) {
      logger.error('Email sending failed:', error);
      return false;
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(to, message) {
    if (!this.twilioClient) {
      logger.warn('SMS service not available');
      return false;
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      });

      logger.info(`SMS sent successfully to ${to}`, { sid: result.sid });
      return true;
    } catch (error) {
      logger.error('SMS sending failed:', error);
      return false;
    }
  }

  /**
   * Create system notification
   */
  async createSystemNotification(userId, type, title, message) {
    try {
      const prisma = getPrismaClient();
      
      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
        },
      });

      logger.info('System notification created', { notificationId: notification.id, userId });
      return notification;
    } catch (error) {
      logger.error('Failed to create system notification:', error);
      return null;
    }
  }

  /**
   * Send verification result notification
   */
  async sendVerificationNotification(verification) {
    try {
      const { requestorEmail, requestedBy, isValid, certificate } = verification;
      
      const subject = `Certificate Verification Result - ${certificate.certificateNumber}`;
      const htmlContent = this.generateVerificationEmailTemplate({
        requestedBy,
        certificate,
        isValid,
        verificationCode: verification.verificationCode,
      });

      await this.sendEmail(requestorEmail, subject, htmlContent);
      
      // Send SMS if phone number is available
      if (verification.requestorPhone) {
        const smsMessage = `Certificate ${certificate.certificateNumber} verification ${isValid ? 'PASSED' : 'FAILED'}. Code: ${verification.verificationCode}`;
        await this.sendSMS(verification.requestorPhone, smsMessage);
      }

      return true;
    } catch (error) {
      logger.error('Failed to send verification notification:', error);
      return false;
    }
  }

  /**
   * Send anomaly alert to administrators
   */
  async sendAnomalyAlert(anomaly, certificate) {
    try {
      const prisma = getPrismaClient();
      
      // Get administrators for the institution
      const admins = await prisma.user.findMany({
        where: {
          OR: [
            { role: 'SUPER_ADMIN' },
            {
              AND: [
                { role: 'UNIVERSITY_ADMIN' },
                { institutionId: certificate.institutionId }
              ]
            }
          ],
          isActive: true,
        },
      });

      const subject = `🚨 Security Alert: ${anomaly.type} Detected`;
      const htmlContent = this.generateAnomalyAlertTemplate({
        anomaly,
        certificate,
      });

      // Send email to all administrators
      for (const admin of admins) {
        await this.sendEmail(admin.email, subject, htmlContent);
        
        // Create system notification
        await this.createSystemNotification(
          admin.id,
          'SYSTEM',
          'Security Alert',
          `${anomaly.type} detected in certificate ${certificate.certificateNumber}`
        );
      }

      return true;
    } catch (error) {
      logger.error('Failed to send anomaly alert:', error);
      return false;
    }
  }

  /**
   * Send certificate status update notification
   */
  async sendCertificateStatusNotification(certificate, oldStatus, newStatus, updatedBy) {
    try {
      const prisma = getPrismaClient();
      
      // Get institution administrators
      const admins = await prisma.user.findMany({
        where: {
          institutionId: certificate.institutionId,
          role: 'UNIVERSITY_ADMIN',
          isActive: true,
        },
      });

      const subject = `Certificate Status Updated - ${certificate.certificateNumber}`;
      const htmlContent = this.generateStatusUpdateTemplate({
        certificate,
        oldStatus,
        newStatus,
        updatedBy,
      });

      for (const admin of admins) {
        await this.sendEmail(admin.email, subject, htmlContent);
        
        await this.createSystemNotification(
          admin.id,
          'SYSTEM',
          'Certificate Status Updated',
          `Certificate ${certificate.certificateNumber} status changed from ${oldStatus} to ${newStatus}`
        );
      }

      return true;
    } catch (error) {
      logger.error('Failed to send status update notification:', error);
      return false;
    }
  }

  /**
   * Send bulk verification report
   */
  async sendBulkVerificationReport(institutionId, reportData) {
    try {
      const prisma = getPrismaClient();
      
      const admins = await prisma.user.findMany({
        where: {
          institutionId,
          role: 'UNIVERSITY_ADMIN',
          isActive: true,
        },
        include: {
          institution: true,
        },
      });

      const subject = `Weekly Verification Report - ${admins[0]?.institution?.name}`;
      const htmlContent = this.generateReportTemplate(reportData);

      for (const admin of admins) {
        await this.sendEmail(admin.email, subject, htmlContent);
      }

      return true;
    } catch (error) {
      logger.error('Failed to send bulk verification report:', error);
      return false;
    }
  }

  /**
   * Generate verification email template
   */
  generateVerificationEmailTemplate({ requestedBy, certificate, isValid, verificationCode }) {
    const statusColor = isValid ? '#22c55e' : '#ef4444';
    const statusText = isValid ? 'VERIFIED' : 'VERIFICATION FAILED';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Certificate Verification Result</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">Degree Defenders</h1>
            <p style="color: #666;">Certificate Verification System</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin-top: 0;">Verification Result</h2>
            <p>Dear ${requestedBy},</p>
            <p>Your certificate verification request has been processed.</p>
          </div>
          
          <div style="border: 2px solid ${statusColor}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <div style="text-align: center;">
              <h3 style="color: ${statusColor}; margin: 0;">${statusText}</h3>
              <p style="margin: 10px 0;"><strong>Verification Code:</strong> ${verificationCode}</p>
            </div>
          </div>
          
          <div style="background: #fff; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px;">
            <h3>Certificate Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Certificate Number:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${certificate.certificateNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Student Name:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${certificate.studentName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Course:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${certificate.course}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Institution:</strong></td>
                <td style="padding: 8px 0;">${certificate.institution?.name || 'N/A'}</td>
              </tr>
            </table>
          </div>
          
          <div style="margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
            <p>This is an automated message from Degree Defenders.</p>
            <p>For support, contact: support@degreedefenders.gov.in</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate anomaly alert template
   */
  generateAnomalyAlertTemplate({ anomaly, certificate }) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Security Alert</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #dc2626; margin-top: 0;">🚨 Security Alert</h2>
            <p><strong>Anomaly Type:</strong> ${anomaly.type.replace(/_/g, ' ')}</p>
            <p><strong>Severity:</strong> ${anomaly.severity}</p>
            <p><strong>Description:</strong> ${anomaly.description}</p>
          </div>
          
          <div style="background: #fff; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px;">
            <h3>Certificate Information</h3>
            <p><strong>Certificate Number:</strong> ${certificate.certificateNumber}</p>
            <p><strong>Student Name:</strong> ${certificate.studentName}</p>
            <p><strong>Course:</strong> ${certificate.course}</p>
            <p><strong>Detection Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 8px;">
            <p style="margin: 0;"><strong>Action Required:</strong> Please review this certificate immediately and take appropriate action.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate status update template
   */
  generateStatusUpdateTemplate({ certificate, oldStatus, newStatus, updatedBy }) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Certificate Status Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Certificate Status Updated</h2>
          <p>Certificate ${certificate.certificateNumber} status has been updated.</p>
          
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Previous Status:</strong> ${oldStatus}</p>
            <p><strong>New Status:</strong> ${newStatus}</p>
            <p><strong>Updated By:</strong> ${updatedBy.firstName} ${updatedBy.lastName}</p>
            <p><strong>Update Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate report template
   */
  generateReportTemplate(reportData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Weekly Verification Report</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Weekly Verification Report</h2>
          <p>Here's your weekly verification summary:</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
            <h3>Statistics</h3>
            <p><strong>Total Verifications:</strong> ${reportData.totalVerifications}</p>
            <p><strong>Successful Verifications:</strong> ${reportData.successfulVerifications}</p>
            <p><strong>Failed Verifications:</strong> ${reportData.failedVerifications}</p>
            <p><strong>Anomalies Detected:</strong> ${reportData.anomaliesDetected}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Strip HTML tags from content
   */
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId, userId) {
    try {
      const prisma = getPrismaClient();
      
      await prisma.notification.update({
        where: {
          id: notificationId,
          userId,
        },
        data: {
          isRead: true,
        },
      });

      return true;
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      return false;
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId, limit = 10, offset = 0) {
    try {
      const prisma = getPrismaClient();
      
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return notifications;
    } catch (error) {
      logger.error('Failed to get user notifications:', error);
      return [];
    }
  }
}

module.exports = new NotificationService();
