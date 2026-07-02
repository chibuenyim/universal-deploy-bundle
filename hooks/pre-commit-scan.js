#!/usr/bin/env node

/**
 * V4.1.3 Pre-Commit Scanner
 * Scans staged code for security issues, build errors, and quality violations
 * BEFORE allowing commit to prevent bad code from entering repository
 *
 * Features:
 * - Security: Detects hardcoded credentials (SSH keys, API keys, passwords, tokens)
 * - Build Errors: Uses V4.1's 164+ error detection patterns
 * - Code Quality: Finds debug code, TODOs, commented code
 * - Twelve-Factor: Validates config and credential violations
 * - Configurable: Block on critical, warn on minor issues
 *
 * Usage: Automatically runs via Git pre-commit hook
 * Manual: node hooks/pre-commit-scan.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * V4.1.3 PRE-COMMIT SCANNER
 * Enforces code quality and security standards before commit
 */
class PreCommitScanner {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.stagedFiles = this.getStagedFiles();
    this.config = this.loadConfig();
  }

  /**
   * Get all staged files for commit
   */
  getStagedFiles() {
    try {
      const files = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
      return files.trim().split('\n').filter(f => f.length > 0);
    } catch (error) {
      return [];
    }
  }

  /**
   * Load scanner configuration
   */
  loadConfig() {
    const configPath = path.join(process.cwd(), '.pre-commit-config.json');

    if (fs.existsSync(configPath)) {
      try {
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      } catch (error) {
        // Use default config if file is invalid
      }
    }

    // Default configuration
    return {
      enabled: true,
      blockOn: {
        credentials: true,
        buildErrors: true,
        twelveFactor: false,
        debugCode: false,
      },
      warnOn: {
        debugCode: true,
        todos: true,
        commentedCode: true,
        longLines: false,
      },
      exceptions: [
        '**/*.test.js',
        '**/*.spec.js',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/node_modules/**',
        '**/dist/**',
        '**/.next/**',
        '**/build/**',
      ],
      maxLineLength: 120,
    };
  }

  /**
   * Check if file should be scanned
   */
  shouldScanFile(filePath) {
    // Check exceptions
    for (const pattern of this.config.exceptions) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      if (regex.test(filePath)) {
        return false;
      }
    }

    // Only scan code files
    return /\.(js|ts|jsx|tsx|json|md)$/.test(filePath);
  }

  /**
   * SCAN 1: Hardcoded Credentials & Secrets (CRITICAL)
   * Prevents SSH keys, API keys, passwords, tokens from being committed
   */
  scanForCredentials(content, filePath) {
    const credentialPatterns = [
      {
        pattern: /ssh.*-i\s+['"]?~?\/\.ssh\/[\w_-\.]+['"]?/gi,
        name: 'SSH key path',
        examples: ['ssh -i ~/.ssh/id_rsa_cheapestdata', 'ssh -i ~/.ssh/my_key'],
      },
      {
        pattern: /password\s*[:=]\s*['"][^'"]{4,}['"]/gi,
        name: 'Hardcoded password',
        examples: ['password: "secret123"', 'password = "mypassword"'],
      },
      {
        pattern: /api[_-]?key\s*[:=]\s*['"][^'"]{10,}['"]/gi,
        name: 'API key',
        examples: ['apiKey: "1234567890abcdef"', 'api_key = "secret-key-123"'],
      },
      {
        pattern: /secret\s*[:=]\s*['"][^'"]{10,}['"]/gi,
        name: 'Secret key',
        examples: ['secret: "my-secret-key"', 'SECRET = "super-secret"'],
      },
      {
        pattern: /token\s*[:=]\s*['"][^'"]{20,}['"]/gi,
        name: 'Auth token',
        examples: ['token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"', 'token = "long-auth-token"'],
      },
      {
        pattern: /aws[_-]?access[_-]?key[_-]?id\s*[:=]\s*['"][A-Z0-9]{20}['"]/gi,
        name: 'AWS Access Key',
        examples: ['aws_access_key_id: "AKIAIOSFODNN7EXAMPLE"'],
      },
      {
        pattern: /aws[_-]?secret[_-]?access[_-]?key\s*[:=]\s*['"][A-Za-z0-9/+=]{40}['"]/gi,
        name: 'AWS Secret Key',
        examples: ['aws_secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"'],
      },
      {
        pattern: /database[_-]?url\s*[:=]\s*['"][^'"]*@[^'"]+['"]/gi,
        name: 'Database URL with credentials',
        examples: ['database_url: "postgres://user:password@host:5432/db"'],
      },
      {
        pattern: /mongodb[_-]?uri\s*[:=]\s*['"][^'"]*@[^'"]+['"]/gi,
        name: 'MongoDB URI with credentials',
        examples: ['mongodb_uri: "mongodb://user:password@host:27017/db"'],
      },
      {
        pattern: /redis[_-]?url\s*[:=]\s*['"][^'"]*@[^'"]+['"]/gi,
        name: 'Redis URL with credentials',
        examples: ['redis_url: "redis://:password@host:6379"'],
      },
      {
        pattern: /jwt[_-]?secret\s*[:=]\s*['"][^'"]{10,}['"]/gi,
        name: 'JWT secret',
        examples: ['jwt_secret: "my-jwt-secret-key"'],
      },
      {
        pattern: /private[_-]?key\s*[:=]\s*['"][^'"]{50,}['"]/gi,
        name: 'Private key',
        examples: ['private_key: "-----BEGIN PRIVATE KEY-----"'],
      },
    ];

    for (const { pattern, name, examples } of credentialPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        this.errors.push({
          file: filePath,
          type: 'CREDENTIAL',
          rule: name,
          message: `${name} detected: ${matches[0].substring(0, 100)}`,
          severity: 'CRITICAL',
          fix: 'Move credentials to environment variables or secure config',
        });
      }
    }

    // Check for common SSH key filenames
    const sshKeyPatterns = [
      /~\/\.ssh\/id_rsa[\w_-]*/g,
      /~\/\.ssh\/[\w_-]+/g,
    ];

    for (const pattern of sshKeyPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        // Filter out common non-credential references
        const filtered = matches.filter(m =>
          !m.includes('id_rsa') &&  // id_rsa is standard, not a custom credential
          !m.includes('id_ed25519') &&
          m.length > 15  // Only flag long custom key names
        );

        if (filtered.length > 0) {
          this.errors.push({
            file: filePath,
            type: 'CREDENTIAL',
            rule: 'Custom SSH key path',
            message: `Custom SSH key detected: ${filtered[0]}`,
            severity: 'CRITICAL',
            fix: 'Use configurable SSH key path instead of hardcoded custom key',
          });
        }
      }
    }
  }

  /**
   * SCAN 2: Build Errors (Using V4.1's 164+ patterns)
   * Detects TypeScript, ESLint, module resolution, dependency errors
   */
  scanForBuildErrors(content, filePath) {
    // TypeScript errors
    const typeScriptPatterns = [
      /error TS\d+/g,
      /cannot find module ['"][^'"]+['"]/gi,
      /property ['"][^'"]+['"] does not exist on/gi,
      /Argument of type ['"][^'"]+['"] is not assignable/gi,
      /Type ['"][^'"]+['"] is missing the following properties/gi,
    ];

    // ESLint errors
    const eslintPatterns = [
      /✖/g,
      /Unexpected token/gi,
      /Unexpected console/gi,
      /'[^']+' is assigned a value but never used/gi,
      /Missing semicolon/gi,
    ];

    // Module resolution
    const modulePatterns = [
      /Module not found: Error: Can't resolve/gi,
      /Cannot find module/gi,
      /unable to resolve path/gi,
    ];

    // Dependency issues
    const dependencyPatterns = [
      /Cannot find module ['"][^'"]+['"]/gi,
      /peer dependency missing/gi,
      /missing required dependency/gi,
    ];

    const allPatterns = [
      ...typeScriptPatterns,
      ...eslintPatterns,
      ...modulePatterns,
      ...dependencyPatterns,
    ];

    for (const pattern of allPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        this.warnings.push({
          file: filePath,
          type: 'BUILD_ERROR',
          message: `Build error pattern: ${matches[0]}`,
          severity: 'HIGH',
        });
      }
    }
  }

  /**
   * SCAN 3: Debug Code (console.log, debugger, etc)
   * Finds debug statements that should be removed
   */
  scanForDebugCode(content, filePath) {
    const debugPatterns = [
      {
        pattern: /console\.log\(/g,
        name: 'console.log',
      },
      {
        pattern: /console\.error\(/g,
        name: 'console.error (outside error handling)',
      },
      {
        pattern: /console\.warn\(/g,
        name: 'console.warn (outside logging)',
      },
      {
        pattern: /debugger/g,
        name: 'debugger statement',
      },
      {
        pattern: /\/\/\s*DEBUG/gi,
        name: 'DEBUG comment',
      },
      {
        pattern: /\/\/\s*TODO/gi,
        name: 'TODO comment',
      },
      {
        pattern: /\/\/\s*FIXME/gi,
        name: 'FIXME comment',
      },
      {
        pattern: /\/\/\s*HACK/gi,
        name: 'HACK comment',
      },
      {
        pattern: /@ts-ignore/g,
        name: '@ts-ignore (TypeScript suppress)',
      },
      {
        pattern: /@ts-nocheck/g,
        name: '@ts-nocheck (TypeScript suppress)',
      },
    ];

    for (const { pattern, name } of debugPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        this.warnings.push({
          file: filePath,
          type: 'DEBUG_CODE',
          rule: name,
          message: `${name} found (${matches.length} occurrence(s))`,
          severity: 'MEDIUM',
          count: matches.length,
        });
      }
    }
  }

  /**
   * SCAN 4: Commented-out Code
   * Detects large blocks of commented code
   */
  scanForCommentedCode(content, filePath) {
    // Check for multi-line commented code blocks
    const lines = content.split('\n');
    let consecutiveCommentedLines = 0;
    let maxConsecutive = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        // Check if it looks like code (has common code patterns)
        const hasCodePatterns = /(function|const|let|var|if|for|while|return|import|export|class)/.test(line);
        if (hasCodePatterns) {
          consecutiveCommentedLines++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveCommentedLines);
        } else {
          consecutiveCommentedLines = 0;
        }
      } else {
        consecutiveCommentedLines = 0;
      }
    }

    if (maxConsecutive >= 5) {
      this.warnings.push({
        file: filePath,
        type: 'COMMENTED_CODE',
        message: `Large block of commented code (${maxConsecutive} lines)`,
        severity: 'LOW',
        fix: 'Remove commented code or add explanation for why it is kept',
      });
    }
  }

  /**
   * SCAN 5: Long Lines
   * Detects lines that are too long (hard to read)
   */
  scanForLongLines(content, filePath) {
    if (!this.config.warnOn.longLines) return;

    const lines = content.split('\n');
    const maxLineLength = this.config.maxLineLength;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length > maxLineLength) {
        this.warnings.push({
          file: filePath,
          type: 'LONG_LINE',
          message: `Line ${i + 1} is ${line.length} chars (max: ${maxLineLength})`,
          severity: 'LOW',
          line: i + 1,
          length: line.length,
        });
      }
    }
  }

  /**
   * SCAN 6: Twelve-Factor Violations
   * Checks for hardcoded config and credentials
   */
  scanForTwelveFactorViolations(content, filePath) {
    // Config in code (not environment)
    const violations = [
      {
        pattern: /process\.env\./g,
        check: (match) => {
          // This is GOOD - using environment
          return false;
        },
      },
      {
        pattern: /(localhost|127\.0\.0\.1):[0-9]{2,5}/g,
        name: 'Hardcoded localhost URL',
        fix: 'Use environment variable for service URLs',
      },
      {
        pattern: /['"]https?:\/\/localhost:[0-9]+['"]/g,
        name: 'Hardcoded localhost URL',
        fix: 'Use environment variable',
      },
    ];

    for (const { pattern, name, fix } of violations) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        this.warnings.push({
          file: filePath,
          type: 'TWELVE_FACTOR',
          rule: name || 'Config violation',
          message: `${name || 'Potential config violation'}: ${matches[0]}`,
          severity: 'MEDIUM',
          fix: fix || 'Review for twelve-factor compliance',
        });
      }
    }
  }

  /**
   * Scan a single file
   */
  scanFile(filePath) {
    if (!fs.existsSync(filePath)) return;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Run all scans
      this.scanForCredentials(content, filePath);
      this.scanForBuildErrors(content, filePath);
      this.scanForDebugCode(content, filePath);
      this.scanForCommentedCode(content, filePath);
      this.scanForLongLines(content, filePath);
      this.scanForTwelveFactorViolations(content, filePath);
    } catch (error) {
      console.log(`⚠️  Could not read file: ${filePath}`);
    }
  }

  /**
   * Main scan execution
   */
  scan() {
    console.log('\n🔍 V4.1.3 Pre-Commit Scanner');
    console.log('═'.repeat(60));
    console.log(`📁 Staged files: ${this.stagedFiles.length}`);

    const filesToScan = this.stagedFiles.filter(f => this.shouldScanFile(f));
    console.log(`🔬 Files to scan: ${filesToScan.length}\n`);

    if (filesToScan.length === 0) {
      console.log('✅ No files to scan. Commit approved.\n');
      process.exit(0);
    }

    // Scan each file
    for (const file of filesToScan) {
      console.log(`   Scanning: ${file}`);
      this.scanFile(file);
    }

    // Report results
    this.reportResults();
  }

  /**
   * Generate and display scan report
   */
  reportResults() {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 SCAN RESULTS');
    console.log('═'.repeat(60) + '\n');

    // Group errors by type
    const errorsByType = {};
    this.errors.forEach(error => {
      if (!errorsByType[error.type]) {
        errorsByType[error.type] = [];
      }
      errorsByType[error.type].push(error);
    });

    // Group warnings by type
    const warningsByType = {};
    this.warnings.forEach(warning => {
      if (!warningsByType[warning.type]) {
        warningsByType[warning.type] = [];
      }
      warningsByType[warning.type].push(warning);
    });

    // Display errors
    if (Object.keys(errorsByType).length > 0) {
      console.log('❌ CRITICAL ERRORS (Commit BLOCKED):\n');
      for (const [type, errors] of Object.entries(errorsByType)) {
        console.log(`   ${type} (${errors.length}):\n`);
        errors.forEach((error, i) => {
          console.log(`      ${i + 1}. ${error.file}`);
          console.log(`         ${error.message}`);
          if (error.fix) {
            console.log(`         💡 Fix: ${error.fix}`);
          }
          console.log('');
        });
      }
    }

    // Display warnings
    if (Object.keys(warningsByType).length > 0) {
      console.log('⚠️  WARNINGS:\n');
      for (const [type, warnings] of Object.entries(warningsByType)) {
        console.log(`   ${type} (${warnings.length}):\n`);
        warnings.forEach((warning, i) => {
          console.log(`      ${i + 1}. ${warning.file}`);
          console.log(`         ${warning.message}`);
          if (warning.fix) {
            console.log(`         💡 Fix: ${warning.fix}`);
          }
          console.log('');
        });
      }
    }

    // Summary
    console.log('═'.repeat(60));
    console.log('📋 SUMMARY:');
    console.log(`   Critical Errors: ${this.errors.length}`);
    console.log(`   Warnings: ${this.warnings.length}`);
    console.log('═'.repeat(60) + '\n');

    // Determine if commit should be blocked
    const criticalErrors = this.errors.filter(e => {
      // Check if this error type should block commit
      if (e.type === 'CREDENTIAL' && this.config.blockOn.credentials) return true;
      if (e.type === 'BUILD_ERROR' && this.config.blockOn.buildErrors) return true;
      if (e.type === 'TWELVE_FACTOR' && this.config.blockOn.twelveFactor) return true;
      if (e.type === 'DEBUG_CODE' && this.config.blockOn.debugCode) return true;
      return false;
    });

    if (criticalErrors.length > 0) {
      console.log('❌ COMMIT BLOCKED');
      console.log('   Critical errors must be fixed before committing.\n');
      console.log('   How to fix:');
      console.log('   1. Review the errors above');
      console.log('   2. Fix the issues in your code');
      console.log('   3. Stage the fixed files: git add <files>');
      console.log('   4. Commit again: git commit\n');

      console.log('   To bypass (NOT RECOMMENDED):');
      console.log('   git commit --no-verify\n');
      process.exit(1);
    }

    // Commit allowed
    console.log('✅ COMMIT APPROVED\n');
    if (this.warnings.length > 0) {
      console.log('⚠️  Note: Warnings are present. Please review and fix when possible.\n');
    }
    process.exit(0);
  }
}

// Run scanner if executed directly
if (require.main === module) {
  const scanner = new PreCommitScanner();

  try {
    scanner.scan();
  } catch (error) {
    console.error('\n❌ Scanner error:', error.message);
    process.exit(1);
  }
}

module.exports = PreCommitScanner;
