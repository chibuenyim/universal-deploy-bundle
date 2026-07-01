# Practical Deployment Examples - V4

This document provides practical, real-world deployment examples using V4.

## 📋 Table of Contents

1. [Basic Deployments](#basic-deployments)
2. [Production Deployments](#production-deployments)
3. [Staging Deployments](#staging-deployments)
4. [Development Deployments](#development-deployments)
5. [Error Recovery Scenarios](#error-recovery-scenarios)
6. [Twelve-Factor Compliance](#twelve-factor-compliance)
7. [CI/CD Integration](#cicd-integration)
8. [Advanced Scenarios](#advanced-scenarios)

## 🚀 Basic Deployments

### Example 1: Simple Production Deployment

```bash
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --ssh root@server.com \
  --url https://myapp.com
```

**Output:**
```
2026-07-01T10:00:00.000Z 🌐 [V4-INIT] === UNIVERSAL DEPLOYMENT V4 [PRODUCTION] ===
2026-07-01T10:00:01.000Z 🔍 [V4-AUTO_CONFIGURE] Auto-discovering project information...
2026-07-01T10:00:02.000Z ✅ [V4-AUTO_CONFIGURE] ✓ Frontend detected (Next.js)
2026-07-01T10:00:03.000Z ✅ [V4-AUTO_CONFIGURE] ✓ Backend detected (Node.js)
...
=== DEPLOYMENT SUCCESS ✅ ===
```

### Example 2: Deployment with Custom Branch

```bash
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --ssh root@server.com \
  --url https://myapp.com \
  --branch feature/new-ui
```

## 🏭 Production Deployments

### Example 3: Recommended Production Deployment

```bash
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --ssh root@server.com \
  --url https://myapp.com \
  --force-continue \
  --strict-12factor
```

**Features enabled:**
- ✅ Forced continuation (completes unless stopped)
- ✅ Strict 12-factor validation
- ✅ Zero-error detection
- ✅ Automatic recovery

### Example 4: Production with Environment Variables

```bash
# Set environment variables
export DEPLOY_SSH_HOST=root@server.com
export DEPLOY_URL=https://myapp.com
export DEPLOY_BRANCH=master
export DATABASE_URL="postgresql://user:pass@host:5432/db"
export JWT_SECRET="your-secret-key"

# Run deployment
node deployment-agent/intelligent-deployer-universal-v4.js production
```

### Example 5: Production with Config File

**.deploy-config.json:**
```json
{
  "sshHost": "root@server.com",
  "remotePath": "/var/www/html/myapp",
  "branch": "master",
  "url": "https://myapp.com",
  "frontendPort": 3000,
  "backendPort": 3020
}
```

**Command:**
```bash
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --config .deploy-config.json \
  --force-continue
```

### Example 6: Production Deployment with Rollback Safety

```bash
# Deploy with checkpoint tracking
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --ssh root@server.com \
  --url https://myapp.com \
  --force-continue

# If issues occur, rollback manually:
ssh root@server.com
cd /var/www/html/myapp
git reset --hard HEAD~1
PM2_HOME=/etc/.pm2 pm2 restart production-backend
PM2_HOME=/etc/.pm2 pm2 restart production-frontend
```

## 🧪 Staging Deployments

### Example 7: Basic Staging Deployment

```bash
node deployment-agent/intelligent-deployer-universal-v4.js staging \
  --ssh root@staging.example.com \
  --url https://staging.myapp.com \
  --branch staging
```

### Example 8: Staging with Testing

```bash
# Deploy to staging
node deployment-agent/intelligent-deployer-universal-v4.js staging \
  --ssh root@staging.example.com \
  --url https://staging.myapp.com \
  --branch staging \
  --force-continue

# Run tests after deployment
npm run test:e2e -- --env staging

# If tests pass, deploy to production
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --ssh root@production.example.com \
  --url https://myapp.com \
  --force-continue
```

### Example 9: Staging with Database Migration

```bash
# Deploy staging
node deployment-agent/intelligent-deployer-universal-v4.js staging \
  --ssh root@staging.example.com \
  --url https://staging.myapp.com

# Run database migrations
ssh root@staging.example.com
cd /var/www/html/myapp/backend
npm run migration:run

# Restart backend
PM2_HOME=/etc/.pm2 pm2 restart staging-backend
```

## 💻 Development Deployments

### Example 10: Local Development Deployment

```bash
node deployment-agent/intelligent-deployer-universal-v4.js development \
  --local \
  --url http://localhost:3000
```

**No SSH required - runs everything locally.**

### Example 11: Development with Hot Reload

```bash
# Terminal 1: Start development server
cd frontend
npm run dev

# Terminal 2: Deploy backend (local)
node deployment-agent/intelligent-deployer-universal-v4.js development \
  --local \
  --url http://localhost:3000

# Terminal 3: Start backend with watch mode
cd backend
npm run start:dev
```

## 🔄 Error Recovery Scenarios

### Example 12: Resume Failed Deployment

```bash
# Deployment fails during build
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --ssh root@server.com \
  --url https://myapp.com

# Output:
# ❌ Frontend build failed
# ❌ Deployment failed

# Resume from where it failed
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --force-continue

# Output:
# ⏩ Resuming from stage: BUILD_FRONTEND
# 🔄 Recovery: Clean rebuild with fresh dependencies
# ✅ Frontend recovered and built successfully
# ✅ Deployment completed successfully
```

### Example 13: Network Error Recovery

```bash
# Deployment with network issues
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --ssh root@server.com \
  --url https://myapp.com

# Output:
# ⚠️  SSH timeout, retrying (1/3)...
# ⚠️  SSH timeout, retrying (2/3)...
# ✅ SSH retry 3 successful: Pulling code
# Deployment continues automatically
```

### Example 14: Dependency Error Recovery

```bash
# Build fails due to dependency issue
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --ssh root@server.com \
  --url https://myapp.com

# Output:
# ❌ Frontend build failed: Cannot resolve dependency
# 🔄 Frontend build failed, attempting complete recovery...
# 🔄 Recovery: Clean rebuild with fresh dependencies
# ✅ Frontend recovered and built successfully
# Deployment continues
```

### Example 15: Manual Error Resolution

```bash
# Config error detected
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --ssh root@server.com \
  --url https://myapp.com

# Output:
# ❌ CONFIG: DATABASE_URL not in environment
# Resolution: Set DATABASE_URL environment variable

# Fix the issue
export DATABASE_URL="postgresql://user:pass@host:5432/db"

# Resume deployment
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --force-continue
```

## 🌐 Twelve-Factor Compliance

### Example 16: Check 12-Factor Compliance

```bash
# Run with strict mode to check compliance
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --ssh root@server.com \
  --url https://myapp.com \
  --strict-12factor

# Output:
# ❌ Twelve-Factor violation: Database config hardcoded
# ❌ Deployment failed in strict mode
# ❌ Twelve-Factor violation: Logs written to file
# ❌ Deployment failed in strict mode
```

**Fix violations:**
```bash
# Move config to environment
export DATABASE_URL="postgresql://user:pass@host:5432/db"
export JWT_SECRET="your-secret-key"

# Configure PM2 to log to stdout
pm2 save

# Deploy again
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --ssh root@server.com \
  --url https://myapp.com \
  --strict-12factor

# Output:
# ✅ All Twelve-Factor checks passed
# ✅ Deployment completed successfully
```

### Example 17: Standard Mode with Warnings

```bash
# Deploy without strict mode
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --ssh root@server.com \
  --url https://myapp.com

# Output:
# ⚠️  Twelve-Factor violation: Database config hardcoded
# ⚠️  Twelve-Factor violation: Logs written to file
# ✅ Deployment completed with warnings
# Review and fix violations for next deployment
```

## 🔄 CI/CD Integration

### Example 18: GitHub Actions

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Production
        env:
          DEPLOY_SSH_HOST: ${{ secrets.SSH_HOST }}
          DEPLOY_URL: ${{ secrets.APP_URL }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
        run: |
          node deployment-agent/intelligent-deployer-universal-v4.js production \
            --force-continue \
            --strict-12factor

      - name: Verify Deployment
        run: |
          curl -f ${{ secrets.APP_URL }}/api/health || exit 1
```

### Example 19: GitLab CI

```yaml
# .gitlab-ci.yml
deploy_production:
  stage: deploy
  only:
    - master
  script:
    - node deployment-agent/intelligent-deployer-universal-v4.js production
      --ssh $SSH_HOST
      --url $APP_URL
      --force-continue
      --strict-12factor
  environment:
    name: production
    url: https://myapp.com
```

### Example 20: Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
  agent any

  environment {
    DEPLOY_SSH_HOST = credentials('SSH_HOST')
    DEPLOY_URL = 'https://myapp.com'
    DATABASE_URL = credentials('DATABASE_URL')
    JWT_SECRET = credentials('JWT_SECRET')
  }

  stages {
    stage('Deploy') {
      steps {
        sh '''
          node deployment-agent/intelligent-deployer-universal-v4.js production \
            --force-continue \
            --strict-12factor
        '''
      }
    }

    stage('Verify') {
      steps {
        sh 'curl -f https://myapp.com/api/health || exit 1'
      }
    }
  }
}
```

## 🔧 Advanced Scenarios

### Example 21: Multi-Environment Deployment

```bash
#!/bin/bash
# deploy-all.sh

# Deploy to development
node deployment-agent/intelligent-deployer-universal-v4.js development \
  --local \
  --url http://localhost:3000

# Deploy to staging
node deployment-agent/intelligent-deployer-universal-v4.js staging \
  --ssh root@staging.example.com \
  --url https://staging.myapp.com \
  --branch staging \
  --force-continue

# Run staging tests
npm run test:e2e -- --env staging

# If tests pass, deploy to production
if [ $? -eq 0 ]; then
  node deployment-agent/intelligent-deployer-universal-v4.js production \
    --ssh root@production.example.com \
    --url https://myapp.com \
    --force-continue
fi
```

### Example 22: Blue-Green Deployment

```bash
# Deploy to blue environment
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --ssh root@server.com \
  --url https://blue.myapp.com \
  --force-continue

# Verify blue environment
curl https://blue.myapp.com/api/health

# If successful, switch traffic
# (This would be done via load balancer configuration)

# Deploy to green environment (next time)
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --ssh root@server.com \
  --url https://green.myapp.com \
  --force-continue
```

### Example 23: Canary Deployment

```bash
# Deploy to production (canary)
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --ssh root@server.com \
  --url https://myapp.com \
  --force-continue

# Monitor canary
# (This would be done via monitoring tools)

# If canary is successful, deploy to rest of servers
# for server in server2 server3 server4; do
#   ssh root@$server "cd /var/www/html/myapp && git pull"
# done
```

### Example 24: Database Migration with Deployment

```bash
#!/bin/bash
# deploy-with-migration.sh

# Deploy backend
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --ssh root@server.com \
  --url https://myapp.com \
  --force-continue

# Run database migrations
ssh root@server.com << 'EOF'
  cd /var/www/html/myapp/backend
  npm run migration:run
EOF

# Restart backend
ssh root@server.com "PM2_HOME=/etc/.pm2 pm2 restart production-backend"

# Deploy frontend
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --ssh root@server.com \
  --url https://myapp.com \
  --force-continue

# Verify deployment
curl https://myapp.com/api/health
```

### Example 25: Deployment with Monitoring

```bash
#!/bin/bash
# deploy-with-monitoring.sh

# Start deployment
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --ssh root@server.com \
  --url https://myapp.com \
  --force-continue &

# Get deployment PID
DEPLOY_PID=$!

# Monitor deployment
while kill -0 $DEPLOY_PID 2>/dev/null; do
  # Check server health
  if curl -f https://myapp.com/api/health 2>/dev/null; then
    echo "Server is healthy during deployment"
  else
    echo "WARNING: Server health check failed"
  fi
  sleep 10
done

# Wait for deployment to complete
wait $DEPLOY_PID

# Final verification
curl https://myapp.com/api/health
if [ $? -eq 0 ]; then
  echo "✅ Deployment successful and verified"
else
  echo "❌ Deployment failed verification"
  exit 1
fi
```

## 📝 Deployment State Inspection

### Example 26: Check Deployment State

```bash
# View current deployment state
cat .deployment-state-v4.json

# Output:
{
  "deploymentId": "deploy-1712345678900-abc123def",
  "startTime": "2026-07-01T10:00:00.000Z",
  "currentStage": "BUILD_FRONTEND",
  "completedStages": ["INIT", "AUTO_CONFIGURE", "PULL_CODE"],
  "errors": [],
  "warnings": [],
  "twelveFactorViolations": []
}
```

### Example 27: Clear Deployment State

```bash
# If you want to start fresh
rm .deployment-state-v4.json

# Deploy again (will start from beginning)
node deployment-agent/intelligent-deployer-universal-v4.js production \
  --ssh root@server.com \
  --url https://myapp.com
```

## 🎯 Best Practices Summary

1. **Always use `--force-continue`** for production deployments
2. **Enable `--strict-12factor`** for new projects
3. **Test in staging first** before production
4. **Monitor deployment reports** after each deployment
5. **Keep configuration in environment variables**
6. **Use checkpoint tracking** for rollback safety
7. **Integrate with CI/CD** for automated deployments
8. **Verify deployments** with health checks

## 📚 Additional Resources

- [README-V4.md](./README-V4.md) - Complete V4 documentation
- [QUICK-START-V4.md](./QUICK-START-V4.md) - Quick start guide
- [V3-vs-V4-COMPARISON.md](./V3-vs-V4-COMPARISON.md) - Version comparison
- [deploy-v4-example.sh](./deploy-v4-example.sh) - Usage examples script
