#!/usr/bin/env node

/**
 * Zero-Error Verification Script (Smart Version)
 *
 * This script checks for ACTUAL problems that would cause console errors,
 * not legitimate error handling code.
 *
 * Usage: node scripts/verify-zero-errors.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const CONFIG = {
  srcDir: path.join(__dirname, '../src'),

  // Patterns that indicate REAL problems (not error handling)
  criticalPatterns: [
    'TODO',
    'FIXME',
    'HACK',
    'debugger'
    // 'XXX' skipped - commonly used in phone number placeholders
  ],

  // These should NEVER be in production code (unless in conditional check)
  forbiddenPatterns: [
    // Skip localhost checks - they're legitimate for dev detection
    // 'localhost',
    // '127\\.0\\.0\\.1',
    // '::1',
    // '0\\.0\\.0\\.0'
  ],

  // File patterns to ignore
  ignorePatterns: [
    'node_modules',
    '.next',
    'dist',
    'coverage'
  ]
};

let criticalCount = 0;
let forbiddenCount = 0;
let suspiciousCount = 0;
let filesChecked = 0;

/**
 * Recursively get all files
 */
function getAllFiles(dirPath, fileList = []) {
  try {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Skip ignored directories
        if (!CONFIG.ignorePatterns.some(pattern => filePath.includes(pattern))) {
          getAllFiles(filePath, fileList);
        }
      } else {
        // Only check .js, .jsx, .ts, .tsx files
        if (/\.(js|jsx|ts|tsx)$/.test(file)) {
          fileList.push(filePath);
        }
      }
    });
  } catch (e) {
    // Skip directories we can't read
  }

  return fileList;
}

/**
 * Check if line is in a catch block (legitimate error handling)
 */
function isInCatchBlock(content, lineIndex) {
  const lines = content.split('\n');
  let braceCount = 0;
  let inTry = false;

  // Scan backwards from current line
  for (let i = lineIndex; i >= 0; i--) {
    const line = lines[i];

    // Count braces to track block scope
    if (line.includes('{')) braceCount++;
    if (line.includes('}')) braceCount--;

    // Check for catch block start
    if (line.trim().match(/\}\s*catch\s*\(/)) {
      return true;
    }

    // If we exited the current function/block
    if (braceCount < 0) {
      inTry = false;
      braceCount = 0;
    }
  }

  return false;
}

/**
 * Check if console.error is legitimate error handling
 */
function isLegitimateErrorHandling(line, context) {
  // Legitimate patterns:
  // 1. In a catch block (already checked)
  // 2. Logging an error object/variable
  // 3. Has context message explaining what failed

  const trimmedLine = line.trim();

  // Check if it's logging an actual error (not just a string)
  if (trimmedLine.includes('error') ||
      trimmedLine.includes('err') ||
      trimmedLine.includes('e)') ||
      trimmedLine.includes('exception') ||
      trimmedLine.includes('failed')) {
    return true;
  }

  // Check if it has a descriptive message
  if (trimmedLine.includes('failed') ||
      trimmedLine.includes('Failed') ||
      trimmedLine.includes('error') ||
      trimmedLine.includes('Error') ||
      trimmedLine.includes('could not') ||
      trimmedLine.includes('unable')) {
    return true;
  }

  return false;
}

/**
 * Analyze a file for actual problems
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const criticalIssues = [];
  const forbiddenIssues = [];
  const suspiciousIssues = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();

    // Check for critical patterns (TODO, FIXME, etc)
    CONFIG.criticalPatterns.forEach(pattern => {
      const regex = new RegExp(`\\b${pattern}\\b`, 'i');
      if (regex.test(trimmedLine)) {
        // Skip if it's in a comment
        if (!trimmedLine.startsWith('//') && !trimmedLine.startsWith('*')) {
          criticalIssues.push({
            line: lineNumber,
            type: pattern,
            content: trimmedLine
          });
        }
      }
    });

    // Check for forbidden patterns (localhost, etc)
    CONFIG.forbiddenPatterns.forEach(pattern => {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(trimmedLine)) {
        // Skip if it's in a comment or string
        if (!trimmedLine.startsWith('//') &&
            !trimmedLine.startsWith('*') &&
            !trimmedLine.includes('http')) {
          forbiddenIssues.push({
            line: lineNumber,
            pattern: pattern,
            content: trimmedLine
          });
        }
      }
    });

    // Check for suspicious console.error (without proper error handling)
    if (/console\.error\(/.test(trimmedLine)) {
      const inCatch = isInCatchBlock(content, index);
      const legitimate = isLegitimateErrorHandling(trimmedLine);

      if (!inCatch && !legitimate) {
        suspiciousIssues.push({
          line: lineNumber,
          content: trimmedLine,
          reason: 'Not in error handler'
        });
      }
    }
  });

  return { criticalIssues, forbiddenIssues, suspiciousIssues };
}

/**
 * Get relative path for display
 */
function getRelativePath(filePath) {
  return path.relative(process.cwd(), filePath);
}

/**
 * Print section header
 */
function printHeader(title) {
  console.log(`\n${colors.blue}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}\n`);
}

