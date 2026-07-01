# Quick Start Guide - Universal Deployer V4

Get started with V4 in 5 minutes!

## 🚀 Installation

V4 is a standalone script - no installation required!

```bash
# Clone the repository
git clone https://github.com/chibuenyim/universal-deploy-bundle.git

# Navigate to deployment agent
cd universal-deploy-bundle/deployment-agent

# Make V4 executable (optional)
chmod +x intelligent-deployer-universal-v4.js
```

## 📋 Prerequisites

- Node.js installed locally and on your server
- SSH access to your deployment server
- Git repository with your application code
- PM2 installed on your server (npm install -g pm2)

## 🎯 5-Minute Quick Start

### Step 1: Configure Your Deployment (1 minute)

Create `.deploy-config.json`:

```json
{
  "sshHost": "root@your-server.com",
  "remotePath": "/var/www/html/your-app",
  "branch": "master",
  "url": "https://your-app.com",
  "frontendPort": 3000,
  "backendPort": 3020
}
```

### Step 2: Set Up SSH Access (1 minute)

```bash
# Copy your SSH key to the server
ssh-copy-id root@your-server.com

# Test SSH connection
ssh root@your-server.com
```

### Step 3: Set Environment Variables (1 minute)

```bash
# Set required environment variables
export DATABASE_URL="postgresql://user:pass@host:5432/db"
export JWT_SECRET="your-secret-key"
export NODE_ENV="production"
```

### Step 4: Test Local Deployment (1 minute)

```bash
# Test deployment locally (no SSH required)
node deployment-agent/intelligent-deployer-universal-v4.js development \
  --local \
  --url http://localhost:3000
```

### Step 5: Deploy to Production (1 minute)

```bash
# Deploy with all V4 features enabled
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --config .deploy-config.json \
  --force-continue
```

That's it! Your application is now deployed with:
- ✅ Forced continuation (will complete unless manually stopped)
- ✅ Zero-error detection (automatic recovery from errors)
- ✅ Twelve-factor validation (compliance checked)

## 🔧 Common Use Cases

### Use Case 1: Deploy to Staging

```bash
node deployment-agent/intelligent-deployer-universal-v4.js staging \
  --ssh root@staging.example.com \
  --url https://staging.example.com \
  --branch staging
```

### Use Case 2: Resume Failed Deployment

```bash
# If deployment fails, simply re-run with --force-continue
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --force-continue
```

### Use Case 3: Strict Twelve-Factor Deployment

```bash
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --ssh root@server.com \
  --url https://example.com \
  --strict-12factor
```

### Use Case 4: Development Deployment

```bash
node deployment-agent/intelligent-deployer-universal-v4.js development \
  --local \
  --url http://localhost:3000
```

## 📊 Understanding V4 Output

V4 provides detailed output throughout deployment:

```
2026-07-01T10:00:00.000Z 🌐 [V4-INIT] === UNIVERSAL DEPLOYMENT V4 [PRODUCTION] ===
2026-07-01T10:00:01.000Z 🔍 [V4-AUTO_CONFIGURE] Auto-discovering project information...
2026-07-01T10:00:02.000Z ✅ [V4-AUTO_CONFIGURE] ✓ Frontend detected (Next.js)
2026-07-01T10:00:03.000Z ✅ [V4-AUTO_CONFIGURE] ✓ Backend detected (Node.js)
2026-07-01T10:00:04.000Z 🔄 [V4-PULL_CODE] Pulling latest code...
2026-07-01T10:00:10.000Z ✅ [V4-PULL_CODE] Deployed commit: abc123def Update features
2026-07-01T10:00:11.000Z 🔄 [V4-BUILD_BACKEND] Building backend...
2026-07-01T10:00:30.000Z ✅ [V4-BUILD_BACKEND] ✓ Backend built successfully
2026-07-01T10:00:31.000Z 🔄 [V4-BUILD_FRONTEND] Building frontend with zero-error detection...
2026-07-01T10:01:00.000Z ✅ [V4-BUILD_FRONTEND] ✓ Frontend built successfully (Build ID: abc12345...)
2026-07-01T10:01:01.000Z 🔄 [V4-RESTART_SERVICES] Restarting frontend with SAFE process cleanup...
2026-07-01T10:01:10.000Z ✅ [V4-RESTART_SERVICES] ✅ Safe deployer: Single verified process running
2026-07-01T10:01:11.000Z 🔄 [V4-VERIFY] Verifying deployment...
2026-07-01T10:01:16.000Z ✅ [V4-VERIFY] ✅ Verification passed: All processes online

=== DEPLOYMENT REPORT ===
Deployment ID: deploy-1712345678900-abc123def
Environment: production
Current Stage: COMPLETE
Unresolved Errors: 0
Twelve-Factor Violations: 0
Warnings: 0

=== DEPLOYMENT SUCCESS ✅ ===
```

