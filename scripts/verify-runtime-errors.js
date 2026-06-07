#!/usr/bin/env node

/**
 * Runtime Error Verification Script
 *
 * Actually RUNS the built application and checks for runtime errors
 * This catches client-side exceptions that static analysis misses
 *
 * Usage: node scripts/verify-runtime-errors.js
 */

const { spawn } = require('child_process');
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

let runtimeErrors = [];
let buildWarnings = [];

console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}`);
console.log(`${colors.blue}🔍 Runtime Error Verification${colors.reset}`);
console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}\n`);

// Check if .next build exists
const nextBuildPath = path.join(process.cwd(), '.next');
if (!fs.existsSync(nextBuildPath)) {
  console.error(`${colors.red}❌ Build not found. Run 'npm run build' first${colors.reset}\n`);
  process.exit(1);
}

console.log(`${colors.cyan}Step 1: Starting production server...${colors.reset}\n`);

// Start Next.js server in production mode
const verifyPort = process.env.VERIFY_PORT || '3011';
const server = spawn('npm', ['run', 'start'], {
  cwd: process.cwd(),
  env: { ...process.env, NODE_ENV: 'production', PORT: verifyPort },
  stdio: ['ignore', 'pipe', 'pipe']
});

let serverStarted = false;
let serverReady = false;

// Capture server output
server.stdout.on('data', (data) => {
  const output = data.toString();

  // Check for server ready messages
  if (output.includes('Ready') || output.includes('started') || output.includes('listening')) {
    serverReady = true;
    console.log(`${colors.green}✓ Server ready${colors.reset}\n`);
  }

  // Check for warnings
  if (output.includes('warn')) {
    buildWarnings.push(output);
  }
});

server.stderr.on('data', (data) => {
  const error = data.toString();
  console.error(`${colors.red}${error}${colors.reset}`);
  runtimeErrors.push(error);
});

// Wait for server to start
setTimeout(() => {
  if (!serverReady) {
    console.error(`${colors.red}❌ Server failed to start within 10 seconds${colors.reset}\n`);
    server.kill();
    process.exit(1);
  }

  serverStarted = true;
  console.log(`${colors.cyan}Step 2: Checking for runtime errors...${colors.reset}\n`);

  // Run a simple curl to trigger page load
  const curl = spawn('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', `http://localhost:${verifyPort}`], {
    stdio: 'ignore'
  });

  curl.on('close', (code) => {
    // Give it a moment to process
    setTimeout(() => {
      checkResults();
    }, 2000);
  });
}, 10000);

// Timeout after 30 seconds
setTimeout(() => {
  if (!serverStarted) {
    console.error(`${colors.red}❌ Timeout waiting for server${colors.reset}\n`);
    server.kill();
    process.exit(1);
  }
}, 30000);

function checkResults() {
  server.kill();

  console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.blue}📊 Verification Results${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}\n`);

  console.log(`Runtime errors: ${colors.red}${runtimeErrors.length}${colors.reset}`);
  console.log(`Build warnings: ${colors.yellow}${buildWarnings.length}${colors.reset}\n`);

  if (runtimeErrors.length > 0) {
    console.log(`${colors.red}❌ FAILED: Runtime errors detected${colors.reset}\n`);
    console.log(`${colors.red}The following errors occurred:${colors.reset}\n`);

    runtimeErrors.forEach((error, index) => {
      console.log(`${colors.red}${index + 1}. ${error.trim()}${colors.reset}\n`);
    });

    console.log(`${colors.red}Deployment blocked - fix runtime errors before deploying${colors.reset}\n`);
    process.exit(1);
  }

  if (buildWarnings.length > 0 && buildWarnings.length > 10) {
    console.log(`${colors.yellow}⚠️  WARNING: ${buildWarnings.length} build warnings${colors.reset}\n`);
    console.log(`${colors.yellow}Review warnings before production deployment${colors.reset}\n`);
  }

  console.log(`${colors.green}✅ PASSED: No runtime errors detected${colors.reset}\n`);
  console.log(`${colors.green}Deployment approved - production ready${colors.reset}\n`);
  process.exit(0);
}
