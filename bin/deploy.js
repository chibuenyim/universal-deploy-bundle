#!/usr/bin/env node

/**
 * Universal Deploy Bundle - Main Entry Point
 *
 * A zero-hardcoding deployment solution for ANY Next.js/Node.js project
 * Designed as the interface to AI automation
 *
 * Usage:
 *   universal-deploy [environment] [options]
 *   npm run deploy:production
 *   npx universal-deploy-bundle production
 */

const path = require('path');
const { spawn } = require('child_process');

// Core deployer path
const UNIVERSAL_DEPLOYER = path.join(__dirname, '..', 'core', 'intelligent-deployer-universal.js');

/**
 * Main deployment function
 */
async function main() {
  const args = process.argv.slice(2);

  // Show help if requested
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  // Get environment
  const environment = args[0] || 'production';
  const validEnvironments = ['production', 'staging', 'development'];

  if (!validEnvironments.includes(environment)) {
    console.error(`❌ Invalid environment: ${environment}`);
    console.error(`Valid environments: ${validEnvironments.join(', ')}`);
    process.exit(1);
  }

  console.log('🚀 Universal Deploy Bundle v2.0.0');
  console.log(`📦 Environment: ${environment.toUpperCase()}`);
  console.log('');

  // Execute universal deployer
  const deployer = spawn('node', [UNIVERSAL_DEPLOYER, ...args], {
    stdio: 'inherit',
    env: { ...process.env }
  });

  deployer.on('close', (code) => {
    process.exit(code || 0);
  });

  deployer.on('error', (err) => {
    console.error(`❌ Failed to start deployer: ${err.message}`);
    process.exit(1);
  });
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
🚀 Universal Deploy Bundle - AI Automation Interface

USAGE:
  universal-deploy [environment] [options]
  npm run deploy:production
  npx universal-deploy-bundle staging

ENVIRONMENTS:
  production   Deploy to production (default)
  staging      Deploy to staging
  development  Deploy to development (local)

OPTIONS:
  --ssh <host>              SSH host (user@hostname or IP)
  --config <path>           Path to config file
  --local                   Run locally (no SSH)
  --verify                 Only run health checks
  --branch <name>           Git branch to deploy
  --url <url>               Application URL for verification
  --port <number>           Frontend port
  --backend-port <number>   Backend port
  --help, -h                Show this help

QUICK START:
  1. Install: npm install universal-deploy-bundle
  2. Setup: npm run setup
  3. Deploy: npm run deploy:production

EXAMPLES:
  # Deploy to production
  universal-deploy production --ssh root@yourserver.com

  # Deploy to staging with specific branch
  universal-deploy staging --ssh root@yourserver.com --branch feature-auth

  # Local development deployment
  universal-deploy development --local

  # Health check only
  universal-deploy production --verify

  # Using environment variables
  DEPLOY_SSH_HOST=root@server.com DEPLOY_ENV=production universal-deploy

CONFIGURATION:
  Create .deploy-config.json in your project root:
  {
    "sshHost": "root@yourserver.com",
    "remotePath": "/var/www/your-project",
    "url": "https://your-app.com",
    "frontendPort": 3000,
    "backendPort": 3020,
    "branch": "main"
  }

AI AUTOMATION:
  This bundle is designed as the interface for AI automation.
  Benefits:
  - Standardized interface across all projects
  - Predictable behavior and output
  - Self-healing with auto-recovery
  - Zero hardcoding for maximum portability

  Perfect for:
  - Automated deployment pipelines
  - AI-powered deployment systems
  - CI/CD integration
  - Multi-project deployment management

For more information:
  - https://github.com/chibuenyim/universal-deploy-bundle
  - Documentation: docs/README.md
`);
}

if (require.main === module) {
  main().catch(err => {
    console.error(`❌ Deployment failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { main };