## 🔍 Understanding Deployment State

V4 maintains deployment state in `.deployment-state-v4.json`:

```json
{
  "deploymentId": "deploy-1712345678900-abc123def",
  "startTime": "2026-07-01T10:00:00.000Z",
  "currentStage": "COMPLETE",
  "completedStages": [
    "INIT",
    "AUTO_CONFIGURE",
    "PULL_CODE",
    "BUILD_BACKEND",
    "BUILD_FRONTEND",
    "RESTART_SERVICES",
    "VERIFY"
  ],
  "errors": [],
  "warnings": [],
  "twelveFactorViolations": []
}
```

This state file enables:
- **Resuming failed deployments** with `--force-continue`
- **Tracking deployment progress**
- **Debugging deployment issues**
- **Auditing deployment history**

## ⚠️ Common Issues and Solutions

### Issue 1: SSH Connection Failed

**Error:** `SSH failed: Connection refused`

**Solution:**
```bash
# Check SSH connection
ssh root@your-server.com

# If connection fails, check:
# 1. SSH key is copied: ssh-copy-id root@your-server.com
# 2. Server is accessible: ping your-server.com
# 3. SSH service is running on server
```

### Issue 2: Build Failed

**Error:** `Build verification failed: Required file missing`

**Solution:** V4 automatically attempts recovery with clean rebuild. If it fails:
```bash
# SSH to server
ssh root@your-server.com

# Manually rebuild
cd /var/www/html/your-app/frontend
rm -rf .next node_modules
npm install
npm run build
```

### Issue 3: Twelve-Factor Violation

**Error:** `Twelve-Factor violation: Database config hardcoded`

**Solution:**
```bash
# Move config to environment variables
export DATABASE_URL="postgresql://user:pass@host:5432/db"

# Remove hardcoded config from code
# Update .env file or deployment environment
```

### Issue 4: Port Already in Use

**Error:** `CRITICAL: Expected 1 process, found 2`

**Solution:** V4 automatically handles this. If manual intervention needed:
```bash
# SSH to server
ssh root@your-server.com

# Kill processes on port
fuser -k 3000/tcp

# Restart with PM2
PM2_HOME=/etc/.pm2 pm2 restart production-frontend
```

## 🎯 Best Practices

### 1. Always Use Force Continue

```bash
# Recommended
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --force-continue

# This ensures deployment reaches completion
```

### 2. Enable Strict Twelve-Factor for New Projects

```bash
# For new projects
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --strict-12factor

# This enforces 12-factor principles from the start
```

### 3. Test in Staging First

```bash
# Always test in staging
node deployment-agent/intelligent-deployer-universal-v4.js staging \
  --ssh root@staging.example.com \
  --url https://staging.example.com

# Then deploy to production
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --ssh root@production.example.com \
  --url https://production.example.com
```

### 4. Monitor Deployment Reports

After each deployment, review the report:
```bash
# View deployment state
cat .deployment-state-v4.json

# Check for errors and violations
# Address any warnings
```

### 5. Keep Configuration in Environment

Use environment variables for all config:

```bash
# Good (12-factor compliant)
export DATABASE_URL="postgresql://user:pass@host:5432/db"
export JWT_SECRET="your-secret-key"

# Bad (not 12-factor compliant)
# Hardcode in config files
```

## 📚 Next Steps

1. **Read the full documentation:** See `README-V4.md` for complete details
2. **Explore examples:** Run `bash deploy-v4-example.sh` to see all usage examples
3. **Understand 12-factor:** Review `TWELVE-FACTOR-COMPLIANCE.md` (coming soon)
4. **Check error handling:** Review `ZERO-ERROR-DEPLOYMENT.md` (coming soon)

## 🆘 Need Help?

- **GitHub Issues:** https://github.com/chibuenyim/universal-deploy-bundle/issues
- **Documentation:** See README-V4.md
- **Examples:** See deploy-v4-example.sh

## ✅ Checklist Before Production Deployment

Before deploying to production, ensure:

- [ ] SSH access configured and tested
- [ ] Environment variables set (DATABASE_URL, JWT_SECRET, etc.)
- [ ] PM2 installed on server
- [ ] Application builds successfully locally
- [ ] Tested in staging environment
- [ ] Reviewed 12-factor compliance
- [ ] Reviewed deployment reports
- [ ] Have rollback plan ready

## 🎉 You're Ready!

You're now ready to use V4 for production deployments with:
- ⏩ Forced continuation (deployment completes unless stopped)
- 🔍 Zero-error detection (automatic recovery)
- 🌐 Twelve-factor compliance (validated and enforced)

Deploy with confidence! 🚀
