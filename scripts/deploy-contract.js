const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Deploy CertificateRegistry smart contract to Ethereum network
 */
async function deployContract() {
  try {
    console.log('🚀 Deploying CertificateRegistry Smart Contract');
    console.log('==============================================\n');

    // Check environment variables
    if (!process.env.ETHEREUM_RPC_URL) {
      throw new Error('ETHEREUM_RPC_URL not found in environment variables');
    }

    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not found in environment variables');
    }

    // Connect to Ethereum network
    console.log('🔗 Connecting to Ethereum network...');
    const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log(`📍 Network: ${(await provider.getNetwork()).name}`);
    console.log(`💰 Deployer Address: ${wallet.address}`);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`💳 Balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance === 0n) {
      console.log('⚠️  WARNING: Deployer address has no ETH balance!');
      console.log('   For mainnet deployment, you need ETH for gas fees.');
      console.log('   For testing, use a testnet like Sepolia or Goerli.');
    }

    // Read contract source code
    const contractPath = path.join(__dirname, '..', 'contracts', 'CertificateRegistry.sol');
    if (!fs.existsSync(contractPath)) {
      throw new Error('CertificateRegistry.sol not found');
    }

    console.log('\n📄 Contract source code found');

    // For this example, we'll provide the compiled bytecode and ABI
    // In a real deployment, you'd use Hardhat or Truffle for compilation
    const contractABI = [
      "constructor()",
      "function storeCertificate(string memory certificateHash, string memory studentName, string memory course, uint256 passingYear) external returns (uint256)",
      "function verifyCertificate(string memory certificateHash) external view returns (bool, string memory, string memory, uint256, uint256)",
      "function authorizeInstitution(address institution, string memory name) external",
      "function getCertificateCount() external view returns (uint256)",
      "function owner() external view returns (address)",
      "event CertificateStored(string indexed certificateHash, address indexed issuer, string studentName, string course, uint256 passingYear)"
    ];

    // Note: In production, you would compile the Solidity contract to get bytecode
    // For now, we'll show the deployment process structure
    console.log('\n⚠️  CONTRACT COMPILATION NEEDED');
    console.log('================================');
    console.log('To deploy the smart contract, you need to:');
    console.log('1. Install Hardhat: npm install --save-dev hardhat');
    console.log('2. Initialize Hardhat project: npx hardhat init');
    console.log('3. Compile the contract: npx hardhat compile');
    console.log('4. Deploy using Hardhat scripts');
    
    console.log('\n📋 Contract ABI Preview:');
    console.log(JSON.stringify(contractABI, null, 2));

    // Estimate deployment cost (approximate)
    const gasPrice = await provider.getGasPrice();
    const estimatedGas = 2000000n; // Approximate gas for contract deployment
    const deploymentCost = gasPrice * estimatedGas;
    
    console.log('\n💰 Estimated Deployment Cost:');
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    console.log(`   Estimated Gas: ${estimatedGas.toString()}`);
    console.log(`   Total Cost: ${ethers.formatEther(deploymentCost)} ETH`);

    return {
      contractABI,
      deployerAddress: wallet.address,
      networkName: (await provider.getNetwork()).name,
      estimatedCost: ethers.formatEther(deploymentCost)
    };

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    throw error;
  }
}

/**
 * Create Hardhat configuration for contract deployment
 */
function createHardhatConfig() {
  const hardhatConfig = `require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    mainnet: {
      url: process.env.ETHEREUM_RPC_URL,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto"
    },
    sepolia: {
      url: "https://sepolia.infura.io/v3/" + process.env.INFURA_PROJECT_ID,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto"
    },
    goerli: {
      url: "https://goerli.infura.io/v3/" + process.env.INFURA_PROJECT_ID,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto"
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};`;

  return hardhatConfig;
}

/**
 * Create deployment script for Hardhat
 */
function createDeploymentScript() {
  const deployScript = `const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying CertificateRegistry contract...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
  const certificateRegistry = await CertificateRegistry.deploy();

  await certificateRegistry.deployed();

  console.log("CertificateRegistry deployed to:", certificateRegistry.address);
  console.log("Transaction hash:", certificateRegistry.deployTransaction.hash);

  // Verify contract on Etherscan (optional)
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await certificateRegistry.deployTransaction.wait(6);
    
    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: certificateRegistry.address,
        constructorArguments: [],
      });
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }

  return certificateRegistry.address;
}

main()
  .then((address) => {
    console.log("\\n✅ Deployment completed successfully!");
    console.log("Contract Address:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });`;

  return deployScript;
}

// Main execution
async function main() {
  try {
    const deploymentInfo = await deployContract();
    
    console.log('\n📁 Creating Hardhat configuration files...');
    
    // Create hardhat.config.js
    const hardhatConfigPath = path.join(__dirname, '..', 'hardhat.config.js');
    fs.writeFileSync(hardhatConfigPath, createHardhatConfig());
    console.log('✅ Created hardhat.config.js');
    
    // Create deployment script
    const scriptsDir = path.join(__dirname, '..', 'scripts', 'hardhat');
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }
    
    const deployScriptPath = path.join(scriptsDir, 'deploy.js');
    fs.writeFileSync(deployScriptPath, createDeploymentScript());
    console.log('✅ Created deployment script');
    
    console.log('\n🎯 Next Steps for Contract Deployment:');
    console.log('====================================');
    console.log('1. Install Hardhat dependencies:');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox');
    console.log('');
    console.log('2. Compile the contract:');
    console.log('   npx hardhat compile');
    console.log('');
    console.log('3. Deploy to testnet (recommended first):');
    console.log('   npx hardhat run scripts/hardhat/deploy.js --network sepolia');
    console.log('');
    console.log('4. Deploy to mainnet (when ready):');
    console.log('   npx hardhat run scripts/hardhat/deploy.js --network mainnet');
    console.log('');
    console.log('5. Update .env with CONTRACT_ADDRESS after deployment');

  } catch (error) {
    console.error('Script execution failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { deployContract, createHardhatConfig, createDeploymentScript };
