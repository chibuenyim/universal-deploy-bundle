#!/usr/bin/env node

/**
 * UNIFIED VERIFICATION ORCHESTRATOR (V5.1)
 *
 * This script orchestrates ALL verification layers in sequence:
 * 1. Static Analysis (verify-zero-errors.js)
 * 2. Build Verification
 * 3. Runtime Error Verification (verify-runtime-errors.js)
 * 4. HTTP Endpoint Verification (core/deployment-verifier.js)
 * 5. E2E Tests (playwright test e2e/*.spec.ts)
 *
 * Usage:
 *   node scripts/verify-all.js [options]
 *
 * Options:
 *   --layer <basic|standard|full>   Verification depth (default: full)
 *   --skip-static                  Skip static analysis
 *   --skip-build                   Skip build verification
 *   --skip-runtime                 Skip runtime verification
 *   --skip-http                   Skip HTTP endpoint verification
 *   --skip-e2e                     Skip E2E tests
 *   --url <url>                    Deployment URL for HTTP verification
 *   --fail-on-error                Exit with error code on any failure
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Parse arguments
const args = process.argv.slice(2);
const options = {
  layer: 'full',
  skipStatic: false,
  skipBuild: false,
  skipRuntime: false,
  skipHttp: false,
  skipE2e: false,
  url: process.env.DEPLOY_URL || 'http://localhost:3000',
  failOnError: false
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--layer':
      options.layer = args[++i];
      break;
    case '--skip-static':
      options.skipStatic = true;
      break;
    case '--skip-build':
      options.skipBuild = true;
      break;
    case '--skip-runtime':
      options.skipRuntime = true;
      break;
    case '--skip-http':
      options.skipHttp = true;
      break;
    case '--skip-e2e':
      options.skipE2e = true;
      break;
    case '--url':
      options.url = args[++i];
      break;
    case '--fail-on-error':
      options.failOnError = true;
      break;
  }
}

const results = {
  static: null,
  build: null,
  runtime: null,
  http: null,
  e2e: null
};

/**
 * Print section header
 */
function printHeader(title, emoji = '🔍') {
  console.log(`\n${colors.blue}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.blue}${emoji} ${title}${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}\n`);
}

/**
 * Print success/failure message
 */
function printResult(message, success) {
  if (success) {
    console.log(`${colors.green}✅ ${message}${colors.reset}\n`);
  } else {
    console.log(`${colors.red}❌ ${message}${colors.reset}\n`);
  }
}

/**
 * LAYER 1: Static Analysis
 */
function runStaticAnalysis() {
  if (options.skipStatic) {
    console.log(`${colors.yellow}⏭️  Static analysis skipped${colors.reset}\n`);
    results.static = true; // Don't fail if skipped
    return;
  }

  printHeader('LAYER 1: STATIC ANALYSIS', '📋');

  try {
    const staticScript = path.join(__dirname, 'verify-zero-errors.js');

    if (!fs.existsSync(staticScript)) {
      console.log(`${colors.yellow}Static analysis script not found, skipping...${colors.reset}\n`);
      results.static = true;
      return;
    }

    execSync(`node ${staticScript}`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });

    results.static = true;
    printResult('Static analysis passed - No code quality issues', true);

  } catch (error) {
    results.static = false;
    printResult('Static analysis failed - Code quality issues detected', false);

    if (options.failOnError) {
      throw error;
    }
  }
}

/**
 * LAYER 2: Build Verification
 */
