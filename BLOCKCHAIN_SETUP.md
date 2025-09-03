# Blockchain Integration Setup Guide

## 🚀 Complete Blockchain Implementation for Degree Defenders

This guide provides step-by-step instructions to complete the blockchain integration for the Government of Jharkhand's Authenticity Validator for Academia platform.

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL database running
- Infura account (API key already configured)
- Basic understanding of Ethereum blockchain

## 🔧 Step 1: Generate Blockchain Keys

Run the key generation script to create Ethereum wallet and RSA keys:

```bash
node scripts/generate-keys.js
```

This will generate:
- Ethereum private key and wallet address
- RSA key pair for digital signatures
- Environment variables to add to `.env`

**⚠️ SECURITY WARNING**: Store these keys securely and never share them publicly!

## 🔑 Step 2: Update Environment Variables

Add the generated keys to your `.env` file:

```env
# Blockchain Configuration (Already configured)
ETHEREUM_NETWORK="mainnet"
ETHEREUM_RPC_URL="https://mainnet.infura.io/v3/9f56a1bd26f7412dada9bb741714ddf2"
INFURA_PROJECT_ID="9f56a1bd26f7412dada9bb741714ddf2"

# Add these from key generation:
PRIVATE_KEY="your-generated-private-key"
WALLET_ADDRESS="your-generated-wallet-address"
PRIVATE_SIGNING_KEY="your-rsa-private-key"
PUBLIC_SIGNING_KEY="your-rsa-public-key"

# Optional: Smart Contract (after deployment)
CONTRACT_ADDRESS=""
```

## 📦 Step 3: Install Additional Dependencies

Install Hardhat for smart contract deployment:

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

## 🏗️ Step 4: Deploy Smart Contract (Optional)

For full blockchain storage capabilities:

```bash
# Initialize Hardhat project
npx hardhat init

# Compile the contract
npx hardhat compile

# Deploy to testnet first (recommended)
npx hardhat run scripts/hardhat/deploy.js --network sepolia

# Deploy to mainnet (when ready)
npx hardhat run scripts/hardhat/deploy.js --network mainnet
```

After deployment, add the contract address to your `.env` file.

## 🧪 Step 5: Test Blockchain Integration

Run comprehensive tests to verify everything is working:

```bash
node scripts/test-blockchain.js
```

This tests:
- Network connectivity
- Certificate hash generation
- QR code creation with blockchain data
- Digital signatures and watermarks
- Database integration
- Verification workflows

## 🎯 Features Implemented

### ✅ Mandatory Blockchain Features

1. **Certificate Hash Generation**
   - SHA-256 cryptographic hashing
   - Unique fingerprint for each certificate
   - Tamper detection capability

2. **QR Code with Blockchain Verification**
   - Embedded blockchain hash
   - Verification URL with certificate ID
   - Timestamp for authenticity

3. **Digital Signatures**
   - RSA-2048 cryptographic signatures
   - Certificate authenticity validation
   - Non-repudiation support

4. **Digital Watermarks**
   - Tamper-proof certificate marking
   - Base64 encoded metadata
   - Integrity verification

5. **Blockchain Validation**
   - Mandatory for new certificates
   - Legacy certificate support
   - Real-time verification

### 🔍 Anti-Fraud Detection

1. **Tampered Grades Detection**
   - Invalid CGPA/percentage validation
   - Grade-percentage consistency checks
   - Statistical anomaly detection

2. **Forged Document Detection**
   - OCR confidence analysis
   - Pattern recognition for suspicious data
   - Digital signature verification

3. **Invalid Certificate Numbers**
   - Sequential pattern detection
   - Duplicate number identification
   - Format validation

4. **Institution Validation**
   - Database cross-verification
   - Active institution checks
   - Authorization validation

## 🌐 API Endpoints

### Certificate Upload with Blockchain
```
POST /api/certificates/upload
- Generates blockchain hash
- Creates QR code with verification data
- Stores digital signature and watermark
```

### Blockchain Verification
```
POST /api/verifications/verify
- Mandatory blockchain validation
- Comprehensive fraud detection
- Confidence scoring
```

### QR Code Verification
```
POST /api/verifications/qr-verify
- Blockchain hash validation
- Real-time authenticity check
- Tamper detection
```

### Admin Blockchain Monitoring
```
GET /api/admin/blockchain/status
- Network status monitoring
- Blockchain statistics
- Recent activity tracking

POST /api/admin/blockchain/verify-batch
- Batch certificate verification
- Blockchain validation for multiple certificates
```

## 🔒 Security Features

### Cryptographic Security
- **SHA-256 Hashing**: Tamper-proof certificate fingerprints
- **RSA-2048 Signatures**: Digital authenticity validation
- **Ethereum Integration**: Immutable record storage
- **Base64 Watermarks**: Embedded authenticity markers

### Fraud Prevention
- **Multi-layer Validation**: Database + Blockchain + OCR + AI
- **Anomaly Detection**: Statistical analysis for suspicious patterns
- **Duplicate Prevention**: Hash-based duplicate detection
- **Institution Verification**: Real-time authorization checks

## 📊 Monitoring & Analytics

### Admin Dashboard Features
- Blockchain network status
- Certificate verification statistics
- Fraud detection analytics
- Real-time activity monitoring

### Verification Metrics
- Confidence scoring (0-100%)
- Blockchain coverage percentage
- Fraud detection rate
- Verification success rate

## 🚀 Production Deployment

### For Testnet (Recommended First)
1. Use Sepolia or Goerli testnet
2. Get test ETH from faucets
3. Deploy and test thoroughly
4. Validate all features

### For Mainnet Production
1. Fund wallet with ETH for gas fees
2. Deploy smart contract
3. Update CONTRACT_ADDRESS in .env
4. Monitor blockchain transactions
5. Set up alerts for failures

## 📞 Support & Troubleshooting

### Common Issues
1. **Network Connection Errors**: Check Infura API key and network status
2. **Gas Fee Issues**: Ensure wallet has sufficient ETH balance
3. **Contract Deployment**: Verify Hardhat configuration and network settings
4. **Database Errors**: Check PostgreSQL connection and schema

### Monitoring
- Monitor Infura usage limits
- Track gas costs and optimize
- Set up blockchain network alerts
- Monitor certificate verification rates

## 🎉 Completion Status

✅ **All mandatory blockchain features implemented**
✅ **Comprehensive fraud detection system**
✅ **QR code verification with blockchain**
✅ **Digital signatures and watermarks**
✅ **Admin monitoring dashboard**
✅ **Legacy certificate support**
✅ **Production-ready architecture**

The Degree Defenders platform now has a complete, secure, and scalable blockchain integration that meets all Government of Jharkhand requirements for academic certificate authenticity validation.
