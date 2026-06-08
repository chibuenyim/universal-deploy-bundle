# Universal Deploy Bundle - Features

## 🚀 Core Capabilities

### 1. SSH Remote Deployment (`ssh-deployer.js`)
Deploy to ANY server via SSH with instant error catching:

```bash
# Usage
node ssh-deployer.js user@server.com

# Or with environment variables
export SSH_HOST=server.com
export SSH_USER=root
export SSH_KEY=~/.ssh/id_rsa
export DEPLOY_ENV=production
node ssh-deployer.js
```

**Features:**
- ✅ Deploy to remote servers via SSH
- ✅ Secure SSH key authentication
- ✅ Remote build and deployment
- ✅ Auto-discovery on remote servers
- ✅ Instant error detection
- ✅ Remote service restart
- ✅ HTTP verification

**Configuration:**
```javascript
{
  host: "server.com",
  username: "root",
  port: 22,
  keyPath: "~/.ssh/id_rsa",
  environment: "production",
  remoteDir: "/var/www/app",
  branch: "master"
}
```

---

### 2. Continuous Deployment (`continuous-deployer.js`)
Auto-deploy on push with instant error rejection:

```bash
export WATCH_BRANCH=master
export DEPLOY_ON_PUSH=true
export INSTANT_ERROR_CHECK=true
export BLOCK_ON_ERROR=true
node continuous-deployer.js
```

**Features:**
- ✅ **Auto-deploy on push** to specific branches
- ✅ **INSTANT ERROR REJECTION** - blocks bad code before deployment
- ✅ Pre-deployment checks:
  - TypeScript compilation
  - ESLint validation
  - Build verification
- ✅ Zero-downtime deployments
- ✅ Git-aware deployment
- ✅ Branch-based deployment rules

**Error Rejection:**
```bash
# Instantly blocks deployment if:
❌ TypeScript errors found
❌ ESLint errors found
❌ Build errors found
❌ Test failures (if enabled)
```

---

### 3. Remote Monitoring (`remote-monitor.js`)
Real-time monitoring of remote deployments:

```bash
export MONITOR_HOSTS=server1.com,server2.com,staging.com
export CHECK_INTERVAL=30000
export ALERT_THRESHOLD=3
node remote-monitor.js
```

**Features:**
- ✅ Watch multiple remote servers via SSH
- ✅ **Real-time health checks:**
  - HTTP endpoint monitoring
  - Ping connectivity
  - PM2 process status
- ✅ **Instant error catching:**
  - Auto-alert on failures
  - Remote log streaming
  - Failure threshold alerts
- ✅ **Remote PM2 monitoring:**
  - Process status checks
  - Automatic restart detection
  - Error log aggregation

**Alerting:**
```bash
# Alerts sent after threshold failures
🚨 ALERT: server.com - 3 consecutive failures
🚨 ALERT: staging.com - Process frontend is stopped
```

---

## 🔄 Continuous Development Workflow

### Complete CI/CD Pipeline:

```yaml
# 1. Developer pushes code
git push origin master

# 2. Instant Error Rejection (pre-deploy)
node continuous-deployer.js
  ✅ TypeScript check
  ✅ ESLint check
  ✅ Build check
  ❌ BLOCKED if errors found

# 3. SSH Remote Deployment (if checks pass)
node ssh-deployer.js production.com
  ✅ SSH to production server
  ✅ Pull latest code
  ✅ Build on remote
  ✅ Restart services
  ✅ HTTP verify

# 4. Remote Monitoring (post-deploy)
node remote-monitor.js
  ✅ Health checks every 30s
  ✅ PM2 status monitoring
  ✅ Instant error alerts
  ✅ Remote log streaming
```

---

## 🎯 Use Cases

### 1. Deploy to Remote Server
```bash
node ssh-deployer.js production.example.com
```

### 2. Auto-Deploy on Push (Git Hook)
```bash
# .git/hooks/post-receive
#!/bin/bash
node /path/to/continuous-deployer.js
```

### 3. Monitor Production
```bash
node remote-monitor.js
# Checks all configured hosts
# Sends alerts on failures
# Streams remote logs
```

### 4. Instant Error Blocking
```bash
# Blocks deployment if errors found
export BLOCK_ON_ERROR=true
node continuous-deployer.js
```

---

## 🔒 Security Features

- ✅ SSH key authentication (no passwords)
- ✅ Strict host key checking options
- ✅ Pre-deployment validation
- ✅ Error rejection (blocks bad code)
- ✅ Remote verification (HTTP, PM2)
- ✅ Zero-downtime deployments

---

## 📊 Monitoring Capabilities

### Health Checks:
- HTTP endpoint monitoring
- Ping connectivity
- PM2 process status
- Custom health endpoints

### Error Catching:
- Instant detection
- Remote log streaming
- Failure threshold alerts
- Auto-recovery suggestions

### Alerts:
- Email notifications (configurable)
- Slack/Discord webhooks (configurable)
- Failure threshold alerts
- Process down alerts

---

## 🚀 Quick Start

```bash
# Clone the bundle
git clone https://github.com/chibuenyim/universal-deploy-bundle.git
cd universal-deploy-bundle

# Install dependencies
npm install

# Deploy to remote server
node ssh-deployer.js your-server.com

# Enable continuous deployment
export DEPLOY_ON_PUSH=true
node continuous-deployer.js

# Start monitoring
node remote-monitor.js
```

---

## 📖 Documentation

- [SSH Deployment Guide](./docs/ssh-deployment.md)
- [Continuous Deployment Setup](./docs/continuous-deployment.md)
- [Remote Monitoring Guide](./docs/remote-monitoring.md)
- [Error Rejection Configuration](./docs/error-rejection.md)

---

## 🤝 Contributing

This is a universal deployment bundle that works with ANY project:
- No framework dependencies
- Works with Node.js, Python, Go, Rust, etc.
- Adaptable to any infrastructure
- Zero configuration for basic use

