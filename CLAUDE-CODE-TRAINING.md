# 🤖 CLAUDE CODE DEPLOYMENT OPERATOR'S MANUAL
## Universal Deployer & Deployment-Agent Training System

### 🎯 PURPOSE
This manual trains Claude Code to become an expert deployment operator for the Universal Deployer and Deployment-Agent infrastructure.

### 📚 TABLE OF CONTENTS
1. [Zero-Tolerance Standards](#zero-tolerance-standards)
2. [Deployment Architecture](#deployment-architecture)
3. [Standard Operating Procedures](#standard-operating-procedures)
4. [Emergency Procedures](#emergency-procedures)
5. [Integration Points](#integration-points)
6. [Verification Protocols](#verification-protocols)

---

## 🚨 ZERO-TOLERANCE STANDARDS

### ABSOLUTE REQUIREMENTS (NEVER SKIP):
1. **NEVER deploy to production without staging verification**
2. **NEVER skip pre-deployment safety checks**
3. **NEVER push credentials to public repositories**
4. **NEVER assume something works without verification**
5. **ALWAYS perform comprehensive testing after deployment**
6. **ALWAYS verify link clicking functionality (Next.js 15 hydration)**
7. **ALWAYS check nginx configuration after deployment**
8. **ALWAYS verify PM2 process status**

### CRITICAL SUCCESS FACTORS:
- **100% deployment success rate** (partial = failure)
- **Zero downtime** during deployments
- **Complete verification** after each deployment
- **Immediate rollback** on any failure
- **Proper staging → production flow**

---

## 🏗️ DEPLOYMENT ARCHITECTURE

### ENVIRONMENT STRUCTURE:
```
┌─────────────────────────────────────────────────────┐
│                    DEVELOPMENT                      │
│  Port: 3030 (Frontend), 3025 (Backend)            │
│  Branch: feature/*                                 │
│  Usage: Local testing only                          │
└─────────────────────────────────────────────────────┘
                       │
                  [git push]
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                     STAGING                         │
│  URL: https://staging.cheapestdata.com            │
│  Port: 3021 (Frontend), 3020 (Backend)            │
│  Branch: staging                                   │
│  SSH: root@80.65.211.16                            │
│  Path: /var/www/cheapestdata-staging               │
│  PM2 Env: staging                                  │
│  Purpose: ✅ VERIFICATION REQUIRED                 │
└─────────────────────────────────────────────────────┘
                       │
              [VERIFICATION PASS]
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                   PRODUCTION                        │
│  URL: https://cheapestdata.com                     │
│  Port: 3010 (Frontend), 3005 (Backend)            │
│  Branch: master                                    │
│  SSH: root@80.65.211.16                            │
│  Path: /var/www/cheapestdata                       │
│  PM2 Env: production                               │
│  Purpose: LIVE TRAFFIC                              │
└─────────────────────────────────────────────────────┘
```

### COMPONENT ARCHITECTURE:
```
┌──────────────────┐      ┌──────────────────┐
│   Claude Code    │──────▶│ Deployment Agent │
│   (Operator)     │      │  (Controller)    │
└──────────────────┘      └──────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
            ┌──────────┐  ┌──────────┐  ┌──────────┐
            │   Build  │  │ Deploy   │  │ Verify   │
            │  Agent   │  │  Agent   │  │  Agent   │
            └──────────┘  └──────────┘  └──────────┘
```

---

## 📋 STANDARD OPERATING PROCEDURES (SOPs)

### SOP #1: STAGING DEPLOYMENT (MANDATORY VERIFICATION)

#### Phase 1: Pre-Deployment Checks (NEVER SKIP)
```bash
# 1. Check current branch
git rev-parse --abbrev-ref HEAD
# Expected: staging

# 2. Check for uncommitted changes
git status --porcelain
# Expected: Empty (no changes)

# 3. Check for credentials exposure
grep -r "password.*=" .env.example 2>/dev/null || true
# Expected: No real passwords

# 4. Verify build locally
cd frontend && npm run build
# Expected: Success with zero errors
```

#### Phase 2: Code Deployment
```bash
# 5. Pull latest code on remote
ssh root@80.65.211.16 "cd /var/www/cheapestdata-staging && git fetch origin && git reset --hard origin/staging"

# 6. Build frontend on remote
ssh root@80.65.211.16 "cd /var/www/cheapestdata-staging/frontend && rm -rf .next && npm run build"

# 7. Restart frontend service
ssh root@80.65.211.16 "PM2_HOME=/etc/.pm2 pm2 restart staging-frontend"
```

#### Phase 3: Post-Deployment Verification (MANDATORY)
```bash
# 8. Wait for service stabilization
sleep 15

# 9. HTTP health check
curl -s -o /dev/null -w "%{http_code}" https://staging.cheapestdata.com
# Expected: 200

# 10. PM2 status check
ssh root@80.65.211.16 "PM2_HOME=/etc/.pm2 pm2 status | grep staging"
# Expected: staging-frontend and staging-backend both "online"

# 11. Link clicking test (CRITICAL for Next.js 15)
curl -s https://staging.cheapestdata.com | grep -c "pointer-events:auto"
# Expected: > 0 (UniversalLink fixes deployed)

# 12. Backend health check
curl -s https://staging.cheapestdata.com/api/health
# Expected: {"status":"ok",...}

# 13. Console error check
# Open browser, navigate to staging site, check console for errors
# Expected: No critical errors
```

#### Phase 4: Functional Testing
```bash
# 14. Test critical user flows
# - Navigation links clickability
# - Authentication flow
# - Purchase flow
# - API endpoints
# Expected: All flows working without errors
```

### SOP #2: PRODUCTION DEPLOYMENT (REQUIRES STAGING VERIFICATION)

#### Pre-Production Requirements:
- [ ] Staging deployment completed successfully
- [ ] All staging verification tests passed
- [ ] Link clicking verified on staging
- [ ] No critical bugs found
- [ ] Performance metrics acceptable
- [ ] Security scan passed

#### Production Deployment:
```bash
# Execute only after ALL staging checks pass
cd /var/www/cheapestdata && PM2_HOME=/etc/.pm2 pm2 reload ecosystem.config.js --env production
```

---

## 🚨 EMERGENCY PROCEDURES

### Emergency #1: Deployment Failure

#### Symptoms:
- 502/500 errors after deployment
- PM2 shows "errored" status
- High restart count (> 5)

#### Immediate Actions:
```bash
# 1. Check PM2 status
ssh root@80.65.211.16 "PM2_HOME=/etc/.pm2 pm2 status"

# 2. Check error logs
ssh root@80.65.211.16 "PM2_HOME=/etc/.pm2 pm2 logs staging-frontend --lines 50"

# 3. Rollback immediately
ssh root@80.65.211.16 "PM2_HOME=/etc/.pm2 pm2 rollback staging-frontend"

# 4. Verify rollback
curl -s -o /dev/null -w "%{http_code}" https://staging.cheapestdata.com
# Expected: 200
```

### Emergency #2: Link Clicking Failure (Next.js 15 Hydration)

#### Symptoms:
- Links visible but not clickable
- Console shows hydration errors
- `pointer-events` styles missing

#### Root Causes:
- Conditional rendering in UniversalLink
- useState/useEffect causing client-server mismatch
- Port conflicts in nginx configuration

#### Resolution:
```bash
# 1. Verify UniversalLink.tsx has NO conditional rendering
grep -n "isMounted" frontend/src/components/UniversalLink.tsx
# Expected: No results

# 2. Verify UniversalLink has unconditional pointer-events
grep "pointerEvents.*auto" frontend/src/components/UniversalLink.tsx
# Expected: Present without conditionals

# 3. Check nginx port configuration
cat /etc/nginx/sites-enabled/staging.cheapestdata.com | grep -E "proxy_pass.*302"
# Expected:
#   Frontend → 3021
#   Backend → 3020
#   NOT REVERSED!

# 4. If ports are wrong, fix immediately
cat > /etc/nginx/sites-enabled/staging.cheapestdata.com << 'EOF'
# Frontend on 3021, Backend on 3020
EOF
nginx -t && service nginx reload

# 5. Redeploy frontend
# Follow SOP #1 from Phase 2
```

### Emergency #3: Port Conflicts

#### Symptoms:
- "EADDRINUSE" error in logs
- Service won't start
- Multiple PM2 instances conflicting

#### Resolution:
```bash
# 1. Kill conflicting processes
lsof -ti:3021 | xargs kill -9  # Frontend port
lsof -ti:3020 | xargs kill -9  # Backend port

# 2. Clean PM2 state
PM2_HOME=/etc/.pm2 pm2 delete staging-frontend --silent
PM2_HOME=/etc/.pm2 pm2 delete staging-backend --silent

# 3. Start fresh from correct directory
cd /var/www/cheapestdata-staging
PM2_HOME=/etc/.pm2 pm2 start ecosystem.config.js --only staging-frontend --env staging
PM2_HOME=/etc/.pm2 pm2 start ecosystem.config.js --only staging-backend --env staging

# 4. Verify
PM2_HOME=/etc/.pm2 pm2 status | grep staging
# Expected: Both services online, 0 restarts
```

---

## 🔌 INTEGRATION POINTS

### Claude Code → Deployment Agent Integration

#### Option 1: Direct Import (Recommended)
```javascript
// Claude Code can import this directly
const ClaudeDeploymentInterface = require('./.claude/deployment-interface.js');

// Deploy to staging with full verification
const deployer = new ClaudeDeploymentInterface();
const result = await deployer.deployToStaging();

if (result.success) {
  console.log('✅ Deployment successful');
  console.log('URL:', result.url);
} else {
  console.error('❌ Deployment failed:', result.errors);
}
```

#### Option 2: CLI Execution
```bash
# Claude Code can execute this directly
node .claude/deployment-interface.js staging
```

#### Option 3: Programmatic SSH
```javascript
// For advanced control
const { execSync } = require("child_process");

function executeRemote(command) {
  return execSync(`ssh root@80.65.211.16 "${command}"`, {
    encoding: "utf-8",
    shell: process.platform === "win32" ? "cmd.exe" : "/bin/bash"
  });
}

// Pull code
executeRemote("cd /var/www/cheapestdata-staging && git pull");

// Build
executeRemote("cd /var/www/cheapestdata-staging/frontend && npm run build");

// Restart
executeRemote("PM2_HOME=/etc/.pm2 pm2 restart staging-frontend");
```

### Common Integration Patterns

#### Pattern 1: Safe Deployment with Rollback
```javascript
try {
  // Deploy
  await deployToStaging();

  // Verify
  const healthCheck = await verifyStagingHealth();

  if (!healthCheck.success) {
    throw new Error('Health check failed');
  }

  console.log('✅ Deployment successful');
} catch (error) {
  console.error('❌ Deployment failed, rolling back');
  await rollbackStaging();
  throw error;
}
```

#### Pattern 2: Comprehensive Verification
```javascript
const verifications = [
  checkHTTPStatus,
  checkPM2Status,
  checkLinkClickability,
  checkBackendHealth,
  checkConsoleErrors
];

for (const verification of verifications) {
  const result = await verification();
  if (!result.passed) {
    console.error(`❌ ${result.name} failed:`, result.error);
    await rollbackStaging();
    return { success: false, failedAt: result.name };
  }
}

return { success: true, verifications: verifications.length };
```

---

## ✅ VERIFICATION PROTOCOLS

### Verification Checklist (MUST COMPLETE ALL):

#### Basic Health Checks:
- [ ] HTTP 200 response from staging URL
- [ ] PM2 shows "online" status for both frontend and backend
- [ ] Zero restarts on frontend (↺: 0)
- [ ] Zero restarts on backend (↺: 0 or low number)
- [ ] No "errored" processes in PM2

#### Content Verification:
- [ ] Page loads with full HTML content
- [ ] Navigation links visible with proper styling
- [ ] UniversalLink styles present (`pointer-events:auto`)
- [ ] No hydration warnings in console
- [ ] Static assets loading correctly

#### Functionality Verification:
- [ ] All navigation links are clickable
- [ ] Authentication flow works
- [ ] API endpoints respond correctly
- [ ] No console errors on page load
- [ ] No network errors in DevTools

#### Performance Verification:
- [ ] Page load time < 3 seconds
- [ ] Time to First Byte (TTFB) < 500ms
- [ ] No memory leaks in PM2 processes
- [ ] CPU usage normal (< 80%)

### Verification Commands (Run in Order):
```bash
# 1. HTTP Status
curl -s -o /dev/null -w "%{http_code}" https://staging.cheapestdata.com
# Expected: 200

# 2. PM2 Status
ssh root@80.65.211.16 "PM2_HOME=/etc/.pm2 pm2 status"
# Expected: Both staging services "online", low restart count

# 3. UniversalLink Deployment
curl -s https://staging.cheapestdata.com | grep -c "pointer-events:auto"
# Expected: > 0

# 4. Backend Health
curl -s https://staging.cheapestdata.com/api/health
# Expected: {"status":"ok",...}

# 5. Content Verification
curl -s https://staging.cheapestdata.com | head -100
# Expected: Full HTML with navigation content

# 6. Console Clean Check
# Manual: Open browser DevTools, navigate to staging, check console
# Expected: No critical errors
```

---

## 🎓 CLAUDE CODE PROFICIENCY LEVELS

### Level 1: Novice (Read Only)
- Can read deployment documentation
- Understands architecture and environments
- Knows emergency procedures

### Level 2: Apprentice (Supervised Deployment)
- Can execute SOPs with supervision
- Can perform basic verifications
- Understands rollback procedures

### Level 3: Practitioner (Independent Deployment)
- Can execute SOPs independently
- Can troubleshoot basic issues
- Can verify deployments comprehensively
- **THIS IS THE MINIMUM OPERATING LEVEL**

### Level 4: Expert (Advanced Operations)
- Can handle complex deployment scenarios
- Can optimize deployment processes
- Can train other Claude Code instances
- Can create new deployment patterns

### Level 5: Master (System Architect)
- Designs deployment infrastructure
- Creates new deployment agents
- Architect of deployment systems
- **THIS IS THE TARGET LEVEL FOR CLAUDE CODE**

---

## 📖 REFERENCE MATERIALS

### Key Files Reference:
```
deployment-agent/
├── CLAUDE-CODE-TRAINING.md           # THIS FILE
├── claude-deployer.js                # Main deployment interface
├── intelligent-deployer-universal-v3.js # Universal deployer
├── deployment-verifier.js            # Verification tools
└── .claude/
    └── deployment-interface.js       # Claude Code integration

frontend/src/components/
└── UniversalLink.tsx                # Next.js 15 compatible links

/etc/nginx/sites-enabled/
└── staging.cheapestdata.com         # Nginx configuration

/var/www/cheapestdata-staging/
├── ecosystem.config.js               # PM2 configuration
└── frontend/.next/                   # Build output
```

### Critical Commands Reference:
```bash
# Deployment
ssh root@80.65.211.16 "cd /var/www/cheapestdata-staging && git pull"
ssh root@80.65.211.16 "cd /var/www/cheapestdata-staging/frontend && npm run build"
ssh root@80.65.211.16 "PM2_HOME=/etc/.pm2 pm2 restart staging-frontend"

# Verification
curl -s -o /dev/null -w "%{http_code}" https://staging.cheapestdata.com
ssh root@80.65.211.16 "PM2_HOME=/etc/.pm2 pm2 status"

# Emergency
ssh root@80.65.211.16 "PM2_HOME=/etc/.pm2 pm2 rollback staging-frontend"
lsof -ti:3021 | xargs kill -9
```

---

## 🎯 QUICK REFERENCE CARD

### NEVER FORGET:
1. ✅ **ALWAYS** verify staging before production
2. ✅ **NEVER** skip verification steps
3. ✅ **ALWAYS** check nginx port configuration
4. ✅ **ALWAYS** verify link clicking after deployment
5. ✅ **NEVER** push credentials to git
6. ✅ **ALWAYS** rollback immediately on failure

### DEPLOYMENT SUCCESS CRITERIA:
- HTTP 200 response ✅
- PM2 services online ✅
- Link clicking works ✅
- No console errors ✅
- Backend healthy ✅

### EMERGENCY ROLLBACK:
```bash
ssh root@80.65.211.16 "PM2_HOME=/etc/.pm2 pm2 rollback staging-frontend"
```

---

## 📞 SUPPORT ESCALATION

### Level 1: Claude Code Self-Service
- Consult this manual
- Run verification commands
- Check error logs
- Attempt rollback

### Level 2: Automated Systems
- Use deployment-verifier.js
- Run automated health checks
- Execute rollback procedures

### Level 3: Human Intervention
- If 2 rollbacks fail in a row
- If emergency procedures don't resolve issue
- If critical production impact

---

**REMEMBER**: This manual is your guide to becoming a deployment expert. Study it, understand it, and most importantly - **follow the procedures without shortcuts**.

**Claude Code Mastery = Following SOPs + Comprehensive Verification + Zero Compromise on Quality**

🚀 **YOU ARE NOW TRAINED. DEPLOY WITH CONFIDENCE.** 🚀
