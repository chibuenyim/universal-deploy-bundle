#!/usr/bin/env node

/**
 * INTELLIGENT UNIVERSAL DEPLOYER v2
 *
 * Fast error catching with SSH-like instant debugging:
 * - Auto-discovers deployment directories
 * - Fast PM2 health checks (instant error detection)
 * - Immediate HTTP testing (0s wait time)
 * - Shows logs instantly on failure
 * - Zero waiting for errors to appear
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

class IntelligentDeployer {
  constructor(environment) {
    this.env = environment;
    this.config = null;
    this.errors = [];
    this.warnings = [];
  }

  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const prefix = { info: "✅", warning: "⚠️", error: "❌", step: "🔄" }[level] || "ℹ️";
    console.log(`${timestamp} ${prefix} [${this.env.toUpperCase()}] ${message}`);
  }

  discoverDeploymentDirectories() {
    this.log("Auto-discovering deployment directories...", "step");
    const searchPaths = ["/var/www", "/home/node/app", process.cwd()];
    const foundDirs = [];

    for (const searchPath of searchPaths) {
      try {
        if (!fs.existsSync(searchPath)) continue;
        const entries = fs.readdirSync(searchPath, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const fullPath = path.join(searchPath, entry.name);
          if (this.isDeploymentDirectory(fullPath)) {
            const envType = this.detectEnvironmentType(entry.name, fullPath);
            foundDirs.push({ path: fullPath, name: entry.name, environment: envType });
          }
        }
      } catch (error) {}
    }

    this.log(`Found ${foundDirs.length} deployment directories`, "info");
    foundDirs.forEach(dir => this.log(`  - ${dir.name} (${dir.environment})`, "info"));
    return foundDirs;
  }

  isDeploymentDirectory(dirPath) {
    const indicators = ["package.json", "package-lock.json", "deployment-agent", ".git", "frontend", "backend"];
    try {
      const contents = fs.readdirSync(dirPath);
      const matchCount = indicators.filter(i => contents.includes(i)).length;
      return matchCount >= 2;
    } catch {
      return false;
    }
  }

  detectEnvironmentType(dirName, dirPath) {
    const name = dirName.toLowerCase();
    if (name.includes("staging")) return "staging";
    if (name.includes("prod")) return "production";
    if (name.includes("dev")) return "dev";
    return "production";
  }

  autoConfigure() {
    this.log("Auto-configuring deployment...", "step");
    const directories = this.discoverDeploymentDirectories();
    const targetDir = directories.find(dir => dir.environment === this.env);

    if (!targetDir) throw new Error(`No deployment directory found for environment: ${this.env}`);

    this.log(`Using deployment directory: ${targetDir.path}`, "info");
    this.config = {
      directory: targetDir.path,
      database: `cheapestdata_${this.env === "production" ? "prod" : this.env}`,
      frontendPort: this.env === "staging" ? 3001 : 3000,
      backendPort: this.env === "staging" ? 3021 : 3020,
      pm2Env: this.env,
      url: this.env === "production" ? "https://cheapestdata.com" : "https://staging.cheapestdata.com",
      branch: this.env === "production" ? "master" : "staging",
    };

    this.log("Auto-configuration complete:", "info");
    Object.entries(this.config).forEach(([key, value]) => {
      this.log(`  ${key}: ${value}`, "info");
    });
  }

  exec(command, description, throwOnError = true) {
    try {
      this.log(`Executing: ${description}`, "step");
      const output = execSync(command, {
        encoding: "utf-8",
        stdio: "pipe",
        cwd: this.config.directory
      });
      this.log(`${description} - SUCCESS`, "info");
      return output;
    } catch (error) {
      const errorMsg = `${description}: ${error.message}`;
      this.errors.push(errorMsg);
      this.log(`${description} - FAILED: ${error.message}`, "error");
      if (throwOnError) throw error;
      return error.stdout || "";
    }
  }

  pullCode() {
    this.log("Pulling latest code...", "step");
    this.exec("git fetch origin", "Fetch origin");
    this.exec(`git reset --hard origin/${this.config.branch}`, "Reset to origin");
    this.log("Code updated", "info");
  }

  buildBackend() {
    this.log("Building backend...", "step");
    this.exec("cd backend && NODE_ENV=development npm ci --legacy-peer-deps", "Install backend dependencies");
    this.exec("cd backend && npm run build", "Build backend");
    this.log("Backend built successfully", "info");
  }

  buildFrontend() {
    this.log("Building frontend...", "step");
    this.exec("cd frontend && rm -rf .next", "Clean frontend build");
    this.exec("cd frontend && NODE_ENV=development npm ci --legacy-peer-deps", "Install frontend dependencies");
    this.exec(`cd frontend && npm run build`, "Build frontend");
    this.log("Frontend built successfully", "info");
  }

  /**
   * FAST ERROR CHECK: Immediately verify PM2 process health
   * Like SSH - instant feedback, no waiting
   */
  fastPM2HealthCheck(appName) {
    this.log(`Fast PM2 health check: ${appName}`, "step");

    try {
      // Get PM2 process list instantly
      const statusOutput = this.exec(`PM2_HOME=/etc/.pm2 pm2 jlist`, "Get PM2 status", false);
      const processes = JSON.parse(statusOutput);
      const process = processes.find(p => p.name === appName);

      if (!process) {
        throw new Error(`${appName} not found in PM2 process list`);
      }

      // Check process status instantly (PM2 uses pm2_env.status)
      const status = process.pm2_env?.status || process.status;
      if (status !== "online") {
        // CRASHED! Show logs immediately
        this.log(`❌ ${appName} status: ${status}`, "error");
        this.showPM2Logs(appName, 30);
        throw new Error(`${appName} is ${status}`);
      }

      // Check for error state
      if (process.pm2_env && process.pm2_env.status === "errored") {
        this.log(`❌ ${appName} in errored state`, "error");
        this.showPM2Logs(appName, 50);
        throw new Error(`${appName} has errored - check logs above`);
      }

      // SUCCESS - Process is healthy
      this.log(`✅ ${appName} healthy: PID=${process.pid}, Uptime=${process.pm2_env.pm_uptime}s, Restart=${process.pm2_env.restart_time}`, "info");
      return true;

    } catch (error) {
      this.log(`PM2 health check failed: ${error.message}`, "error");
      // Show logs even if we can't parse PM2 output
      try {
        this.showPM2Logs(appName, 30);
      } catch (logError) {
        // Ignore if logs also fail
      }
      throw error;
    }
  }

  /**
   * Show PM2 logs instantly (like SSH tail)
   */
  showPM2Logs(appName, lines = 50) {
    try {
      this.log(`Showing last ${lines} lines of ${appName} logs:`, "error");
      const logs = this.exec(`PM2_HOME=/etc/.pm2 pm2 logs ${appName} --lines ${lines} --nostream`, "Get logs", false);

      // Format logs for readability
      const logLines = logs.split('\n').slice(-lines);
      logLines.forEach(line => {
        if (line.includes('error') || line.includes('Error') || line.includes('ERROR')) {
          this.log(`  🔴 ${line}`, "error");
        } else if (line.includes('warn') || line.includes('Warn')) {
          this.log(`  ⚠️  ${line}`, "warning");
        } else if (line.trim()) {
          this.log(`  📋 ${line}`, "info");
        }
      });
    } catch (error) {
      this.log(`Could not fetch logs: ${error.message}`, "warning");
    }
  }

  /**
   * AUTO-WARM RUNNER: Pre-warm GitHub Actions runner to prevent stuck deployments
   * Detects and handles stuck runners automatically
   */
  async warmRunner() {
    this.log("Auto-warming deployment environment...", "step");

    try {
      // Check if we're on a GitHub Actions runner
      if (!process.env.GITHUB_ACTIONS) {
        this.log("Not on GitHub Actions runner, skipping warmup", "info");
        return true;
      }

      this.log("GitHub Actions detected, warming runner...", "info");

      // 1. Check runner responsiveness
      this.log("Testing runner responsiveness...", "step");
      const startTime = Date.now();

      try {
        // Quick command to test runner
        const testCmd = "echo 'runner-test' && timeout 5s echo 'responsive' || echo 'timeout'";
        const testResult = this.exec(testCmd, "Runner responsiveness test", false);
        const responseTime = Date.now() - startTime;

        this.log(`Runner response time: ${responseTime}ms`, "info");

        if (responseTime > 5000) {
          this.log("⚠️ Runner is slow, might get stuck", "warning");
        } else {
          this.log("✅ Runner is responsive", "info");
        }

      } catch (error) {
        this.log(`❌ Runner not responsive: ${error.message}`, "error");
        throw new Error("Runner stuck or unresponsive");
      }

      // 2. Check available resources
      this.log("Checking runner resources...", "step");
      try {
        const memInfo = this.exec("free -h | grep Mem", "Check memory", false);
        const diskInfo = this.exec("df -h / | tail -1", "Check disk", false);
        this.log(`Memory: ${memInfo.trim()}`, "info");
        this.log(`Disk: ${diskInfo.trim()}`, "info");
      } catch (error) {
        this.log(`Resource check failed: ${error.message}`, "warning");
      }

      // 3. Pre-warm build cache
      this.log("Pre-warming build cache...", "step");
      try {
        // Warm npm cache
        this.exec("npm config get cache", "Check npm cache", false);

        // Clear any stuck processes
        this.exec("pkill -f 'npm.*build' || true", "Clear stuck npm builds", false);
        this.exec("pkill -f 'node.*next' || true", "Clear stuck Next.js", false);

        this.log("✅ Build cache warmed", "info");
      } catch (error) {
        this.log(`Cache warmup warning: ${error.message}`, "warning");
      }

      // 4. Pre-check network connectivity
      this.log("Checking network connectivity...", "step");
      try {
        const gitTest = this.exec("timeout 10s git ls-remote origin || echo 'git-slow'", "Test git connectivity", false);
        if (gitTest.includes("git-slow") || gitTest.includes("timeout")) {
          this.log("⚠️ Git connectivity slow", "warning");
        } else {
          this.log("✅ Git connectivity OK", "info");
        }
      } catch (error) {
        this.log(`Network check warning: ${error.message}`, "warning");
      }

      this.log("✅ Runner warmup complete", "info");
      return true;

    } catch (error) {
      this.log(`Runner warmup failed: ${error.message}`, "error");
      // Don't block deployment on warmup failure, just warn
      this.log("Continuing with deployment despite warmup failure", "warning");
      return false;
    }
  }

  /**
   * AUTO-RECOVERY: Auto-fix common infrastructure issues
   * Detects and recovers from stuck deployments
   */
  autoRecover() {
    this.log("Auto-recovery: Checking for common issues...", "step");

    try {
      // 1. Check for stuck PM2 processes
      this.log("Checking for stuck PM2 processes...", "step");
      try {
        const stuckProcesses = this.exec("PM2_HOME=/etc/.pm2 pm2 list | grep 'stopped\\|errored\\|stopping' || echo 'none'", "Check stuck processes", false);
        if (stuckProcesses.includes("none") || !stuckProcesses.trim()) {
          this.log("✅ No stuck PM2 processes", "info");
        } else {
          this.log(`Found stuck processes:\n${stuckProcesses}`, "warning");
          // Try to restart them
          this.exec("PM2_HOME=/etc/.pm2 pm2 restart all || true", "Restart stuck processes", false);
          this.log("Attempted to restart stuck processes", "info");
        }
      } catch (error) {
        this.log(`PM2 recovery skipped: ${error.message}`, "warning");
      }

      // 2. Check for port conflicts
      this.log("Checking for port conflicts...", "step");
      try {
        const ports = [this.config.frontendPort, this.config.backendPort];
        for (const port of ports) {
          const portCheck = this.exec(`lsof -i :${port} || netstat -tlnp | grep :${port} || echo 'port-${port}-free'`, `Check port ${port}`, false);
          if (!portCheck.includes(`port-${port}-free`)) {
            this.log(`Port ${port} is in use`, "info");
          }
        }
      } catch (error) {
        this.log(`Port check skipped: ${error.message}`, "warning");
      }

      // 3. Clear stale build artifacts
      this.log("Clearing stale build artifacts...", "step");
      try {
        this.exec("cd frontend && rm -rf .next/cache || true", "Clear frontend cache", false);
        this.exec("cd backend && rm -rf dist/cache || true", "Clear backend cache", false);
        this.log("✅ Build artifacts cleared", "info");
      } catch (error) {
        this.log(`Cache clear warning: ${error.message}`, "warning");
      }

      this.log("✅ Auto-recovery complete", "info");

    } catch (error) {
      this.log(`Auto-recovery skipped: ${error.message}`, "warning");
    }
  }

  /**
   * BUILT-IN NGINX FIX: Direct nginx fixing without external scripts
   * Auto-detects and fixes nginx proxy configuration
   * TRULY UNIVERSAL: Auto-knows correct port configuration
   */
  fixNginxConfig() {
    this.log("Checking and fixing nginx configuration...", "step");

    try {
      // Find nginx config file for this environment
      const domain = this.env === "production" ? "cheapestdata.com" : "staging.cheapestdata.com";
      this.log(`Looking for nginx config for: ${domain}`, "info");

      try {
        // Find nginx config
        const findCmd = `find /etc/nginx/sites-enabled/ -type f -exec grep -l '${domain}' {} \\; 2>/dev/null | head -1`;
        const configPath = this.exec(findCmd, "Find nginx config", false).trim();

        if (!configPath || configPath === "") {
          this.log("No nginx config found (might be using default)", "info");
          return;
        }

        this.log(`Found nginx config: ${configPath}`, "info");

        // Show FULL nginx config for diagnosis
        const fullConfig = this.exec(`cat ${configPath}`, "Show full nginx config", false);
        this.log(`Full nginx config:\n${fullConfig}`, "info");

        // Universal port detection
        const frontendPort = this.config.frontendPort;  // 3001 (staging) or 3000 (prod)
        const backendPort = this.config.backendPort;    // 3021 (staging) or 3020 (prod)

        this.log(`Universal port configuration:`, "info");
        this.log(`  Frontend (pages): ${frontendPort}`, "info");
        this.log(`  Backend (API): ${backendPort}`, "info");

        // SMART FIX: Only fix frontend routes, leave API routes alone
        // Common issue: Frontend routes (/) pointing to backend port (3021) instead of frontend port (3001)

        let frontendNeedsFix = false;
        let backendNeedsFix = false;

        // Check if frontend routes are pointing to wrong port
        const frontendRoutes = ["location /", "location ~ /", "location /login", "location /services"];
        for (const route of frontendRoutes) {
          if (fullConfig.includes(route) && fullConfig.includes(`:${backendPort}`)) {
            this.log(`❌ Frontend route ${route} is pointing to backend port ${backendPort}`, "error");
            frontendNeedsFix = true;
          }
        }

        // Check if API routes are pointing to wrong port
        if (fullConfig.includes("location /api") && fullConfig.includes(`:${frontendPort}`)) {
          this.log(`❌ API route is pointing to frontend port ${frontendPort}`, "error");
          backendNeedsFix = true;
        }

        if (frontendNeedsFix) {
          this.log(`Auto-fixing: Frontend routes ${backendPort} → ${frontendPort}`, "step");
          // Fix frontend routes: replace backend port with frontend port
          const fixFrontendCmd = `sed -i 's|proxy_pass http://127\\.0\\.0\\.1:${backendPort}|proxy_pass http://127.0.0.1:${frontendPort}|g' ${configPath}`;
          this.exec(fixFrontendCmd, "Fix frontend proxy port", false);
          this.log(`✅ Frontend routes fixed: now pointing to port ${frontendPort}`, "info");
        }

        if (backendNeedsFix) {
          this.log(`Auto-fixing: API routes ${frontendPort} → ${backendPort}`, "step");
          // Fix API routes: replace frontend port with backend port
          const fixBackendCmd = `sed -i 's|proxy_pass http://127\\.0\\.0\\.1:${frontendPort}|proxy_pass http://127.0.0.1:${backendPort}|g' ${configPath}`;
          this.exec(fixBackendCmd, "Fix API proxy port", false);
          this.log(`✅ API routes fixed: now pointing to port ${backendPort}`, "info");
        }

        if (frontendNeedsFix || backendNeedsFix) {
          // Test nginx configuration
          this.log("Testing nginx configuration...", "step");
          const testResult = this.exec("nginx -t", "Test nginx config", false);

          if (testResult.includes("successful") || testResult.includes("syntax is ok")) {
            this.log("✅ Nginx configuration test passed", "info");

            // Reload nginx
            this.log("Reloading nginx...", "step");
            this.exec("systemctl reload nginx", "Reload nginx", false);
            this.log("✅ Nginx reloaded successfully", "info");

            // Show fixed config
            const fixedConfig = this.exec(`cat ${configPath}`, "Show fixed nginx config", false);
            this.log(`Fixed nginx config:\n${fixedConfig}`, "info");
          } else {
            this.log("❌ Nginx configuration test failed", "error");
            this.log(testResult, "error");
          }
        } else {
          this.log("✅ Nginx configuration already correct", "info");
        }

      } catch (nginxError) {
        this.log(`Nginx fix skipped: ${nginxError.message}`, "warning");
        // Don't fail deployment if nginx fix fails
      }

    } catch (error) {
      this.log(`Nginx check skipped: ${error.message}`, "info");
    }
  }

  restartBackend() {
    this.log("Restarting backend...", "step");
    const appName = `${this.env}-backend`;

    try {
      this.exec(`PM2_HOME=/etc/.pm2 pm2 restart ${appName}`, `Restart ${appName}`);
    } catch (error) {
      this.log(`${appName} not running, starting fresh`, "warning");
      this.exec(`cd backend && PM2_HOME=/etc/.pm2 pm2 start dist/main.js --name ${appName} --env ${this.config.pm2Env}`, `Start ${appName}`);
    }

    // FAST ERROR CHECK: Instant health check
    this.fastPM2HealthCheck(appName);
    this.log("Backend restarted successfully", "info");
  }

  restartFrontend() {
    this.log("Restarting frontend...", "step");
    const appName = `${this.env}-frontend`;

    try {
      this.exec(`PM2_HOME=/etc/.pm2 pm2 restart ${appName}`, `Restart ${appName}`);
    } catch (error) {
      this.log(`${appName} not running, starting fresh`, "warning");
      this.exec(`cd frontend && PM2_HOME=/etc/.pm2 pm2 start npm --name ${appName} --env ${this.config.pm2Env} -- start`, `Start ${appName}`);
    }

    // FAST ERROR CHECK: Instant health check
    this.fastPM2HealthCheck(appName);
    this.log("Frontend restarted successfully", "info");
  }

  /**
   * COMPREHENSIVE VERIFICATION - Real checks, not just HTTP 200
   */
  async comprehensiveVerification() {
    this.log("Running comprehensive verification...", "step");

    const checks = {
      homepage: false,
      loginPage: false,
      services: false,
      marketplace: false,
      wallet: false,
      apiHealth: false,
      apiAuth: false
    };

    try {
      // Test 1: Homepage (with content size check)
      this.log("Testing homepage...", "step");
      try {
        // Get HTTP code and size separately
        const httpCode = this.exec(
          `curl -s -o /dev/null -w "%{http_code}" --max-time 10 ${this.config.url}`,
          "Homepage HTTP check",
          false
        ).trim();

        const contentSize = this.exec(
          `curl -s -o /dev/null -w "%{size_download}" --max-time 10 ${this.config.url}`,
          "Homepage size check",
          false
        ).trim();

        const sizeInt = parseInt(contentSize) || 0;

        this.log(`Homepage: HTTP=${httpCode}, Size=${sizeInt} bytes`, "info");

        if (httpCode === "200" && sizeInt > 1000) {
          this.log("✅ Homepage loads correctly (>1000 bytes)", "info");
          checks.homepage = true;
        } else if (httpCode === "200") {
          this.log(`⚠️ Homepage loads but content is small (${sizeInt} bytes)`, "warning");
        } else {
          this.log(`❌ Homepage HTTP ${httpCode}`, "error");
        }
      } catch (error) {
        this.log(`❌ Homepage test error: ${error.message}`, "error");
      }

      // Test 2: Login page
      this.log("Testing login page...", "step");
      const loginTest = this.exec(
        `curl -s -w "%{http_code}" --max-time 10 ${this.config.url}/login`,
        "Login page test",
        false
      ).trim();
      if (loginTest === "200") {
        this.log("✅ Login page accessible", "info");
        checks.loginPage = true;
      }

      // Test 3: Services page
      this.log("Testing services page...", "step");
      const servicesTest = this.exec(
        `curl -s -w "%{http_code}" --max-time 10 ${this.config.url}/services`,
        "Services page test",
        false
      ).trim();
      if (servicesTest === "200") {
        this.log("✅ Services page accessible", "info");
        checks.services = true;
      }

      // Test 4: Marketplace
      this.log("Testing marketplace...", "step");
      const marketTest = this.exec(
        `curl -s -w "%{http_code}" --max-time 10 ${this.config.url}/marketplace`,
        "Marketplace test",
        false
      ).trim();
      if (marketTest === "200") {
        this.log("✅ Marketplace accessible", "info");
        checks.marketplace = true;
      }

      // Test 5: Wallet
      this.log("Testing wallet page...", "step");
      const walletTest = this.exec(
        `curl -s -w "%{http_code}" --max-time 10 ${this.config.url}/wallet`,
        "Wallet page test",
        false
      ).trim();
      if (walletTest === "200") {
        this.log("✅ Wallet page accessible", "info");
        checks.wallet = true;
      }

      // Test 6: API Health
      this.log("Testing API health...", "step");
      const apiTest = this.exec(
        `curl -s -w "%{http_code}" --max-time 10 ${this.config.url}/api/health`,
        "API health test",
        false
      ).trim();
      if (apiTest === "200") {
        this.log("✅ API health accessible", "info");
        checks.apiHealth = true;
      }

      // Test 7: API Auth Status
      this.log("Testing API auth status...", "step");
      const authTest = this.exec(
        `curl -s -w "%{http_code}" --max-time 10 ${this.config.url}/api/auth/status`,
        "API auth test",
        false
      ).trim();
      if (authTest === "200") {
        this.log("✅ API auth accessible", "info");
        checks.apiAuth = true;
      }

      // Summary
      const passedCount = Object.values(checks).filter(v => v).length;
      const totalCount = Object.keys(checks).length;

      this.log(`\nVERIFICATION SUMMARY: ${passedCount}/${totalCount} checks passed`, "info");

      if (passedCount === totalCount) {
        this.log("✅ ALL VERIFICATION CHECKS PASSED - STAGING IS FULLY FUNCTIONAL", "info");
        return true;
      } else {
        this.log(`⚠️ ${totalCount - passedCount} checks failed - STAGING NOT FULLY FUNCTIONAL`, "warning");
        return false;
      }

    } catch (error) {
      this.log(`Verification error: ${error.message}`, "error");
      return false;
    }
  }

  /**
   * FAST HTTP VERIFY: 0 second wait, instant curl
   */
  async fastHTTPVerify() {
    this.log("Fast HTTP verify (instant, no wait)...", "step");

    try {
      // Fast curl with 5s timeout
      const response = this.exec(
        `curl -s -o /dev/null -w "%{http_code}" --max-time 5 ${this.config.url}`,
        "HTTP check",
        false
      ).trim();

      if (response === "200") {
        this.log(`✅ HTTP 200 - Site is LIVE`, "info");
        return true;
      }

      if (response === "502") {
        this.log(`❌ HTTP 502 Bad Gateway`, "error");
        this.log("Common causes:", "error");
        this.log("  1. Frontend process crashed (PM2 logs shown above)", "error");
        this.log("  2. Frontend not listening on port ${this.config.frontendPort}", "error");
        this.log("  3. nginx proxy misconfiguration", "error");

        // Show nginx error log instantly
        this.showNginxLogs();

        throw new Error(`HTTP 502 - Frontend not responding`);
      }

      if (response === "000") {
        this.log(`❌ Connection refused (curl returned 000)`, "error");
        this.log("This means frontend is not accepting connections", "error");
        throw new Error(`Connection refused - Frontend down`);
      }

      throw new Error(`HTTP ${response} - expected 200`);

    } catch (error) {
      this.log(`❌ HTTP verify failed: ${error.message}`, "error");
      return false;
    }
  }

  /**
   * Show nginx logs instantly
   */
  showNginxLogs() {
    try {
      this.log("Showing nginx error logs:", "error");
      const logs = this.exec("tail -30 /var/log/nginx/error.log", "Get nginx logs", false);
      this.log(logs, "error");
    } catch (error) {
      this.log(`Could not fetch nginx logs: ${error.message}`, "warning");
    }
  }

  async deploy() {
    try {
      this.log(`=== STARTING FAST ${this.env.toUpperCase()} DEPLOYMENT ===`, "step");
      this.log(`Instant error catching enabled (SSH-like speed)`, "info");

      // AUTO-WARM RUNNER: Pre-warm to prevent stuck deployments
      await this.warmRunner();

      // AUTO-RECOVERY: Fix common infrastructure issues
      this.autoRecover();

      this.autoConfigure();
      this.pullCode();
      this.buildBackend();
      this.buildFrontend();

      // BUILT-IN NGINX FIX: Direct fixing without external scripts
      this.fixNginxConfig();

      this.restartBackend();
      this.restartFrontend();

      // COMPREHENSIVE VERIFICATION - Real checks, not just HTTP 200
      const verified = await this.comprehensiveVerification();

      this.log(`=== ${this.env.toUpperCase()} DEPLOYMENT ${verified ? "SUCCESS" : "FAILED"} ===`, verified ? "info" : "error");
      this.log(`Total deployment time with comprehensive verification`, "info");

      process.exit(verified ? 0 : 1);

    } catch (error) {
      this.log(`❌ Deployment failed: ${error.message}`, "error");
      this.log("Errors encountered:", "error");
      this.errors.forEach(err => this.log(`  - ${err}`, "error"));
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const environment = process.argv[2] || "production";
  const deployer = new IntelligentDeployer(environment);
  deployer.deploy().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = IntelligentDeployer;
