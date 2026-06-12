# 🚀 Universal Deploy Bundle

[![AI Automation Ready](https://img.shields.io/badge/AI%20Automation-Ready-brightgreen)](https://github.com/chibuenyim/universal-deploy-bundle)
[![License: MIT](https://img.shields.io/badge/License-MIT%20with%20restrictions-yellow)](LICENSE)

**A zero-hardcoding deployment solution for ANY Next.js/Node.js project with AI automation interface.**

## ✨ Features

- 🎯 **Zero Hardcoding** - Works for ANY project without modification
- 🤖 **AI Automation Interface** - Perfect for automated deployment systems
- 🔍 **Auto-Discovery** - Automatically detects project structure
- 🛡️ **Production-Grade Safety** - Prevents duplicate processes, builds with verification
- 🔄 **Auto-Recovery** - Self-healing deployments with retry logic
- 🔐 **Secure Credential Storage** - One-time setup, secure reuse
- 🌐 **SSH Orchestration** - Remote deployment with node-ssh

## 🚀 Quick Start (3 Steps)

### Step 1: Install

```bash
npm install universal-deploy-bundle
```

### Step 2: Run Setup Wizard

```bash
npm run setup
```

The setup wizard will ask for:
- SSH credentials (host, password/key)
- Remote path
- Application URL
- Port numbers

**⚠️ IMPORTANT**: Credentials are encrypted and stored locally. Never committed to git!

### Step 3: Deploy

```bash
npm run deploy:production
```

That's it! Your credentials are saved and reused automatically.

## 📖 How It Works

### Auto-Discovery (No Configuration Needed)

The universal deployer automatically discovers:
- ✅ Project structure (frontend/backend)
- ✅ Build scripts
- ✅ PM2 processes
- ✅ Port usage
- ✅ Remote directories

### What You Provide (One-Time Setup)

You ONLY provide:
- 🔐 SSH credentials (securely stored)
- 🌐 Application URL
- 📁 Remote path

### Security Features

- 🔒 Encrypted credential storage
- 🔒 One-time setup wizard
- 🔒 Credentials never committed to git
- 🔒 node-ssh for secure connections
- 🔒 SSH key support

## 📖 Usage

### First Time Setup

```bash
# Run the interactive setup wizard
npm run setup

# Deploy (credentials are auto-loaded)
npm run deploy:production
```

### Update Credentials

```bash
# Run setup again to update
npm run setup
```

### Deploy to Different Environments

```bash
npm run deploy:production
npm run deploy:staging
npm run deploy:local
```

### Health Check Only

```bash
npm run deploy:verify
```

## 🔐 Security

### Credential Storage

Credentials are encrypted and stored locally:
- `.deploy-credentials` - Encrypted data
- `.deploy-key` - Encryption key
- Both files are in `.gitignore`

### Best Practices

- ✅ Use SSH keys instead of passwords
- ✅ Keep `.deploy-key` safe
- ✅ Never commit credentials to git
- ✅ Run setup wizard for each project

## 🤖 AI Automation Interface

### Structured Output

```javascript
{
  success: true,
  deploymentId: 'abc123',
  health: 'healthy',
  processes: ['frontend', 'backend']
}
```

### AI Integration

```javascript
const deploy = require('universal-deploy-bundle');

// Deploy with saved credentials
await deploy('production');

// Structured response for AI
const result = await deploy('production');
console.log(result);
```

## 📚 Documentation

- [User Guide](USER-GUIDE.md) - Detailed setup guide
- [Security Notice](SECURITY-NOTICE.md) - Security best practices
- [Quick Start](QUICK-START.md) - 3-step quick start

## 🎯 Supported Projects

- ✅ Next.js (Frontend)
- ✅ NestJS (Backend)
- ✅ Express.js (Backend)
- ✅ Generic Node.js applications
- ✅ Monorepo structures

## 📄 License

MIT License with COMMERCIAL USE RESTRICTIONS.

Commercial use requires explicit permission and may be subject to licensing fees.

See [LICENSE](LICENSE) file for details.

## 🙋 Support

- 📧 Issues: [GitHub Issues](https://github.com/chibuenyim/universal-deploy-bundle/issues)
- 📚 Documentation: https://github.com/chibuenyim/universal-deploy-bundle

---

**Perfect automation through universal deployment!** 🚀

---

## 🏢 Enterprise Services & Professional Setup

### Need More Than the Free Version?

While the **Universal Deploy Bundle** is free and open source, some teams need more.

### 💼 Who Needs Enterprise Services?

**Perfect for teams that need:**
- ✅ AI automation interface for their systems
- ✅ Project-specific configurations
- ✅ Internal team usage and training
- ✅ Integration with existing infrastructure

### 📦 Service Packages

#### 🚀 Starter Package - $500
- Professional setup and configuration
- Team training
- 30 days support

#### 🏢 Professional Package - $2,000
- Multi-environment setup
- CI/CD integration
- 90 days priority support

#### 🎯 Enterprise Package - $5,000+
- Unlimited environments and projects
- 24/7 support SLA
- Custom feature development
- On-premise deployment

### 📞 Get Started

**Contact us for a free consultation:**

📧 **Email:** admin@agentic-toolkit.com

**We'll respond within 24 hours with a personalized proposal.**

**[View Full Enterprise Services →](ENTERPRISE.md)**
