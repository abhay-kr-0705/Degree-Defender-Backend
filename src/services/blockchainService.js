const { ethers } = require('ethers');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { logger } = require('../utils/logger');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contract = null;
    this.contractABI = [
      "function storeCertificate(string memory certificateHash, string memory studentName, string memory course, uint256 passingYear) public returns (uint256)",
      "function verifyCertificate(string memory certificateHash) public view returns (bool, string memory, string memory, uint256, uint256)",
      "function getCertificateCount() public view returns (uint256)",
      "event CertificateStored(uint256 indexed id, string certificateHash, address indexed issuer)"
    ];
    
    this.initializeBlockchain();
  }

  /**
   * Initialize blockchain connection
   */
  async initializeBlockchain() {
    try {
      if (!process.env.ETHEREUM_RPC_URL) {
        logger.error('Blockchain configuration missing. ETHEREUM_RPC_URL is required.');
        throw new Error('Blockchain is mandatory but not configured properly');
      }

      this.provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
      
      // For certificate hashing and verification, we don't need a private key initially
      // We'll use the provider for read operations and hash generation
      if (process.env.PRIVATE_KEY) {
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
      }
      
      if (process.env.CONTRACT_ADDRESS) {
        this.contract = new ethers.Contract(
          process.env.CONTRACT_ADDRESS,
          this.contractABI,
          this.wallet
        );
      }

      logger.info('✅ Blockchain service initialized');
    } catch (error) {
      logger.error('❌ Blockchain initialization failed:', error);
    }
  }

  /**
   * Generate certificate hash
   */
  generateCertificateHash(certificateData) {
    const dataString = JSON.stringify({
      studentName: certificateData.studentName,
      certificateNumber: certificateData.certificateNumber,
      course: certificateData.course,
      passingYear: certificateData.passingYear,
      institutionId: certificateData.institutionId,
      dateOfIssue: certificateData.dateOfIssue
    });

    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Store certificate on blockchain
   */
  async storeCertificateOnBlockchain(certificateData) {
    try {
      if (!this.contract) {
        throw new Error('Blockchain contract not initialized');
      }

      const certificateHash = this.generateCertificateHash(certificateData);
      
      // Store on blockchain
      const tx = await this.contract.storeCertificate(
        certificateHash,
        certificateData.studentName,
        certificateData.course,
        certificateData.passingYear
      );

      const receipt = await tx.wait();
      
      logger.info(`Certificate stored on blockchain. TX: ${receipt.hash}`);
      
      return {
        blockchainHash: certificateHash,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      logger.error('Blockchain storage error:', error);
      throw new Error('Failed to store certificate on blockchain');
    }
  }

  /**
   * Validate certificate using blockchain
   */
  async validateCertificate(certificateHash) {
    try {
      if (!this.contract) {
        logger.warn('Blockchain contract not available for validation');
        return false;
      }

      const [exists, studentName, course, passingYear, timestamp] = 
        await this.contract.verifyCertificate(certificateHash);

      if (exists) {
        logger.info(`Certificate validated on blockchain: ${certificateHash}`);
        return {
          isValid: true,
          studentName,
          course,
          passingYear: passingYear.toString(),
          timestamp: new Date(Number(timestamp) * 1000),
          blockchainHash: certificateHash
        };
      }

      return { isValid: false };
    } catch (error) {
      logger.error('Blockchain validation error:', error);
      return { isValid: false, error: error.message };
    }
  }

  /**
   * Generate QR code for certificate
   */
  async generateQRCode(certificateData) {
    try {
      const qrData = {
        type: 'CERTIFICATE_VERIFICATION',
        certificateId: certificateData.id,
        certificateNumber: certificateData.certificateNumber,
        blockchainHash: certificateData.blockchainHash,
        verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${certificateData.id}`,
        timestamp: new Date().toISOString()
      };

      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return qrCodeDataURL;
    } catch (error) {
      logger.error('QR code generation error:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Create digital signature for certificate
   */
  createDigitalSignature(certificateData) {
    try {
      const dataToSign = JSON.stringify({
        certificateNumber: certificateData.certificateNumber,
        studentName: certificateData.studentName,
        course: certificateData.course,
        passingYear: certificateData.passingYear,
        institutionId: certificateData.institutionId
      });

      const signature = crypto
        .createSign('RSA-SHA256')
        .update(dataToSign)
        .sign(process.env.PRIVATE_SIGNING_KEY || 'default-key', 'hex');

      return signature;
    } catch (error) {
      logger.error('Digital signature creation error:', error);
      throw new Error('Failed to create digital signature');
    }
  }

  /**
   * Verify digital signature
   */
  verifyDigitalSignature(certificateData, signature) {
    try {
      const dataToVerify = JSON.stringify({
        certificateNumber: certificateData.certificateNumber,
        studentName: certificateData.studentName,
        course: certificateData.course,
        passingYear: certificateData.passingYear,
        institutionId: certificateData.institutionId
      });

      const isValid = crypto
        .createVerify('RSA-SHA256')
        .update(dataToVerify)
        .verify(process.env.PUBLIC_SIGNING_KEY || 'default-key', signature, 'hex');

      return isValid;
    } catch (error) {
      logger.error('Digital signature verification error:', error);
      return false;
    }
  }

  /**
   * Generate tamper-proof watermark data
   */
  generateWatermark(certificateData) {
    const watermarkData = {
      id: certificateData.id,
      hash: this.generateCertificateHash(certificateData),
      timestamp: Date.now(),
      checksum: crypto
        .createHash('md5')
        .update(certificateData.studentName + certificateData.certificateNumber)
        .digest('hex')
    };

    return Buffer.from(JSON.stringify(watermarkData)).toString('base64');
  }

  /**
   * Verify watermark integrity
   */
  verifyWatermark(certificateData, watermark) {
    try {
      const watermarkData = JSON.parse(Buffer.from(watermark, 'base64').toString());
      
      const expectedChecksum = crypto
        .createHash('md5')
        .update(certificateData.studentName + certificateData.certificateNumber)
        .digest('hex');

      return watermarkData.checksum === expectedChecksum;
    } catch (error) {
      logger.error('Watermark verification error:', error);
      return false;
    }
  }

  /**
   * Get blockchain network status
   */
  async getNetworkStatus() {
    try {
      if (!this.provider) {
        return { connected: false, message: 'Provider not initialized' };
      }

      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const balance = this.wallet ? await this.provider.getBalance(this.wallet.address) : '0';

      return {
        connected: true,
        network: {
          name: network.name,
          chainId: network.chainId.toString()
        },
        blockNumber,
        walletBalance: ethers.formatEther(balance),
        contractAddress: process.env.CONTRACT_ADDRESS || 'Not configured'
      };
    } catch (error) {
      logger.error('Network status check error:', error);
      return { connected: false, error: error.message };
    }
  }

  /**
   * Estimate gas cost for certificate storage
   */
  async estimateStorageCost(certificateData) {
    try {
      if (!this.contract) {
        return { error: 'Contract not initialized' };
      }

      const certificateHash = this.generateCertificateHash(certificateData);
      const gasEstimate = await this.contract.storeCertificate.estimateGas(
        certificateHash,
        certificateData.studentName,
        certificateData.course,
        certificateData.passingYear
      );

      const gasPrice = await this.provider.getGasPrice();
      const costInWei = gasEstimate * gasPrice;
      const costInEth = ethers.formatEther(costInWei);

      return {
        gasEstimate: gasEstimate.toString(),
        gasPrice: ethers.formatUnits(gasPrice, 'gwei'),
        costInEth,
        costInWei: costInWei.toString()
      };
    } catch (error) {
      logger.error('Gas estimation error:', error);
      return { error: error.message };
    }
  }
}

module.exports = new BlockchainService();
