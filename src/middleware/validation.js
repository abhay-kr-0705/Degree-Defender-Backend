const { body, param, query, validationResult } = require('express-validator');
const { logger } = require('../utils/logger');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * Validate certificate upload
 */
const validateCertificateUpload = [
  body('studentName')
    .notEmpty()
    .withMessage('Student name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Student name must be between 2 and 100 characters'),
  
  body('course')
    .notEmpty()
    .withMessage('Course is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Course must be between 2 and 200 characters'),
  
  body('passingYear')
    .isInt({ min: 1950, max: new Date().getFullYear() })
    .withMessage('Passing year must be a valid year'),
  
  body('certificateNumber')
    .notEmpty()
    .withMessage('Certificate number is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Certificate number must be between 3 and 50 characters'),
  
  handleValidationErrors
];

/**
 * Validate ID parameter
 */
const validateId = [
  param('id')
    .isUUID()
    .withMessage('Invalid ID format'),
  
  handleValidationErrors
];

/**
 * Validate pagination parameters
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

/**
 * Validate user registration
 */
const validateUserRegistration = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('phone')
    .optional()
    .isMobilePhone('en-IN')
    .withMessage('Valid Indian phone number is required'),
  
  handleValidationErrors
];

/**
 * Validate user login
 */
const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

/**
 * Validate verification request
 */
const validateVerificationRequest = [
  body('requestedBy')
    .notEmpty()
    .withMessage('Requester name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Requester name must be between 2 and 100 characters'),
  
  body('requestorEmail')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('purpose')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Purpose must not exceed 500 characters'),
  
  handleValidationErrors
];

/**
 * Validate institution creation/update
 */
const validateInstitution = [
  body('name')
    .notEmpty()
    .withMessage('Institution name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Institution name must be between 2 and 200 characters'),
  
  body('code')
    .notEmpty()
    .withMessage('Institution code is required')
    .isLength({ min: 2, max: 20 })
    .withMessage('Institution code must be between 2 and 20 characters')
    .matches(/^[A-Z0-9_-]+$/)
    .withMessage('Institution code must contain only uppercase letters, numbers, underscores, and hyphens'),
  
  body('type')
    .isIn(['UNIVERSITY', 'COLLEGE', 'TECHNICAL_INSTITUTE', 'GOVERNMENT_BODY', 'PRIVATE_INSTITUTE'])
    .withMessage('Invalid institution type'),
  
  body('address')
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Address must be between 10 and 500 characters'),
  
  body('city')
    .notEmpty()
    .withMessage('City is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),
  
  body('state')
    .notEmpty()
    .withMessage('State is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('State must be between 2 and 100 characters'),
  
  body('pincode')
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage('Valid 6-digit pincode is required'),
  
  body('phone')
    .isMobilePhone('en-IN')
    .withMessage('Valid Indian phone number is required'),
  
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('website')
    .optional()
    .isURL()
    .withMessage('Valid website URL is required'),
  
  body('establishedYear')
    .isInt({ min: 1800, max: new Date().getFullYear() })
    .withMessage('Valid establishment year is required'),
  
  handleValidationErrors
];

module.exports = {
  validateCertificateUpload,
  validateId,
  validatePagination,
  validateUserRegistration,
  validateUserLogin,
  validateVerificationRequest,
  validateInstitution,
  handleValidationErrors
};