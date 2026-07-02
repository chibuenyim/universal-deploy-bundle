# V4.1.3 Pre-Commit Code Scanner

## 🔍 What is V4.1.3 Pre-Commit Scanning?

**V4.1.3 adds comprehensive code quality gatekeeping** that scans your code BEFORE it's committed to the repository. This prevents bad code, security issues, and credential leaks from ever entering your codebase.

### Not Just for Deployment - It's a Code Quality Gatekeeper!

While the Universal Deploy Bundle V4 was originally designed for deployment safety, V4.1.3 expands its scope to **gatekeep all code changes** for:

- ✅ **Security** - No credentials, secrets, or private keys
- ✅ **Quality** - No build errors, console.logs, or TODOs
- ✅ **Standards** - Twelve-factor compliance and best practices
- ✅ **Performance** - No anti-patterns or inefficient code
- ✅ **Team Consistency** - Everyone follows the same rules automatically

---

## 🚀 Key Features

### 1. **Security Scanning** (BLOCKS commits)
- 🔒 Hardcoded SSH keys (like `~/.ssh/id_rsa_cheapestdata`)
- 🔒 API keys, tokens, passwords
- 🔒 AWS/GCP/Azure credentials
- 🔒 Database URLs with credentials
- 🔒 JWT secrets, private keys
- 🔒 Any secret pattern you define

### 2. **Build Error Detection** (BLOCKS commits)
- ❌ TypeScript errors
- ❌ ESLint violations
- ❌ Module resolution errors
- ❌ Missing dependencies
- ❌ Syntax errors

### 3. **Code Quality** (WARNS)
- ⚠️ `console.log` statements
- ⚠️ `debugger` statements
- ⚠️ `TODO`, `FIXME`, `HACK` comments
- ⚠️ Commented-out code blocks
- ⚠️ `@ts-ignore`, `@ts-nocheck`
- ⚠️ Long lines (configurable)

### 4. **Twelve-Factor Compliance** (WARNS)
- 🌐 Hardcoded localhost URLs
- 🌐 Config in code (not environment)
- 🌐 Environment-specific code

### 5. **Performance & Best Practices** (WARNS)
- ⚡ Deep nesting
- ⚡ Large functions
- ⚡ Inefficient patterns
- ⚡ `var` keyword usage
- ⚡ `any` type overuse

---

## 📦 Installation

### Quick Install

```bash
cd universal-deployer-v4
bash hooks/INSTALL-HOOKS.sh
```

This installs:
- `.git/hooks/pre-commit` - Runs before every commit
- `.git/hooks/pre-push` - Runs before every push
- `.pre-commit-config.json` - Configuration file

### Manual Install

```bash
# Copy hooks
cp hooks/pre-commit .git/hooks/pre-commit
cp hooks/pre-push .git/hooks/pre-push

# Make executable
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push

# Copy config
cp .pre-commit-config.json.example .pre-commit-config.json
```

---

## ⚙️ Configuration

### Configuration File: `.pre-commit-config.json`

```json
{
  "enabled": true,

  "blockOn": {
    "credentials": true,      // Block commits with credentials
    "buildErrors": true,      // Block commits with build errors
    "twelveFactor": false,    // Warn (don't block) on 12-factor issues
    "debugCode": false,       // Warn (don't block) on debug code
    "securityIssues": true    // Block commits with security issues
  },

  "warnOn": {
    "debugCode": true,        // Warn about console.log, debugger
    "todos": true,            // Warn about TODO, FIXME
    "commentedCode": true,    // Warn about commented code blocks
    "longLines": false,       // Don't warn about long lines
    "codeSmells": true,       // Warn about code smells
    "performanceIssues": true // Warn about performance issues
  },

  "exceptions": [
    "**/*.test.js",           // Don't scan test files
    "**/*.spec.js",
    "**/node_modules/**",     // Don't scan dependencies
    "**/dist/**",
    "**/.next/**"
  ],

  "maxLineLength": 120        // Maximum line length
}
```

### Rule Categories

#### 1. Security Rules (`rules.security`)

```json
"security": {
  "patterns": {
    "sshKeyPaths": true,      // SSH key paths
    "apiKeys": true,          // API keys
    "passwords": true,        // Passwords
    "tokens": true,           // Auth tokens
    "awsCredentials": true,   // AWS keys
    "databaseUrls": true,     // Database URLs with credentials
    "jwtSecrets": true,       // JWT secrets
    "privateKeys": true       // Private keys
  }
}
```