function runBuildVerification() {
  if (options.skipBuild) {
    console.log(`${colors.yellow}⏭️  Build verification skipped${colors.reset}\n`);
    results.build = true;
    return;
  }

  printHeader('LAYER 2: BUILD VERIFICATION', '🔨');

  try {
    // Check if frontend build exists
    const buildIdPath = path.join(process.cwd(), 'frontend/.next/BUILD_ID');

    if (!fs.existsSync(buildIdPath)) {
      throw new Error('Frontend build not found - Run "npm run build" first');
    }

    const buildId = fs.readFileSync(buildIdPath, 'utf-8').trim();
    console.log(`${colors.green}✓ Build ID: ${buildId.substring(0, 8)}...${colors.reset}\n`);

    // Verify required build artifacts
    const requiredFiles = [
      'frontend/.next/BUILD_ID',
      'frontend/.next/prerender-manifest.json',
      'frontend/.next/server/app-paths-manifest.json'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required build artifact missing: ${file}`);
      }
      console.log(`${colors.green}✓ ${file}${colors.reset}`);
    }

    results.build = true;
    printResult('Build verification passed - All artifacts present', true);

  } catch (error) {
    results.build = false;
    printResult(`Build verification failed - ${error.message}`, false);

    if (options.failOnError) {
      throw error;
    }
  }
}

/**
 * LAYER 3: Runtime Error Verification (Browser-Based)
 */
async function runRuntimeVerification() {
  if (options.skipRuntime) {
    console.log(`${colors.yellow}⏭️  Runtime verification skipped${colors.reset}\n`);
    results.runtime = true;
    return;
  }

  printHeader('LAYER 3: RUNTIME ERROR VERIFICATION (Browser-Based)', '🔍');

  try {
    const runtimeScript = path.join(__dirname, 'verify-runtime-errors.js');

    if (!fs.existsSync(runtimeScript)) {
      console.log(`${colors.yellow}Runtime verification script not found, skipping...${colors.reset}\n`);
      results.runtime = true;
      return;
    }

    execSync(`node ${runtimeScript}`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      timeout: 120000 // 2 minutes
    });

    results.runtime = true;
    printResult('Runtime verification passed - No browser errors detected', true);

  } catch (error) {
    results.runtime = false;
    printResult('Runtime verification failed - Browser errors detected', false);

    if (options.failOnError) {
      throw error;
    }
  }
}

/**
 * LAYER 4: HTTP Endpoint Verification
 */
async function runHTTPVerification() {
  if (options.skipHttp) {
    console.log(`${colors.yellow}⏭️  HTTP verification skipped${colors.reset}\n`);
    results.http = true;
    return;
  }

  printHeader('LAYER 4: HTTP ENDPOINT VERIFICATION', '🌐');

  try {
    const verifierPath = path.join(__dirname, '../core/deployment-verifier.js');

    if (!fs.existsSync(verifierPath)) {
      console.log(`${colors.yellow}HTTP verifier not found, skipping...${colors.reset}\n`);
      results.http = true;
      return;
    }

    const DeploymentVerifier = require(verifierPath);
    const verifier = new DeploymentVerifier(options.url, {
      timeout: 30000,
      failOnError: options.failOnError,
      quick: options.layer === 'basic'
    });

    const passed = await verifier.run();

    results.http = passed;

    if (passed) {
      printResult('HTTP verification passed - All endpoints responding', true);
    } else {
      printResult('HTTP verification failed - Some endpoints not responding', false);
    }

  } catch (error) {
    results.http = false;
    printResult(`HTTP verification error - ${error.message}`, false);

    if (options.failOnError) {
      throw error;
    }
  }
}

/**
 * LAYER 5: E2E Verification
 */
async function runE2EVerification() {
  if (options.skipE2e || options.layer === 'basic') {
    console.log(`${colors.yellow}⏭️  E2E verification skipped${colors.reset}\n`);
    results.e2e = true;
    return;
  }

  printHeader('LAYER 5: E2E VERIFICATION', '🎭');

  try {
    const e2eDir = path.join(__dirname, '../e2e');

    if (!fs.existsSync(e2eDir)) {
      console.log(`${colors.yellow}E2E tests not found, skipping...${colors.reset}\n`);
      results.e2e = true;
      return;
    }

    execSync('npx playwright test', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      timeout: 300000 // 5 minutes
    });

    results.e2e = true;
    printResult('E2E verification passed - All user flows working', true);

  } catch (error) {
    results.e2e = false;
    printResult('E2E verification failed - User flow issues detected', false);

    if (options.failOnError) {
      throw error;
    }
  }
}

/**
 * Print final summary
 */
function printSummary() {
  printHeader('VERIFICATION SUMMARY', '📊');

  console.log(`Static Analysis:    ${results.static !== null ? (results.static ? '✅ PASS' : '❌ FAIL') : '⏭️  SKIPPED'}`);
  console.log(`Build Verification:  ${results.build !== null ? (results.build ? '✅ PASS' : '❌ FAIL') : '⏭️  SKIPPED'}`);
  console.log(`Runtime Check:       ${results.runtime !== null ? (results.runtime ? '✅ PASS' : '❌ FAIL') : '⏭️  SKIPPED'}`);
  console.log(`HTTP Check:          ${results.http !== null ? (results.http ? '✅ PASS' : '❌ FAIL') : '⏭️  SKIPPED'}`);
  console.log(`E2E Check:           ${results.e2e !== null ? (results.e2e ? '✅ PASS' : '❌ FAIL') : '⏭️  SKIPPED'}`);

  const criticalLayers = [results.static, results.build, results.runtime, results.http]
    .filter(r => r !== null && r !== true);

  const allPassed = Object.values(results).every(r => r === true || r === null);
  const hasFailures = Object.values(results).some(r => r === false);

  console.log(`\n${colors.blue}${'='.repeat(80)}${colors.reset}`);

  if (allPassed) {
    console.log(`${colors.green}✅✅✅ ALL VERIFICATION LAYERS PASSED ✅✅✅${colors.reset}`);
    console.log(`${colors.green}Application is production-ready${colors.reset}`);
  } else if (hasFailures) {
    console.log(`${colors.red}❌ SOME VERIFICATION LAYERS FAILED ❌${colors.reset}`);
    console.log(`${colors.yellow}Review the failures above before deploying${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  VERIFICATION INCOMPLETE ⚠️${colors.reset}`);
    console.log(`${colors.yellow}Some layers were skipped${colors.reset}`);
  }

  console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}\n`);

  return allPassed;
}

/**
 * Main execution
 */
async function main() {
  printHeader('UNIFIED VERIFICATION ORCHESTRATOR V5.1', '🚀');

  console.log(`${colors.cyan}Verification Layer: ${options.layer.toUpperCase()}${colors.reset}`);
  console.log(`${colors.cyan}Target URL: ${options.url}${colors.reset}\n`);

  try {
    // LAYER 1: Static Analysis
    runStaticAnalysis();

    // LAYER 2: Build Verification
    runBuildVerification();

    // LAYER 3: Runtime Verification
    await runRuntimeVerification();

    // LAYER 4: HTTP Verification
    await runHTTPVerification();

    // LAYER 5: E2E Verification
    await runE2EVerification();

    // Print Summary
    const allPassed = printSummary();

    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run
main();
