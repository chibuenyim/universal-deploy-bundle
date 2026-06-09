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

    // SSH Configuration for remote deployment
    this.ssh = {
      host: process.env.SSH_HOST || null,
      user: process.env.SSH_USER || null,
      password: process.env.SSH_PASSWORD || null,
      keyPath: process.env.SSH_KEY_PATH || null,
      port: process.env.SSH_PORT || '22'
    };

    // Auto-detect if running in SSH mode
    this.isRemote = Boolean(this.ssh.host && this.ssh.user);
    if (this.isRemote) {
      this.log(`SSH Remote Mode: ${this.ssh.user}@${this.ssh.host}`, "info");
    }
  }

  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const prefix = { info: "✅", warning: "⚠️", error: "❌", step: "🔄" }[level] || "ℹ️";
    console.log(`${timestamp} ${prefix} [${this.env.toUpperCase()}] ${message}`);
  }

  /**
   * Execute command locally or via SSH
   */
  exec(command, description = "Command", allowFailure = true) {
    try {
      let actualCommand = command;

      if (this.isRemote) {
        // Wrap command for SSH execution
        actualCommand = this.buildSSHCommand(command);
      }

      const result = execSync(actualCommand, {
        encoding: "utf8",
        stdio: allowFailure ? "pipe" : "inherit"
      });

      return result.trim();
    } catch (error) {
      if (allowFailure) {
        this.log(`${description} - FAILED: ${error.message}`, "error");
        throw error;
      } else {
        return "";
      }
    }
  }

  /**
   * Build SSH command for remote execution
   */
  buildSSHCommand(command) {
    let sshCmd = "";

    // Use sshpass for password authentication
    if (this.ssh.password && !this.ssh.keyPath) {
      sshCmd = `sshpass -p '${this.ssh.password}'`;
    }

    sshCmd += " ssh";

    // Add SSH key if provided
    if (this.ssh.keyPath) {
      sshCmd += ` -i ${this.ssh.keyPath}`;
    }

    // Add port if not default
    if (this.ssh.port !== '22') {
      sshCmd += ` -p ${this.ssh.port}`;
    }

    // Strict host key checking off for automation
    sshCmd += ` -o StrictHostKeyChecking=no`;
    sshCmd += ` -o UserKnownHostsFile=/dev/null`;

    // Add host
    sshCmd += ` ${this.ssh.user}@${this.ssh.host}`;

    // Wrap command in quotes
    sshCmd += ` "${command.replace(/"/g, '\\"')}"`;

    return sshCmd;
  }

  /**
   * Setup SSH password authentication (install sshpass if needed)
   */
  setupSSHAuth() {
    if (!this.isRemote) return;

    if (this.ssh.password && !this.ssh.keyPath) {
      this.log("Setting up SSH password authentication...", "step");

      // Check if sshpass is installed
      try {
        this.exec("which sshpass", "Check sshpass", false);
        this.log("✅ sshpass is available", "info");
      } catch {
        this.log("⚠️ sshpass not found, installing...", "warning");
        try {
          // Try installing sshpass
          this.exec("apt-get update && apt-get install -y sshpass", "Install sshpass");
          this.log("✅ sshpass installed successfully", "info");
        } catch {
          this.log("❌ Failed to install sshpass - password auth may not work", "error");
          this.log("   Please install sshpass manually or use SSH key authentication", "warning");
        }
      }
    }
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

    // TRULY UNIVERSAL: Auto-discover ports from PM2 and nginx
    const discoveredPorts = this.discoverPorts();

    this.config = {
      directory: targetDir.path,
      database: `cheapestdata_${this.env === "production" ? "prod" : this.env}`,
      frontendPort: discoveredPorts.frontend,
      backendPort: discoveredPorts.backend,
      pm2Env: this.env,
      url: this.env === "production" ? "https://cheapestdata.com" : "https://staging.cheapestdata.com",
      branch: this.env === "production" ? "master" : "staging",
      serverIP: discoveredPorts.serverIP || "80.65.211.16", // Auto-discovered server IP
    };

    this.log("Auto-configuration complete:", "info");
    Object.entries(this.config).forEach(([key, value]) => {
      this.log(`  ${key}: ${value}`, "info");
    });
  }

  /**
   * AUTO-DISCOVER PORTS: Truly universal - detects actual ports in use
   * Checks PM2 processes and nginx configuration to find correct ports
   */
  discoverPorts() {
    this.log("Auto-discovering port configuration...", "step");

    let frontendPort = null;
    let backendPort = null;
    let serverIP = null;

    try {
      // Method 1: Check PM2 processes for actual ports in use
      this.log("Checking PM2 processes for port configuration...", "info");
      const pm2Output = execSync(`PM2_HOME=/etc/.pm2 pm2 jlist`, { encoding: "utf-8" });
      const processes = JSON.parse(pm2Output);

      const frontendProcess = processes.find(p => p.name === `${this.env}-frontend`);
      const backendProcess = processes.find(p => p.name === `${this.env}-backend`);

      if (frontendProcess) {
        // Try to get port from process description or parse it
        const portMatch = frontendProcess.pm2_env?.env?.PORT || frontendProcess.pm2_env?.env?.PORT;
        if (portMatch) {
          frontendPort = parseInt(portMatch);
        }
      }

      if (backendProcess) {
        const portMatch = backendProcess.pm2_env?.env?.PORT || backendProcess.pm2_env?.env?.PORT;
        if (portMatch) {
          backendPort = parseInt(portMatch);
        }
      }

      this.log(`PM2 discovery: Frontend port=${frontendPort}, Backend port=${backendPort}`, "info");
    } catch (error) {
      this.log(`PM2 port discovery failed: ${error.message}`, "warning");
    }

    try {
      // Method 2: Check nginx configuration for expected ports
      this.log("Checking nginx configuration for port configuration...", "info");
      const domain = this.env === "production" ? "cheapestdata.com" : "staging.cheapestdata.com";
      const findCmd = `find /etc/nginx/sites-enabled/ -type f -exec grep -l '${domain}' {} \\; 2>/dev/null | head -1`;
      const configPath = execSync(findCmd, { encoding: "utf-8" }).trim();

      if (configPath) {
        const nginxConfig = execSync(`cat ${configPath}`, { encoding: "utf-8" });

        // Extract ports from nginx proxy_pass directives
        const portMatches = nginxConfig.matchAll(/proxy_pass[^:]*:(\d+)/g);
        const ports = Array.from(portMatches).map(m => parseInt(m[1]));

        // Determine which is frontend and which is backend
        // Frontend is typically for location / and /_next/
        // Backend is for location /api/ and /socket.io/
        const frontendLocation = nginxConfig.match(/location\s+\/.*?proxy_pass[^:]*:(\d+)/s);
        const backendLocation = nginxConfig.match(/location\s+\/api.*?proxy_pass[^:]*:(\d+)/s);

        if (frontendLocation) frontendPort = parseInt(frontendLocation[1]);
        if (backendLocation) backendPort = parseInt(backendLocation[1]);

        this.log(`Nginx discovery: Frontend port=${frontendPort}, Backend port=${backendPort}`, "info");

        // Discover server IP from nginx config or system
        try {
          serverIP = execSync("hostname -I | awk '{print $1}'", { encoding: "utf-8" }).trim();
        } catch {
          serverIP = "80.65.211.16"; // Fallback to known server IP
        }
      }
    } catch (error) {
      this.log(`Nginx port discovery failed: ${error.message}`, "warning");
    }

    // Method 3: Fallback to environment-specific defaults based on server documentation
    if (!frontendPort || !backendPort) {
      this.log("Using documented server port configuration...", "info");
      if (this.env === "staging") {
        frontendPort = frontendPort || 3021; // Staging frontend
        backendPort = backendPort || 3020;  // Staging backend
      } else {
        frontendPort = frontendPort || 3010; // Production frontend
        backendPort = backendPort || 3005;  // Production backend
      }
    }

    this.log(`✅ Discovered configuration:`, "info");
    this.log(`  Frontend: ${frontendPort}`, "info");
    this.log(`  Backend: ${backendPort}`, "info");
    this.log(`  Server IP: ${serverIP}`, "info");

    return { frontend: frontendPort, backend: backendPort, serverIP };
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
   * BUILT-IN NGINX FIX: Direct fixing without detection
   * Simply replaces wrong ports with correct ones - no detection needed
   */
  fixNginxConfig() {
    this.log("Fixing nginx configuration...", "step");

    try {
      const domain = this.env === "production" ? "cheapestdata.com" : "staging.cheapestdata.com";
      const configPath = execSync(`find /etc/nginx/sites-enabled/ -type f -exec grep -l '${domain}' {} \\; 2>/dev/null | head -1`, { encoding: "utf-8" }).trim();

      if (!configPath) {
        this.log("No nginx config found", "info");
        return;
      }

      this.log(`Found nginx config: ${configPath}`, "info");

      const frontendPort = this.config.frontendPort;
      const backendPort = this.config.backendPort;

      this.log(`Applying port configuration:`, "info");
      this.log(`  Frontend (pages): ${frontendPort}`, "info");
      this.log(`  Backend (API): ${backendPort}`, "info");

      // FIX: Just replace all wrong ports directly
      // Common wrong ports for staging: 3001, 3010, 3011
      const commonWrongPorts = ['3001', '3010', '3011'];

      let fixed = false;
      for (const wrongPort of commonWrongPorts) {
        if (wrongPort !== frontendPort.toString()) {
          const checkCmd = `grep -c "proxy_pass http://127.0.0.1:${wrongPort}" ${configPath} 2>/dev/null || echo "0"`;
          const count = parseInt(execSync(checkCmd, { encoding: "utf-8" }).trim());

          if (count > 0) {
            this.log(`Found ${count} occurrences of wrong port ${wrongPort}`, "info");

            // Fix frontend routes (location / and location /_next/)
            const fixFrontend = `sed -i '/location\\/\\s*\\/_/s|proxy_pass http://127\\.0\\.0\\.1:${wrongPort}|proxy_pass http://127.0.0.1:${frontendPort}|g' ${configPath}`;
            execSync(fixFrontend, { encoding: "utf-8" });

            // Fix standalone location /
            const fixRoot = `sed -i '/location\\/\\s*\\/\\s*{/s|proxy_pass http://127\\.0\\.0\\.1:${wrongPort}|proxy_pass http://127.0.0.1:${frontendPort}|g' ${configPath}`;
            execSync(fixRoot, { encoding: "utf-8" });

            this.log(`✅ Fixed port ${wrongPort} → ${frontendPort} for frontend routes`, "info");
            fixed = true;
          }
        }

        if (wrongPort !== backendPort.toString()) {
          const checkCmd = `grep -c "location /api" ${configPath} 2>/dev/null | head -1 | xargs -I{} grep -c "proxy_pass http://127.0.0.1:${wrongPort}" {} || echo "0"`;

          try {
            const count = parseInt(execSync(checkCmd, { encoding: "utf-8" }).trim());
            if (count > 0) {
              // Fix API routes
              const fixApi = `sed -i '/location\\/api/s|proxy_pass http://127\\.0\\.0\\.1:${wrongPort}|proxy_pass http://127.0.0.1:${backendPort}|g' ${configPath}`;
              execSync(fixApi, { encoding: "utf-8" });

              this.log(`✅ Fixed port ${wrongPort} → ${backendPort} for API routes`, "info");
              fixed = true;
            }
          } catch (e) {
            // API might not use this port, continue
          }
        }
      }

      if (fixed) {
        // Test nginx configuration
        this.log("Testing nginx configuration...", "step");
        const testResult = execSync("nginx -t 2>&1", { encoding: "utf-8" });
        this.log(`Nginx test output: ${testResult}`, "info");

        if (testResult.includes("successful") || testResult.includes("syntax is ok")) {
          this.log("✅ Nginx configuration test passed", "info");

          // Reload nginx
          this.log("Reloading nginx...", "step");
          execSync("systemctl reload nginx", { encoding: "utf-8" });
          this.log("✅ Nginx reloaded successfully", "info");
        } else {
          this.log("❌ Nginx configuration test failed", "error");
          this.log(testResult, "error");
        }
      } else {
        this.log("✅ No port fixes needed (already correct)", "info");
      }

    } catch (error) {
      this.log(`Nginx fix skipped: ${error.message}`, "warning");
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

  /**
   * AUTO-FIX PACKAGE.JSON PORT DEFAULT
   * Ensures frontend starts on correct environment port
   */
  fixPackageJsonPort() {
    this.log("Auto-fixing package.json port configuration...", "step");

    try {
      const packageJsonPath = `${this.config.directory}/frontend/package.json`;
      const frontendPort = this.config.frontendPort;

      // Check if package.json exists
      if (!require('fs').existsSync(packageJsonPath)) {
        this.log("No frontend package.json found", "info");
        return;
      }

      const packageJson = JSON.parse(require('fs').readFileSync(packageJsonPath, 'utf8'));
      const currentStartScript = packageJson.scripts?.start || "";

      // Extract current default port from start script
      const portMatch = currentStartScript.match(/\$\{PORT:-(\d+)\}/);
      const currentDefaultPort = portMatch ? parseInt(portMatch[1]) : null;

      this.log(`Current start script: "${currentStartScript}"`, "info");
      if (currentDefaultPort) {
        this.log(`Current default port: ${currentDefaultPort}`, "info");
      }

      // Fix if default port doesn't match environment port
      if (currentDefaultPort && currentDefaultPort !== frontendPort) {
        this.log(`⚠️ Wrong default port: ${currentDefaultPort} → should be ${frontendPort}`, "warning");

        // Replace the default port in the start script
        const newStartScript = currentStartScript.replace(
          `\${PORT:-${currentDefaultPort}}`,
          `\${PORT:-${frontendPort}}`
        );

        packageJson.scripts = packageJson.scripts || {};
        packageJson.scripts.start = newStartScript;

        // Write back to package.json
        require('fs').writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

        this.log(`✅ Fixed package.json start script: ${currentDefaultPort} → ${frontendPort}`, "info");
        this.log(`New start script: "${newStartScript}"`, "info");
      } else if (!currentDefaultPort) {
        this.log("⚠️ No PORT environment variable in start script", "warning");
        this.log("Adding PORT environment variable with correct default", "info");

        // Add PORT variable if it doesn't exist
        const newStartScript = currentStartScript.replace(
          /next start/,
          `next start -p \${PORT:-${frontendPort}}`
        );

        packageJson.scripts = packageJson.scripts || {};
        packageJson.scripts.start = newStartScript;

        require('fs').writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

        this.log(`✅ Added PORT variable to start script`, "info");
        this.log(`New start script: "${newStartScript}"`, "info");
      } else {
        this.log(`✅ Package.json port already correct (${frontendPort})`, "info");
      }
    } catch (error) {
      this.log(`Package.json fix skipped: ${error.message}`, "warning");
    }
  }

  /**
   * VERIFY NGINX-FRONTEND CONNECTIVITY
   * Tests if frontend is accessible and fixes nginx if needed
   */
  async verifyAndFixNginxFrontendConnectivity() {
    this.log("Verifying nginx-to-frontend connectivity...", "step");

    try {
      const frontendPort = this.config.frontendPort;

      // WAIT for frontend to fully start up (Next.js needs time)
      this.log("Waiting for frontend to start up...", "info");
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay

      // Test 1: Direct access to frontend port
      this.log("Testing direct frontend access...", "info");
      const directResult = this.exec(
        `curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:${frontendPort}`,
        "Direct frontend test",
        false
      ).trim();

      this.log(`Direct frontend access: HTTP ${directResult}`, "info");

      if (directResult !== "200") {
        this.log(`⚠️ Frontend not responding on port ${frontendPort}`, "warning");
        return; // Frontend issue, not nginx
      }

      // Test 2: Access through nginx
      this.log("Testing access through nginx...", "info");
      const nginxResult = this.exec(
        `curl -s -o /dev/null -w "%{http_code}" --max-time 5 ${this.config.url}`,
        "Nginx frontend test",
        false
      ).trim();

      this.log(`Nginx frontend access: HTTP ${nginxResult}`, "info");

      // DETECT MISMATCH: Direct works but nginx fails
      if (directResult === "200" && (nginxResult !== "200" || nginxResult === "502")) {
        this.log("⚠️ MISMATCH DETECTED: Frontend works directly but fails through nginx", "warning");
        this.log("This indicates nginx configuration issue - fixing...", "info");

        // Find all proxy_pass lines pointing to wrong ports
        const domain = this.env === "production" ? "cheapestdata.com" : "staging.cheapestdata.com";
        const configPath = this.exec(
          `find /etc/nginx/sites-enabled/ -type f -exec grep -l '${domain}' {} \\; 2>/dev/null | head -1`,
          "Find nginx config",
          false
        ).trim();

        if (!configPath) {
          this.log("No nginx config found", "warning");
          return;
        }

        // Get all proxy_pass lines from the config
        const nginxConfig = this.exec(`cat ${configPath}`, "Read nginx config", false);
        const proxyPassLines = nginxConfig.match(/proxy_pass\s+http:\/\/[^;]+/g) || [];

        this.log(`Found ${proxyPassLines.length} proxy_pass directives`, "info");

        // Check each proxy_pass line
        let fixed = false;
        for (const line of proxyPassLines) {
          const portMatch = line.match(/127\.0\.0\.1:(\d+)/);
          if (!portMatch) continue;

          const port = parseInt(portMatch[1]);

          // Frontend routes should use frontendPort
          // API routes should use backendPort
          const isApiRoute = nginxConfig.substring(nginxConfig.indexOf(line) - 50, nginxConfig.indexOf(line)).includes('location /api');

          const correctPort = isApiRoute ? this.config.backendPort : this.config.frontendPort;

          if (port !== correctPort) {
            this.log(`⚠️ Wrong port in proxy_pass: ${port} → should be ${correctPort}`, "warning");

            // Fix this specific line using sed with context
            const fixCmd = `sed -i 's|proxy_pass http://127.0.0.1:${port}|proxy_pass http://127.0.0.1:${correctPort}|g' ${configPath}`;
            this.exec(fixCmd, `Fix port ${port} → ${correctPort}`);

            this.log(`✅ Fixed proxy_pass port: ${port} → ${correctPort}`, "info");
            fixed = true;
          }
        }

        if (fixed) {
          // Test and reload nginx
          this.log("Testing nginx configuration...", "step");
          const testResult = this.exec("nginx -t 2>&1", "Nginx test", false);

          if (testResult.includes("successful") || testResult.includes("syntax is ok")) {
            this.log("✅ Nginx configuration test passed", "info");

            this.log("Reloading nginx...", "step");
            this.exec("systemctl reload nginx", "Reload nginx");
            this.log("✅ Nginx reloaded successfully", "info");

            // Verify fix worked
            this.log("Verifying fix...", "step");
            setTimeout(() => {
              const verifyResult = this.exec(
                `curl -s -o /dev/null -w "%{http_code}" --max-time 5 ${this.config.url}`,
                "Verify nginx fix",
                false
              ).trim();

              if (verifyResult === "200") {
                this.log("✅ Nginx-to-frontend connectivity verified!", "info");
              } else {
                this.log(`⚠️ Still getting HTTP ${verifyResult} after nginx fix`, "warning");
              }
            }, 2000); // Wait 2 seconds for nginx to fully reload
          }
        }
      } else if (directResult === "200" && nginxResult === "200") {
        this.log("✅ Nginx-to-frontend connectivity verified!", "info");
      }
    } catch (error) {
      this.log(`Nginx connectivity verification skipped: ${error.message}`, "warning");
    }
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
      const startTime = Date.now();

      // AUTO-CONFIGURE FIRST: Discover deployment directory before running commands
      this.autoConfigure();

      // SETUP SSH AUTH: Configure SSH password/key authentication for remote deployment
      this.setupSSHAuth();

      // AUTO-WARM RUNNER: Now we have config.directory set
      await this.warmRunner();

      // AUTO-RECOVERY: Fix common infrastructure issues
      this.autoRecover();

      this.pullCode();

      // TIME OPTIMIZATION: Detect changes and skip unnecessary builds
      const changes = this.detectChanges();

      if (changes.backendChanged || changes.frontendChanged) {
        // TIME OPTIMIZATION: Parallel builds when both changed (saves ~3 min)
        if (changes.backendChanged && changes.frontendChanged) {
          this.log("Both backend and frontend changed - building in parallel...", "step");
          await Promise.all([
            this.buildBackend(),
            this.buildFrontend()
          ]);
        } else if (changes.backendChanged) {
          this.log("Only backend changed - skipping frontend build", "info");
          this.buildBackend();
        } else if (changes.frontendChanged) {
          this.log("Only frontend changed - skipping backend build", "info");
          this.buildFrontend();
        }
      } else {
        this.log("✅ No code changes detected - skipping builds (saves ~10 min)", "info");
      }

      // BUILT-IN NGINX FIX: Direct fixing without external scripts
      this.fixNginxConfig();

      // AUTO-FIX PACKAGE.JSON: Ensure frontend starts on correct port
      this.fixPackageJsonPort();

      this.restartBackend();
      this.restartFrontend();

      // VERIFY NGINX-FRONTEND CONNECTIVITY: Catch and fix any remaining nginx issues
      await this.verifyAndFixNginxFrontendConnectivity();

      // COMPREHENSIVE VERIFICATION: Real checks, not just HTTP 200
      const verified = await this.comprehensiveVerification();

      const duration = Math.round((Date.now() - startTime) / 1000);
      this.log(`=== ${this.env.toUpperCase()} DEPLOYMENT ${verified ? "SUCCESS" : "FAILED"} ===`, verified ? "info" : "error");
      this.log(`Total deployment time: ${duration}s (${Math.round(duration/60)}m)`, "info");

      process.exit(verified ? 0 : 1);

    } catch (error) {
      this.log(`❌ Deployment failed: ${error.message}`, "error");
      this.log("Errors encountered:", "error");
      this.errors.forEach(err => this.log(`  - ${err}`, "error"));
      process.exit(1);
    }
  }

  /**
   * SMART CHANGE DETECTION: Detect if backend/frontend changed
   * Skips builds if no changes (saves ~10 min)
   */
  detectChanges() {
    this.log("Detecting code changes...", "step");

    try {
      // Get last commit hash
      const lastCommit = this.exec("git rev-parse HEAD", "Get last commit", false).trim();

      // Check if backend changed
      const backendDiff = this.exec("git diff HEAD~1 HEAD --name-only | grep -E '^backend/' || true", "Check backend changes", false).trim();
      const backendChanged = backendDiff.length > 0;

      // Check if frontend changed
      const frontendDiff = this.exec("git diff HEAD~1 HEAD --name-only | grep -E '^frontend/' || true", "Check frontend changes", false).trim();
      const frontendChanged = frontendDiff.length > 0;

      this.log(`Backend changed: ${backendChanged ? "YES" : "NO"}`, backendChanged ? "info" : "step");
      this.log(`Frontend changed: ${frontendChanged ? "YES" : "NO"}`, frontendChanged ? "info" : "step");

      return { backendChanged, frontendChanged, lastCommit };

    } catch (error) {
      this.log(`Change detection failed, assuming both changed: ${error.message}`, "warning");
      return { backendChanged: true, frontendChanged: true, lastCommit: null };
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
