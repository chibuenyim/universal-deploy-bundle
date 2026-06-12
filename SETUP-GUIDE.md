# 🎯 Easy Setup Guide - One-Time Credential Configuration

## 🚀 How Easy Setup Works

The Universal Deploy Bundle uses **interactive setup wizard** that:

1. ✅ Asks for your credentials **ONE TIME**
2. ✅ Encrypts and stores them securely
3. ✅ Reuses them automatically for all future deployments
4. ✅ Never commits them to git

## 🔐 What Makes It Easy

### No More Repeated Credentials Entry

**Before (Old Way):**
```bash
# Had to provide credentials every time
node deploy.js production --ssh root@server.com --password mypass
```

**After (New Way):**
```bash
# One-time setup
npm run setup

# Deploy anytime (credentials auto-loaded)
npm run deploy:production
```

### Secure Storage

Credentials are:
- 🔒 Encrypted with AES-256-CBC
- 🔒 Stored locally in `.deploy-credentials`
- 🔒 Encryption key in `.deploy-key`
- 🔒 Both files in `.gitignore`
- 🔒 Never committed to git

## 📝 Step-by-Step Setup

### Step 1: Install

```bash
npm install universal-deploy-bundle
```

### Step 2: Run Setup Wizard

```bash
npm run setup
```

### Step 3: Answer Questions

The wizard will ask:

```
🚀 Universal Deploy Bundle - Setup Wizard

SSH Host (e.g., root@your-server.com): root@myserver.com
SSH Password: ********
Remote Path (e.g., /var/www/your-project): /var/www/myproject
Application URL (for health checks): https://myapp.com
Frontend Port: 3000
Backend Port: 3020
Environment name: production
```

### Step 4: Deploy

```bash
npm run deploy:production
```

**That's it!** Your saved credentials are automatically used.

## 🔑 Advanced: SSH Keys (Recommended)

Instead of passwords, use SSH keys for better security:

### Setup SSH Keys

```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -C "deploy@myapp.com"

# Copy public key to server
ssh-copy-id root@myserver.com

# Test connection
ssh root@myserver.com
```

### Use in Setup Wizard

```bash
npm run setup
```

When asked:
```
Do you want to use SSH key instead of password? Yes
SSH Key Path: ~/.ssh/id_rsa
```

## 📁 What Gets Created

After setup, these files are created:

### .deploy-credentials (Encrypted)
```json
{
  "iv": "random-iv-string",
  "data": "encrypted-credentials-data"
}
```

### .deploy-key (Encryption Key)
```
random-encryption-key
```

### .gitignore (Auto-Updated)
```
# Deploy credentials
.deploy-credentials
.deploy-key
```

## 🔄 Updating Credentials

Run setup wizard anytime to update:

```bash
npm run setup
```

You'll be asked:
```
Existing credentials found:
   SSH Host: root@myserver.com

Do you want to overwrite existing credentials? Yes
```

## 🎯 Credentials Storage

### How It Works

1. **Encryption**:
   - Credentials encrypted with AES-256-CBC
   - Random IV and key generated
   - Key stored separately

2. **Storage**:
   - Encrypted data in `.deploy-credentials`
   - Encryption key in `.deploy-key`
   - Both in `.gitignore`

3. **Usage**:
   - Deployer auto-loads credentials
   - No user input needed after setup
   - Secure decryption at runtime

### Security Architecture

```
User Input
    ↓
AES-256-CBC Encryption
    ↓
Split Storage:
├── .deploy-credentials (encrypted data)
└── .deploy-key (encryption key)
    ↓
.gitignore protection
    ↓
Never committed to git
```

## 💡 Pro Tips

### 1. Use SSH Keys

```bash
# Better than passwords
ssh-keygen -t rsa -b 4096
ssh-copy-id root@server.com
npm run setup
# Choose "Yes" for SSH key
```

### 2. Different Environments

```bash
# Setup once per environment
npm run setup  # Production
# Later...
npm run setup  # Staging
```

### 3. Team Usage

Each team member runs their own setup:
- ✅ Each person has their own credentials
- ✅ No shared credentials in git
- ✅ Secure individual access

### 4. CI/CD Integration

```bash
# In CI/CD, use environment variables
export DEPLOY_SSH_HOST=$CI_SSH_HOST
export DEPLOY_SSH_PASSWORD=$CI_SSH_PASSWORD
npm run deploy:production
```

## 🔒 Security Best Practices

### DO ✅

- ✅ Use SSH keys instead of passwords
- ✅ Keep `.deploy-key` safe
- ✅ Run setup wizard per project
- ✅ Update credentials regularly
- ✅ Use different credentials per environment

### DON'T ❌

- ❌ Commit `.deploy-credentials` to git
- ❌ Commit `.deploy-key` to git
- ❌ Share credentials with team via git
- ❌ Use production credentials for development

## 🛠️ Troubleshooting

### Issue: Can't Load Credentials

**Problem**: Deployer can't find saved credentials

**Solution**: Run setup again
```bash
npm run setup
```

### Issue: Wrong Credentials

**Problem**: Credentials changed or incorrect

**Solution**: Update with setup wizard
```bash
npm run setup
# Choose "Yes" to overwrite
```

### Issue: SSH Connection Failed

**Problem**: Can't connect to server

**Solution**: Test SSH manually
```bash
ssh root@your-server.com
# If this fails, fix SSH access first
```

## 📊 Comparison: Old vs New

### Old Way (Every Time)

```bash
# Had to provide credentials EVERY deployment
node deploy.js production --ssh root@server.com --password mypass --url https://app.com
```

**Problems**:
- ❌ Repeated credential entry
- ❌ Credentials in command history
- ❌ Hard to manage multiple environments
- ❌ Security risk

### New Way (One-Time Setup)

```bash
# Setup once
npm run setup

# Deploy anytime (auto-loads credentials)
npm run deploy:production
```

**Benefits**:
- ✅ One-time credential entry
- ✅ Secure encrypted storage
- ✅ Auto-load for all deployments
- ✅ Easy credential updates

## 🎉 Summary

**Easy Setup = One-Time Wizard + Secure Storage + Auto-Reuse**

1. Run `npm run setup` (one time)
2. Provide credentials securely
3. Deploy anytime with `npm run deploy:production`

**No more repeated credential entry!** 🚀

---

**Questions?** Check [Security Notice](SECURITY-NOTICE.md) or [User Guide](USER-GUIDE.md)
