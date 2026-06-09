# 🧠 Intelligent Deployer v3

Complete guide for Intelligent Deployer v3 - the flagship deployment agent with built-in intelligence.

## Quick Start

```bash
# Deploy to staging
node intelligent-deployer.js staging

# Deploy to production  
node intelligent-deployer.js production
```

## Features

### Auto-Discovery
- Zero configuration needed
- Automatically finds deployment directories
- Detects environment by directory name

### Built-in Nginx Fixing
- Auto-detects nginx misconfigurations
- Fixes wrong proxy ports (3021 → 3001)
- Tests and reloads nginx automatically

### Auto-Warming
- Pre-warms GitHub Actions runner
- Prevents 34+ minute stuck deployments
- Checks resources and connectivity

### Auto-Recovery
- Detects stuck PM2 processes
- Clears stale build artifacts
- Fixes common infrastructure issues

### Comprehensive Verification
- 7+ real functionality checks (not just HTTP 200)
- Tests homepage, login, services, marketplace, wallet, APIs
- Validates content size (>1000 bytes)

### Fast Error Catching
- Instant PM2 health checks
- Shows logs immediately on failure
- SSH-like speed debugging

## Documentation

For complete documentation, see the Universal Deploy Bundle README.

---

Deploy with intelligence! 🧠✅
