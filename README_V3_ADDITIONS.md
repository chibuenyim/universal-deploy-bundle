# V3 New Features

## V3 Exclusive Features

### 🆕 Package.json Port Auto-Fix
Auto-detects and fixes wrong default ports in package.json
- Prevents EADDRINUSE errors
- Compares default port to environment port
- Fixes mismatch automatically

### 🆕 Nginx-Frontend Connectivity Verification  
Tests both direct and nginx access, catching ALL nginx issues
- Dual testing: direct port + nginx proxy
- Detects mismatch: direct=200, nginx=502
- Fixes ALL proxy_pass directives
- 5-second startup delay for Next.js

### 🆕 SSH Remote Deployment
Deploy from ANYWHERE using SSH credentials
- Auto-detects SSH mode from environment
- SSH key authentication (preferred)
- SSH password authentication via sshpass
- AI agent compatible

### 🆕 Time Optimizations
99% faster deployments (8 seconds vs 17 minutes)
- Smart change detection via git diff
- Skip builds when no changes
- Parallel builds with Promise.all()

## Performance Improvements

| Metric | V2 | V3 | Improvement |
|--------|----|----|-------------|
| No Changes | 17 min | 8 sec | 99% faster |
| Single Change | 17 min | 2-3 min | 82% faster |
| Both Changed | 17 min | 3-4 min | 76% faster |
| Location | Local only | Anywhere | SSH support |