#### 2. Build Error Rules (`rules.buildErrors`)

```json
"buildErrors": {
  "patterns": {
    "typeScript": true,       // TypeScript errors
    "eslint": true,           // ESLint violations
    "moduleResolution": true, // Module not found errors
    "dependencies": true      // Missing dependencies
  }
}
```

#### 3. Code Quality Rules (`rules.codeQuality`)

```json
"codeQuality": {
  "patterns": {
    "consoleLog": true,       // console.log statements
    "debugger": true,         // debugger statements
    "todo": true,             // TODO comments
    "fixme": true,            // FIXME comments
    "hack": true,             // HACK comments
    "tsIgnore": true,         // @ts-ignore
    "commentedCode": true,    // Commented code blocks
    "longLines": false,        // Long lines
    "deepNesting": true,      // Deep nesting
    "duplicateCode": false     // Duplicate code
  }
}
```

#### 4. Twelve-Factor Rules (`rules.twelveFactor`)

```json
"twelveFactor": {
  "patterns": {
    "hardcodedConfig": true,  // Config in code
    "localhostUrls": true,    // Hardcoded localhost
    "environmentSpecificCode": true // Env-specific code
  }
}
```

---

## 🎯 Usage

### Automatic Usage (Recommended)

Once installed, hooks run **automatically** on every commit/push:

```bash
# Make some changes
vim config.js

# Try to commit - scanner runs automatically
git add config.js
git commit -m "Update config"

# If issues found, commit is blocked with details
# If no issues, commit proceeds normally
```

### Manual Testing

Test the scanner without committing:

```bash
# Scan all staged files
node hooks/pre-commit-scan.js

# Scan specific file
node hooks/pre-commit-scan.js path/to/file.js

# Scan with verbose output
VERBOSE=true node hooks/pre-commit-scan.js
```

### Bypass Scanner (NOT RECOMMENDED)

If you need to bypass the scanner:

```bash
# Bypass pre-commit hook
git commit --no-verify -m "Message"

# Bypass pre-push hook
git push --no-verify
```

⚠️ **Only use `--no-verify` for truly exceptional cases!**

---

## 📊 Scan Results

### Success Example

```bash
$ git commit -m "Add new feature"

🔍 V4.1.3 Pre-Commit Scanner
════════════════════════════════════════════════════════════════════════
📁 Staged files: 3
🔬 Files to scan: 3

   Scanning: src/config.js
   Scanning: src/api.js
   Scanning: src/utils.js

════════════════════════════════════════════════════════════════════════
📊 SCAN RESULTS
════════════════════════════════════════════════════════════════════════

⚠️  WARNINGS:

   DEBUG_CODE (2):

      1. src/utils.js
         console.log found (3 occurrence(s))

════════════════════════════════════════════════════════════════════════
📋 SUMMARY:
   Critical Errors: 0
   Warnings: 1
════════════════════════════════════════════════════════════════════════

✅ COMMIT APPROVED

⚠️  Note: Warnings are present. Please review and fix when possible.
```

### Blocked Example

```bash
$ git commit -m "Add API config"

🔍 V4.1.3 Pre-Commit Scanner
════════════════════════════════════════════════════════════════════════
📁 Staged files: 1
🔬 Files to scan: 1

   Scanning: src/config.js

════════════════════════════════════════════════════════════════════════
📊 SCAN RESULTS
════════════════════════════════════════════════════════════════════════

❌ CRITICAL ERRORS (Commit BLOCKED):

   CREDENTIAL (1):

      1. src/config.js
         API key detected: apiKey: "1234567890abcdef"
         💡 Fix: Move credentials to environment variables or secure config

════════════════════════════════════════════════════════════════════════
📋 SUMMARY:
   Critical Errors: 1
   Warnings: 0
════════════════════════════════════════════════════════════════════════

❌ COMMIT BLOCKED
   Critical errors must be fixed before committing.

   How to fix:
   1. Review the errors above
   2. Fix the issues in your code
   3. Stage the fixed files: git add <files>
   4. Commit again: git commit

   To bypass (NOT RECOMMENDED):
   git commit --no-verify
```

---

## 🛠️ Credential Cleanup

### Cleaning Git History

If you've accidentally committed credentials, clean them up:

```bash
# Scan git history for credentials
bash hooks/CREDENTIAL-CLEANUP.sh

# This will:
# 1. Scan all commits for credential patterns
# 2. List all problematic commits
# 3. Provide cleanup options
# 4. Create passwords.txt for BFG Repo-Cleaner
```

