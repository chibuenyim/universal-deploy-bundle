#!/usr/bin/env node

/**
 * Interactive Setup Wizard
 * 
 * One-time setup for user credentials
 * Stores credentials securely for reuse
 */

const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const keyPath = path.join(process.cwd(), '.deploy-key');
const configPath = path.join(process.cwd(), '.deploy-credentials');

/**
 * Encrypt data
 */
function encrypt(text) {
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return {
    iv: iv.toString('hex'),
    data: encrypted.toString('hex'),
    key: key.toString('hex')
  };
}

/**
 * Decrypt data
 */
function decrypt(text, keyHex, ivHex) {
  const key = Buffer.from(keyHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(Buffer.from(text, 'hex'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

/**
 * Save credentials securely
 */
function saveCredentials(config) {
  const { iv, data, key } = encrypt(JSON.stringify(config));
  
  // Save encrypted credentials
  fs.writeFileSync(configPath, JSON.stringify({ iv, data }));
  
  // Save key separately (user can protect this)
  fs.writeFileSync(keyPath, key);
  
  // Add to .gitignore
  const gitignore = path.join(process.cwd(), '.gitignore');
  const ignoreContent = [
    '# Deploy credentials',
    '.deploy-credentials',
    '.deploy-key',
    '.env',
    ''
  ].join('\n');
  
  if (fs.existsSync(gitignore)) {
    const current = fs.readFileSync(gitignore, 'utf8');
    if (!current.includes('.deploy-credentials')) {
      fs.appendFileSync(gitignore, ignoreContent);
    }
  } else {
    fs.writeFileSync(gitignore, ignoreContent);
  }
  
  console.log('✅ Credentials saved securely!');
  console.log('⚠️  Keep .deploy-key safe and never commit it to git!');
}

/**
 * Load credentials
 */
function loadCredentials() {
  if (!fs.existsSync(configPath) || !fs.existsSync(keyPath)) {
    return null;
  }
  
  try {
    const { iv, data } = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const key = fs.readFileSync(keyPath, 'utf8');
    const decrypted = decrypt(data, key, iv);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('❌ Error loading credentials:', error.message);
    return null;
  }
}

/**
 * Main setup wizard
 */
async function setup() {
  console.log('🚀 Universal Deploy Bundle - Setup Wizard');
  console.log('');
  console.log('This wizard will help you set up your deployment credentials.');
  console.log('You only need to do this ONCE - credentials will be saved securely.');
  console.log('');
  
  // Check if credentials already exist
  const existing = loadCredentials();
  if (existing) {
    console.log('✅ Existing credentials found:');
    console.log(`   SSH Host: ${existing.sshHost}`);
    console.log(`   Remote Path: ${existing.remotePath}`);
    console.log('');
    
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Do you want to overwrite existing credentials?',
        default: false
      }
    ]);
    
    if (!overwrite) {
      console.log('✅ Keeping existing credentials. You can update them anytime by running: npm run setup');
      process.exit(0);
    }
  }
  
  // Ask for credentials
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'sshHost',
      message: 'SSH Host (e.g., root@your-server.com):',
      validate: input => input.includes('@') || 'Please enter in format: user@hostname',
      when: !existing || !existing.sshHost
    },
    {
      type: 'password',
      name: 'sshPassword',
      message: 'SSH Password:',
      mask: '*',
      when: !existing
    },
    {
      type: 'confirm',
      name: 'useSSHKey',
      message: 'Do you want to use SSH key instead of password?',
      default: false,
      when: !existing
    },
    {
      type: 'input',
      name: 'sshKeyPath',
      message: 'SSH Key Path:',
      default: '~/.ssh/id_rsa',
      when: (answers) => answers.useSSHKey && !existing
    },
    {
      type: 'input',
      name: 'remotePath',
      message: 'Remote Path (e.g., /var/www/your-project):',
      default: '/var/www/your-project',
      when: !existing || !existing.remotePath
    },
    {
      type: 'input',
      name: 'url',
      message: 'Application URL (for health checks):',
      default: 'https://your-app.com',
      when: !existing || !existing.url
    },
    {
      type: 'number',
      name: 'frontendPort',
      message: 'Frontend Port:',
      default: 3000,
      when: !existing
    },
    {
      type: 'number',
      name: 'backendPort',
      message: 'Backend Port:',
      default: 3020,
      when: !existing
    },
    {
      type: 'list',
      name: 'environment',
      message: 'Environment name:',
      choices: ['production', 'staging', 'development'],
      default: 'production',
      when: !existing
    }
  ]);
  
  // Merge with existing credentials
  const config = {
    ...existing,
    ...answers
  };
  
  // Save credentials
  saveCredentials(config);
  
  console.log('');
  console.log('✅ Setup complete!');
  console.log('');
  console.log('Your credentials have been saved securely.');
  console.log('You can now deploy with:');
  console.log(`  npm run deploy:${config.environment || 'production'}`);
  console.log('');
  console.log('🔒 Security Notes:');
  console.log('  - .deploy-key has been created - keep it safe!');
  console.log('  - .deploy-credentials contains encrypted data');
  console.log('  - NEVER commit these files to git');
  console.log('  - Both files are already in .gitignore');
  console.log('');
  console.log('💡 Pro Tips:');
  console.log('  - Use SSH keys instead of passwords for better security');
  console.log('  - Run "npm run setup" anytime to update credentials');
  console.log('  - Credentials work across all environments');
}

// Run setup
if (require.main === module) {
  setup().catch(error => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  });
}

module.exports = { setup, saveCredentials, loadCredentials };