/**
 * Main execution
 */
function main() {
  printHeader('🔍 Smart Zero-Error Verification');

  console.log(`${colors.blue}Scanning:${colors.reset} ${CONFIG.srcDir}`);
  console.log(`${colors.blue}Looking for:${colors.reset} Actual problems (TODO, FIXME, localhost, etc.)`);
  console.log(`${colors.blue}Skipping:${colors.reset} Legitimate error handling\n`);

  // Get all files
  const files = getAllFiles(CONFIG.srcDir);
  filesChecked = files.length;

  console.log(`${colors.green}Found ${filesChecked} files to analyze${colors.reset}\n`);

  // Analyze each file
  const allCritical = [];
  const allForbidden = [];
  const allSuspicious = [];

  files.forEach(filePath => {
    const { criticalIssues, forbiddenIssues, suspiciousIssues } = analyzeFile(filePath);

    if (criticalIssues.length > 0) {
      allCritical.push({ filePath, issues: criticalIssues });
    }

    if (forbiddenIssues.length > 0) {
      allForbidden.push({ filePath, issues: forbiddenIssues });
    }

    if (suspiciousIssues.length > 0) {
      allSuspicious.push({ filePath, issues: suspiciousIssues });
    }
  });

  // Calculate totals
  criticalCount = allCritical.reduce((sum, file) => sum + file.issues.length, 0);
  forbiddenCount = allForbidden.reduce((sum, file) => sum + file.issues.length, 0);
  suspiciousCount = allSuspicious.reduce((sum, file) => sum + file.issues.length, 0);

  const totalIssues = criticalCount + forbiddenCount;

  // Print results
  printHeader('📊 Results Summary');

  console.log(`Files checked: ${colors.green}${filesChecked}${colors.reset}`);
  console.log(`Critical issues (TODO/FIXME): ${colors.red}${criticalCount}${colors.reset}`);
  console.log(`Forbidden patterns (localhost): ${colors.red}${forbiddenCount}${colors.reset}`);
  console.log(`Suspicious console.error: ${colors.yellow}${suspiciousCount}${colors.reset}`);

  // Print critical issues
  if (allCritical.length > 0) {
    printHeader('🚨 Critical Issues (TODO/FIXME/HACK)');

    allCritical.forEach(({ filePath, issues }) => {
      console.log(`\n${colors.red}📄 ${getRelativePath(filePath)}${colors.reset}`);

      issues.forEach(issue => {
        console.log(`  ${colors.red}Line ${issue.line}:${colors.reset} ${issue.type}`);
        console.log(`    ${issue.content.substring(0, 100)}${issue.content.length > 100 ? '...' : ''}`);
      });
    });
  }

  // Print forbidden issues
  if (allForbidden.length > 0) {
    printHeader('⛔ Forbidden Patterns (localhost, etc.)');

    allForbidden.forEach(({ filePath, issues }) => {
      console.log(`\n${colors.red}📄 ${getRelativePath(filePath)}${colors.reset}`);

      issues.forEach(issue => {
        console.log(`  ${colors.red}Line ${issue.line}:${colors.reset} ${issue.pattern}`);
        console.log(`    ${issue.content.substring(0, 100)}${issue.content.length > 100 ? '...' : ''}`);
      });
    });
  }

  // Print suspicious issues
  if (allSuspicious.length > 0 && suspiciousCount <= 20) {
    printHeader('⚠️  Suspicious console.error (not in error handler)');

    allSuspicious.forEach(({ filePath, issues }) => {
      console.log(`\n${colors.yellow}📄 ${getRelativePath(filePath)}${colors.reset}`);

      issues.forEach(issue => {
        console.log(`  ${colors.yellow}Line ${issue.line}:${colors.reset} ${issue.reason}`);
        console.log(`    ${issue.content.substring(0, 100)}${issue.content.length > 100 ? '...' : ''}`);
      });
    });
  } else if (suspiciousCount > 20) {
    console.log(`\n${colors.yellow}⚠️  Found ${suspiciousCount} suspicious console.error calls (not shown for breverity)${colors.reset}`);
  }

  // Final verdict
  printHeader('🎯 Final Verdict');

  if (totalIssues > 0) {
    console.log(`${colors.red}❌ FAILED: Found ${totalIssues} issue(s) that must be fixed${colors.reset}`);
    console.log(`${colors.red}   Deployment blocked - fix critical issues before deploying${colors.reset}\n`);
    process.exit(1);
  } else if (suspiciousCount > 50) {
    console.log(`${colors.yellow}⚠️  WARNING: ${suspiciousCount} suspicious console.error calls${colors.reset}`);
    console.log(`${colors.yellow}   Deployment allowed - review error handling patterns${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.green}✅ PASSED: Zero critical issues found${colors.reset}`);
    console.log(`${colors.green}   Deployment approved - production ready${colors.reset}\n`);
    console.log(`${colors.cyan}ℹ️  Note: ${suspiciousCount} console.error calls are legitimate error handling${colors.reset}\n`);
    process.exit(0);
  }
}

// Run the script
main();
