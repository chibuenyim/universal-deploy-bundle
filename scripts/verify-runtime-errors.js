#!/usr/bin/env node

/**
 * Runtime Error Verification Script (STRICT MODE)
 *
 * Actually RUNS the built application in a REAL browser and checks for runtime errors
 * This catches client-side exceptions, ChunkLoadError, hydration issues, etc.
 *
 * STRICT MODE: ALL errors must be fixed - no leniency, no tolerance
 *
 * Usage: node scripts/verify-runtime-errors.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let allErrors = [];
let allWarnings = [];
let chunkErrors = [];

console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}`);
console.log(`${colors.blue}🔍 Runtime Error Verification (Browser-Based)${colors.reset}`);
console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}\n`);

// Check if .next build exists
const nextBuildPath = path.join(process.cwd(), '.next');
if (!fs.existsSync(nextBuildPath)) {
  console.error(`${colors.red}❌ Build not found. Run 'npm run build' first${colors.reset}\n`);
  process.exit(1);
}

// Get port from environment variable or default
const verifyPort = process.env.VERIFY_PORT || '3011';
const baseURL = `http://localhost:${verifyPort}`;

async function startServer() {
  console.log(`${colors.cyan}Step 1: Starting production server on port ${verifyPort}...${colors.reset}\n`);

  const { spawn } = require('child_process');

  const nextCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const server = spawn(nextCmd, ['next', 'start', '-p', verifyPort], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  });

  let serverReady = false;
  let serverOutput = [];

  // Capture server output
  server.stdout.on('data', (data) => {
    const output = data.toString();
    serverOutput.push(output);

    if (output.includes('Ready') || output.includes('started') || output.includes('listening')) {
      serverReady = true;
      console.log(`${colors.green}✓ Server ready${colors.reset}\n`);
    }

    // Check for warnings
    if (output.includes('⚠ Warning') || output.includes('warn')) {
      allWarnings.push(output);
    }
  });

  server.stderr.on('data', (data) => {
    const error = data.toString();
    serverOutput.push(error);

    // Filter out warnings vs actual errors
    if (error.includes('⚠ Warning') || error.includes('warn')) {
      allWarnings.push(error);
      console.warn(`${colors.yellow}${error}${colors.reset}`);
    } else {
      allErrors.push(error);
      console.error(`${colors.red}${error}${colors.reset}`);
    }
  });

  // Wait for server to start
  await new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (serverReady) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 500);

    // Timeout after 15 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!serverReady) {
        console.error(`${colors.red}❌ Server failed to start within 15 seconds${colors.reset}\n`);
        console.error(`${colors.red}Server output:${colors.reset}`, serverOutput.join('\n'));
        server.kill();
        process.exit(1);
      }
      resolve();
    }, 15000);
  });

  return server;
}

async function verifyWithBrowser() {
  console.log(`${colors.cyan}Step 2: Launching browser for runtime verification...${colors.reset}\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent: 'Universal-Deploy-Verification/1.0'
  });

  const page = await context.newPage();

  // Track console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    const location = msg.location();

    if (type === 'error') {
      allErrors.push({
        type: 'console.error',
        text: text,
        location: location ? `${location.url}:${location.lineNumber}` : 'unknown'
      });
      console.error(`${colors.red}❌ Console Error: ${text}${colors.reset}`);
      if (location) {
        console.error(`   at ${location.url}:${location.lineNumber}`);
      }
    } else if (type === 'warning') {
      allWarnings.push({
        type: 'console.warn',
        text: text,
        location: location ? `${location.url}:${location.lineNumber}` : 'unknown'
      });
      console.warn(`${colors.yellow}⚠ Warning: ${text}${colors.reset}`);
    }
  });

  // Track page errors
  page.on('pageerror', error => {
    allErrors.push({
      type: 'pageerror',
      text: error.toString(),
      stack: error.stack
    });
    console.error(`${colors.red}❌ Page Error: ${error.message}${colors.reset}`);
    if (error.stack) {
      console.error(`${colors.red}   ${error.stack.split('\n')[0]}${colors.reset}`);
    }
  });

  // Track request failures
  page.on('requestfailed', request => {
    const failure = {
      type: 'requestfailed',
      url: request.url(),
      failure: request.failure(),
      resourceType: request.resourceType()
    };

    // Check for chunk loading errors
    if (request.url().includes('/_next/static/chunks/')) {
      chunkErrors.push(failure);
      console.error(`${colors.red}❌ Chunk Load Error: ${request.url()}${colors.reset}`);
      console.error(`   Status: ${request.failure()}`);
    } else if (request.resourceType() === 'script') {
      allErrors.push(failure);
      console.error(`${colors.red}❌ Script Load Error: ${request.url()}${colors.reset}`);
      console.error(`   Status: ${request.failure()}`);
    }
  });

  // Track response errors
  page.on('response', response => {
    const status = response.status();
    const url = response.url();

    // Check for 4xx/5xx on scripts
    if ((response.request().resourceType() === 'script' || url.includes('/_next/static/chunks/')) &&
        (status >= 400 || response.headers()['content-type']?.includes('text/html'))) {
      allErrors.push({
        type: 'response_error',
        url: url,
        status: status,
        contentType: response.headers()['content-type']
      });
      console.error(`${colors.red}❌ Bad Response: ${url}${colors.reset}`);
      console.error(`   Status: ${status}`);
      console.error(`   Content-Type: ${response.headers()['content-type']}`);
    }
  });

  try {
    console.log(`${colors.cyan}Step 3: Loading page and waiting for JavaScript...${colors.reset}\n`);

    // Navigate to the page
    await page.goto(baseURL, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait a bit more for any delayed errors
    await page.waitForTimeout(3000);

    // Try to trigger some interactions
    console.log(`${colors.cyan}Step 4: Testing basic interactions...${colors.reset}\n`);

    // Try clicking some elements
    try {
      // Click on navigation
      const navLinks = await page.$$('nav a, header a');
      if (navLinks.length > 0) {
        await navLinks[0].click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      // Navigation might not exist, that's ok
    }

    // Check for any unhandled rejections
    await page.evaluate(() => {
      window.unhandledRejections = [];
      window.addEventListener('unhandledrejection', (event) => {
        window.unhandledRejections.push(event.reason);
      });
    });

    await page.waitForTimeout(2000);

    // Check unhandled rejections
    const unhandledRejections = await page.evaluate(() => window.unhandledRejections || []);
    if (unhandledRejections.length > 0) {
      allErrors.push({
        type: 'unhandledRejection',
        count: unhandledRejections.length,
        errors: unhandledRejections
      });
      console.error(`${colors.red}❌ ${unhandledRejections.length} unhandled promise rejections${colors.reset}`);
    }

  } catch (error) {
    allErrors.push({
      type: 'navigation_error',
      text: error.message,
      stack: error.stack
    });
    console.error(`${colors.red}❌ Navigation Error: ${error.message}${colors.reset}`);
  } finally {
    await browser.close();
  }
}

async function checkResults(server) {
  console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.blue}📊 Verification Results (STRICT MODE)${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}\n`);

  // Kill server
  server.kill();

  console.log(`Console errors: ${colors.red}${allErrors.length}${colors.reset}`);
  console.log(`Warnings: ${colors.yellow}${allWarnings.length}${colors.reset}`);
  console.log(`Chunk load errors: ${colors.red}${chunkErrors.length}${colors.reset}\n`);

  const totalErrors = allErrors.length + chunkErrors.length;

  // STRICT MODE: ANY error is a failure
  if (totalErrors > 0) {
    console.log(`${colors.red}${'='.repeat(80)}${colors.reset}`);
    console.log(`${colors.red}❌ FAILED: ${totalErrors} error(s) detected${colors.reset}`);
    console.log(`${colors.red}${'='.repeat(80)}${colors.reset}\n`);
    console.log(`${colors.red}STRICT MODE: All errors must be fixed before deployment${colors.reset}\n`);

    if (allErrors.length > 0) {
      console.log(`${colors.red}Runtime Errors:${colors.reset}\n`);
      allErrors.forEach((error, index) => {
        console.log(`${colors.red}${index + 1}. ${error.type}${colors.reset}`);
        if (error.url) console.log(`   URL: ${error.url}`);
        if (error.text) console.log(`   Error: ${error.text}`);
        if (error.status) console.log(`   Status: ${error.status}`);
        if (error.failure) console.log(`   Failure: ${error.failure?.errorText || error.failure}`);
        if (error.location) console.log(`   Location: ${error.location}`);
        console.log('');
      });
    }

    if (chunkErrors.length > 0) {
      console.log(`${colors.red}Chunk Load Errors:${colors.reset}\n`);
      chunkErrors.forEach((error, index) => {
        console.log(`${colors.red}${index + 1}. Failed to load: ${error.url}${colors.reset}`);
        console.log(`   Failure: ${error.failure?.errorText || error.failure}`);
        console.log('');
      });
    }

    console.log(`${colors.red}🚫 DEPLOYMENT BLOCKED - Fix all errors above${colors.reset}\n`);
    process.exit(1);
  }

  // SUCCESS!
  console.log(`${colors.green}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.green}✅ PASSED: No runtime errors detected${colors.reset}`);
  console.log(`${colors.green}✅ STRICT MODE: Zero errors confirmed${colors.reset}`);
  console.log(`${colors.green}🚀 READY FOR DEPLOYMENT${colors.reset}`);
  console.log(`${colors.green}${'='.repeat(80)}${colors.reset}\n`);

  if (allWarnings.length > 0) {
    console.log(`${colors.yellow}ℹ️  Note: ${allWarnings.length} warnings detected (non-blocking)${colors.reset}\n`);
  }
}

async function run() {
  let server;

  try {
    server = await startServer();
    await verifyWithBrowser();
    await checkResults(server);
  } catch (error) {
    console.error(`${colors.red}❌ Verification failed: ${error.message}${colors.reset}`);
    console.error(error.stack);
    if (server) server.kill();
    process.exit(1);
  }
}

// Run verification
run();
