const { ethers } = require('ethers');
const crypto = require('crypto');

/**
 * Generate Ethereum wallet and keys for blockchain integration
 */
function generateEthereumWallet() {
  console.log('🔑 Generating Ethereum wallet for blockchain integration...\n');
  
  // Generate random wallet
  const wallet = ethers.Wallet.createRandom();
  
  console.log('📋 Wallet Details:');
  console.log('================');
  console.log(`Address: ${wallet.address}`);
  console.log(`Private Key: ${wallet.privateKey}`);
  console.log(`Mnemonic: ${wallet.mnemonic.phrase}`);
  
  console.log('\n🔧 Environment Variables:');
  console.log('========================');
  console.log(`PRIVATE_KEY="${wallet.privateKey}"`);
  console.log(`WALLET_ADDRESS="${wallet.address}"`);
  
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic.phrase
  };
}

/**
 * Generate RSA key pair for digital signatures
 */
function generateRSAKeys() {
  console.log('\n🔐 Generating RSA key pair for digital signatures...\n');
  
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  console.log('📋 RSA Keys Generated:');
  console.log('=====================');
  console.log('Private Key (for signing):');
  console.log(privateKey);
  console.log('\nPublic Key (for verification):');
  console.log(publicKey);
  
  console.log('\n🔧 Environment Variables:');
  console.log('========================');
  console.log(`PRIVATE_SIGNING_KEY="${privateKey.replace(/\n/g, '\\n')}"`);
  console.log(`PUBLIC_SIGNING_KEY="${publicKey.replace(/\n/g, '\\n')}"`);
  
  return { publicKey, privateKey };
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Degree Defenders - Blockchain Key Generation');
    console.log('===============================================\n');
    
    // Generate Ethereum wallet
    const ethWallet = generateEthereumWallet();
    
    // Generate RSA keys
    const rsaKeys = generateRSAKeys();
    
    console.log('\n✅ Key generation completed successfully!');
    console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
    console.log('============================');
    console.log('1. Store these keys securely and never share them publicly');
    console.log('2. Add the private keys to your .env file');
    console.log('3. The Ethereum address needs to be funded for mainnet transactions');
    console.log('4. For testing, you can use testnets like Sepolia or Goerli');
    console.log('5. Consider using hardware wallets for production');
    
    console.log('\n📝 Next Steps:');
    console.log('==============');
    console.log('1. Copy the environment variables to your .env file');
    console.log('2. Fund the Ethereum address with ETH for gas fees');
    console.log('3. Deploy the smart contract using the deployment script');
    console.log('4. Test the complete blockchain integration');
    
  } catch (error) {
    console.error('❌ Error generating keys:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateEthereumWallet, generateRSAKeys };
