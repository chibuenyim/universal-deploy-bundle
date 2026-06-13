# 🛡️ Security Features Documentation

Complete guide to security features in Universal Deploy Bundle.

## 📋 Table of Contents

- [Overview](#overview)
- [Free Security Features](#free-security-features)
- [Enterprise Security Features](#enterprise-security-features)
- [Usage Examples](#usage-examples)
- [Security Reports](#security-reports)
- [Best Practices](#best-practices)
- [FAQ](#faq)

---

## Overview

The Universal Deploy Bundle includes comprehensive security scanning capabilities to help you identify and fix security vulnerabilities in your projects.

### Free vs Enterprise Features

| Feature | Free | Enterprise |
|---------|------|------------|
| npm audit scanning | ✅ | ✅ |
| Outdated package detection | ✅ | ✅ |
| Basic security checks | ✅ | ✅ |
| Vulnerability reports | ✅ | ✅ |
| Automated fixing | ❌ | ✅ |
| OWASP compliance | ❌ | ✅ |
| Risk scoring | ❌ | ✅ |
| Security trend analysis | ❌ | ✅ |
| Pre/post-deployment verification | ❌ | ✅ |
| Snyk/Dependabot integration | ❌ | ✅ (coming) |

---

## Free Security Features

Available to ALL users at no cost.

### 1. npm Audit Integration

Scans your project for known vulnerabilities using npm's built-in audit database.

**What it checks:**
- Known vulnerabilities in dependencies
- Severity levels (critical, high, moderate, low)
- Vulnerable package versions
- Available patches

**Example output:**
```
⚠️  Found 5 vulnerabilities:
   🔴 Critical: 1
   🟠 High: 2
   🟡 Moderate: 1
   🟢 Low: 1
```

### 2. Outdated Package Detection

Identifies packages that need updates.

**What it checks:**
- Packages with newer versions available
- Current vs latest version comparison
- Update recommendations

**Example output:**
```
📦 Checking for outdated packages...
⚠️  Found 3 outdated packages

📋 Outdated packages:
   - express: 4.18.2 → 4.19.0
   - react: 18.2.0 → 18.3.0
   - lodash: 4.17.21 → 4.17.21
```

### 3. Basic Security Checks

Validates your project's security hygiene.

**What it checks:**
- ✅ `.env` file exposure in git
- ✅ `.gitignore` configuration
- ✅ Hardcoded credentials in package.json
- ✅ Sensitive file exposure

**Example findings:**
```
⚠️  Found 2 security issues:
   🔴 .env exists but is not in .gitignore
   🟡 .env.local exists but is not in .gitignore
```

### 4. Security Recommendations

Provides actionable recommendations based on findings.

**Example:**
```
💡 Recommendations:
   → Run: npm audit fix
   → Run: npm update
   → Review and update .gitignore
```

---

## Enterprise Security Features

Available with enterprise license. Contact admin@agentic-toolkit.com for pricing.

### 1. Automated Vulnerability Fixing

Automatically fixes vulnerabilities with intelligent rollback protection.

**Command:**
```bash
npm run security:fix
```

**How it works:**
1. Runs npm audit fix automatically
2. Checks for breaking changes
3. Validates build success
4. Provides rollback if needed

**Benefits:**
- ✅ Saves time on manual fixes
- ✅ Reduces security window
- ✅ Safe rollback protection
- ✅ Breaking change warnings

### 2. OWASP Compliance Scanning

Full compliance checks against OWASP security standards.

**Command:**
```bash
npm run security:compliance
```

**Compliance areas:**
- ✅ Security headers (CSP, HSTS, X-Frame-Options)
- ✅ Dependency validation
- ✅ Credential protection
- ✅ Encryption standards
- ✅ Input validation
- ✅ Authentication/Authorization

**Example output:**
```
📋 Running OWASP compliance checks...

Compliance Status:
   ✅ Secure Headers: PASS
   ⚠️  Dependency Validation: WARN
   ✅ Credential Protection: PASS
   ✅ Encryption Standards: PASS

Overall Compliance: 95%
```

### 3. Risk Score Calculation

Calculates comprehensive risk score (0-100, lower is better).

**Factors:**
- Vulnerability severity
- Number of vulnerabilities
- Security issues found
- Outdated packages
- Compliance status

**Example:**
```
Risk Score: 35/100 (🟡 Medium Risk)

Breakdown:
   Vulnerabilities: 25 points
   Security Issues: 8 points
   Outdated Packages: 2 points
```

### 4. Detailed Security Reports

Comprehensive JSON reports for analysis and tracking.

**Command:**
```bash
npm run security:enterprise
```

**Report includes:**
- Executive summary
- Detailed findings
- Risk assessment
- Compliance status
- Recommendations
- Trend analysis
- Timestamp

**Report file:** `security-report.json`

### 5. Pre/Post-Deployment Verification

Security checks integrated into deployment process.

**How it works:**
1. Runs security scan before deployment
2. Blocks deployment if critical issues found
3. Verifies security posture after deployment
4. Generates deployment security report

**Configuration:**
```javascript
// In your deploy config
{
  "securityChecks": {
    "preDeploy": true,
    "postDeploy": true,
    "blockOnCritical": true,
    "riskThreshold": 50
  }
}
```

### 6. Security Trend Analysis

Tracks security improvements over time.

**Features:**
- Historical vulnerability tracking
- Risk score trends
- Compliance progress
- Remediation metrics

**Coming soon:**
- Dashboard visualization
- Alert notifications
- Team comparisons

---

## Usage Examples

### Basic Security Scan (FREE)

```bash
# Run basic security scan
npm run security

# Verbose output
npm run security --verbose

# Scan specific directory
npm run security --projectRoot /path/to/project
```

### Enterprise Security Scanning

```bash
# Automated fixing
npm run security:fix

# Compliance scan
npm run security:compliance

# Full enterprise scan
npm run security:enterprise

# Force fix (with breaking changes)
npm run security:enterprise --compliance --force
```

### Integration with Deployment

```bash
# Deploy with security checks
npm run deploy:production --security-check

# Block deployment on critical issues
npm run deploy:production --security-block
```

---

## Security Reports

### Report Structure

```json
{
  "summary": {
    "totalVulnerabilities": 5,
    "totalOutdated": 3,
    "totalIssues": 2,
    "riskScore": 35
  },
  "vulnerabilities": [
    {
      "name": "lodash",
      "severity": "high",
      "title": "Prototype Pollution",
      "vulnerableVersions": "<4.17.21",
      "patchedVersions": ">=4.17.21"
    }
  ],
  "outdatedPackages": [
    {
      "name": "express",
      "current": "4.18.2",
      "latest": "4.19.0",
      "type": "dependencies"
    }
  ],
  "securityIssues": [
    {
      "type": "gitignore",
      "severity": "high",
      "message": ".env exists but is not in .gitignore"
    }
  ],
  "complianceStatus": {
    "secureHeaders": true,
    "dependencyValidation": true,
    "credentialProtection": true,
    "encryptionStandards": true,
    "overallCompliance": 95
  },
  "recommendations": [
    {
      "priority": "urgent",
      "action": "Fix critical vulnerabilities immediately",
      "command": "npm audit fix"
    }
  ],
  "timestamp": "2026-06-13T10:30:00.000Z"
}
```

### Using Security Reports

```javascript
// Load security report
const report = require('./security-report.json');

// Check risk score
if (report.summary.riskScore > 50) {
  console.log('High risk detected!');
}

// Get critical vulnerabilities
const critical = report.vulnerabilities.filter(v => v.severity === 'critical');
console.log(`Found ${critical.length} critical vulnerabilities`);

// Follow recommendations
report.recommendations.forEach(rec => {
  console.log(`${rec.priority}: ${rec.action}`);
});
```

---

## Best Practices

### 1. Regular Security Scanning

**Recommended schedule:**
- ✅ Before every deployment
- ✅ Weekly in development
- ✅ Daily in production (Enterprise)
- ✅ After dependency updates

### 2. Dependency Management

**Best practices:**
- ✅ Keep dependencies up to date
- ✅ Review security advisories
- ✅ Test updates in staging first
- ✅ Use lock files (package-lock.json)

### 3. Credential Protection

**Security checklist:**
- ✅ Never commit .env files
- ✅ Use environment variables
- ✅ Rotate credentials regularly
- ✅ Use SSH keys instead of passwords
- ✅ Enable 2FA where possible

### 4. Incident Response

**When critical vulnerabilities are found:**
1. **Immediate assessment** - Understand the risk
2. **Patch quickly** - Use automated fixing (Enterprise)
3. **Test thoroughly** - Verify no breaking changes
4. **Deploy rapidly** - Minimize exposure window
5. **Monitor closely** - Watch for anomalies

### 5. Team Training

**Educate your team:**
- Security awareness training
- OWASP Top 10 knowledge
- Secure coding practices
- Incident response procedures

---

## FAQ

### Q: Is the security scanner free?

**A:** Yes! Basic security scanning is free for all users. Enterprise features require a license.

### Q: How often should I run security scans?

**A:** We recommend:
- Before every deployment
- Weekly in development
- Daily in production (Enterprise users)

### Q: Can automated fixing break my application?

**A:** Rarely, but it's possible. Enterprise edition includes:
- Breaking change warnings
- Build verification
- Rollback protection

### Q: What's the difference between npm audit and this scanner?

**A:** Our scanner includes npm audit PLUS:
- Outdated package detection
- Basic security checks
- Enterprise features (OWASP, risk scoring)
- Integrated deployment workflow
- Detailed reporting

### Q: Can I integrate this with CI/CD?

**A:** Yes! Examples:

**GitHub Actions:**
```yaml
- name: Security Scan
  run: npm run security

- name: Block on Critical Issues
  if: contains(steps.security.outputs.*, 'critical')
  run: exit 1
```

**Jenkins:**
```groovy
stage('Security') {
  steps {
    sh 'npm run security:enterprise'
  }
  post {
    failure {
      mail to: 'team@example.com',
           subject: 'Security scan failed'
    }
  }
}
```

### Q: How do I upgrade to Enterprise?

**A:** Contact us at admin@agentic-toolkit.com for:
- Pricing information
- License keys
- Setup assistance
- Enterprise support

### Q: Can I customize security rules?

**A:** Enterprise users can:
- Configure risk thresholds
- Custom compliance checks
- White/black-list packages
- Custom reporting templates
- Integration with existing tools

### Q: What happens if a deployment fails security checks?

**A:**
- **Free version**: Warning, deployment continues
- **Enterprise version**: Can block deployment if risk threshold exceeded

### Q: Are my security reports private?

**A:** Yes! Security reports are:
- Stored locally on your machine
- Never transmitted to external servers
- Never shared with third parties
- Protected under the same privacy as your credentials

---

## Coming Soon

### Near Future
- ✅ Snyk integration
- ✅ Dependabot integration
- ✅ Security dashboard
- ✅ Alert notifications
- ✅ Team management
- ✅ Policy enforcement

### Future Roadmap
- ✅ Container security scanning
- ✅ Infrastructure as Code security
- ✅ API security testing
- ✅ DAST (Dynamic Application Security Testing)
- ✅ SAST (Static Application Security Testing)

---

## Support

### Security Issues
Report security vulnerabilities privately: admin@agentic-toolkit.com

### General Questions
Open an issue: https://github.com/chibuenyim/universal-deploy-bundle/issues

### Enterprise Support
Email: admin@agentic-toolkit.com
Response time: <24 hours for enterprise customers

---

## License

MIT License with COMMERCIAL USE RESTRICTIONS.

Enterprise features require explicit permission and licensing.

See [LICENSE](LICENSE) file for details.

---

**🛡️ Keep your deployments secure with Universal Deploy Bundle!**