### Manual Cleanup with BFG

```bash
# Install BFG
brew install bfg

# Run cleanup
bfg --replace-text passwords.txt .

# Finish cleanup
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (⚠️ DESTRUCTIVE!)
git push origin --force --all
git push origin --force --tags

# Notify team to re-clone
```

---

## 🎨 Custom Patterns

### Adding Custom Credential Patterns

Edit `hooks/pre-commit-scan.js` and add to `credentialPatterns`:

```javascript
{
  pattern: /your_custom_pattern/gi,
  name: 'Your Custom Pattern',
  examples: ['example match'],
}
```

### Adding Custom Warning Patterns

Add to `debugPatterns`, `twelveFactorPatterns`, etc. in the scanner.

---

## 📚 Best Practices

### 1. Team Adoption

**Setup for your team:**

```bash
# Add hook installation to onboarding
echo "bash hooks/INSTALL-HOOKS.sh" >> docs/onboarding.md

# Commit the hooks
git add hooks/ .pre-commit-config.json
git commit -m "Add V4.1.3 pre-commit scanner"
git push
```

**Team members then run:**

```bash
git pull
bash hooks/INSTALL-HOOKS.sh
```

### 2. Progressive Enforcement

**Phase 1: Warnings Only (Week 1)**
```json
{
  "blockOn": {
    "credentials": false,    // Warn only
    "buildErrors": false,    // Warn only
    "debugCode": false       // Don't block
  }
}
```

**Phase 2: Block Critical Issues (Week 2)**
```json
{
  "blockOn": {
    "credentials": true,     // Block credentials
    "buildErrors": true,     // Block build errors
    "debugCode": false       // Still don't block debug code
  }
}
```

**Phase 3: Full Enforcement (Week 3+)**
```json
{
  "blockOn": {
    "credentials": true,
    "buildErrors": true,
    "debugCode": true        // Block everything
  }
}
```

### 3. CI/CD Integration

Add scanner to your CI pipeline:

```yaml
# .github/workflows/quality-check.yml
name: Code Quality Check

on: [pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Pre-Commit Scanner
        run: node hooks/pre-commit-scan.js
```

---

## 🔍 Advanced Usage

### Scanning Without Committing

```bash
# Scan all files
node hooks/pre-commit-scan.js

# Scan specific directory
node hooks/pre-commit-scan.js src/

# Scan with custom config
CUSTOM_CONFIG=.pre-commit-custom.json node hooks/pre-commit-scan.js
```

### Integration with Other Tools

**With Husky:**

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "node hooks/pre-commit-scan.js",
      "pre-push": "node hooks/pre-commit-scan.js"
    }
  }
}
```

**With lint-staged:**

```json
// package.json
{
  "lint-staged": {
    "*.js": ["node hooks/pre-commit-scan.js", "eslint --fix"]
  }
}
```

---

## 🐛 Troubleshooting

### Hook Not Running

```bash
# Check if hook is executable
ls -la .git/hooks/pre-commit

# Make executable
chmod +x .git/hooks/pre-commit
```

### Scanner Too Strict

```bash
# Edit config to relax rules
vim .pre-commit-config.json

# Add exceptions
"exceptions": [
  "**/*.test.js",
  "**/legacy/**",
  "**/vendor/**"
]
```

### False Positives

```bash
# Report false positives at:
# https://github.com/chibuenyim/universal-deploy-bundle/issues

# Temporarily bypass
git commit --no-verify
```

---

## 📖 Resources

- **Main Docs**: [README.md](./README.md)
- **V4.1.3 Release Notes**: [V4.1.3-RELEASE-NOTES.md](./V4.1.3-RELEASE-NOTES.md)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)
- **Issues**: https://github.com/chibuenyim/universal-deploy-bundle/issues

---

## 🎉 Benefits

### For Individual Developers
- ✅ Catch mistakes before committing
- ✅ Learn best practices automatically
- ✅ Never leak credentials again
- ✅ Cleaner commits history

### For Teams
- ✅ Consistent code quality across team
- ✅ Enforce standards automatically
- ✅ Less code review time
- ✅ Fewer production bugs

### For Projects
- ✅ Higher code quality
- ✅ Better security posture
- ✅ Compliance with best practices
- ✅ Maintainable codebase

---

**🚀 Install V4.1.3 today and gatekeep your code quality!**
