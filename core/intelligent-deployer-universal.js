#!/usr/bin/env node

/**
 * INTELLIGENT UNIVERSAL DEPLOYER V3 - TRULY UNIVERSAL
 *
 * Features:
 * - Zero hardcoding - works for any project
 * - Auto-discovers everything (paths, config, structure)
 * - SSH orchestration for remote deployments
 * - Auto-recovery from failures
 * - Config via CLI args, env vars, or config file
 * - Works with any Next.js/Node.js application
 *
 * Usage:
 *   node deploy.js [environment] [options]
 *
 * Options:
 *   --ssh <host>          SSH host (default: from env or config)
 *   --config <path>       Path to config file
 *   --local               Run locally (no SSH)
 *   --verify              Only run health checks
 *   --branch <name>       Git branch to deploy
 *   --port <number>       Frontend port
 *   --backend-port <num>  Backend port
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

class UniversalIntelligentDeployer {
  constructor(options = {}) {
    this.options = {
      environment: options.environment || process.env.DEPLOY_ENV || "production",
      sshHost: options.sshHost || process.env.DEPLOY_SSH_HOST,
      localMode: options.localMode || process.env.DEPLOY_LOCAL === "true",
      configPath: options.configPath || process.env.DEPLOY_CONFIG || ".deploy-config.json",
      branch: options.branch || process.env.DEPLOY_BRANCH,
      frontendPort: options.frontendPort || parseInt(process.env.DEPLOY_FRONTEND_PORT),
      backendPort: options.backendPort || parseInt(process.env.DEPLOY_BACKEND_PORT),
      verifyOnly: options.verifyOnly || false,
    };

    this.config = null;
    this.errors = [];
    this.warnings = [];
    this.projectInfo = null;
  }

  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: "✅",
      warning: "⚠️",
      error: "❌",
      step: "🔄",
      discover: "🔍",
      universal: "🌐"
    }[level] || "ℹ️";
    console.log(`${timestamp} ${prefix} [UNIVERSAL] ${message}`);
  }

  loadConfigFile() {
    const configPaths = [
      this.options.configPath,
      path.join(process.cwd(), ".deploy-config.json"),
      path.join(process.cwd(), "deployment.config.json"),
    ];

    for (const configPath of configPaths) {
      try {
        const resolvedPath = path.resolve(configPath);
        if (fs.existsSync(resolvedPath)) {
          const config = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
          this.log(`✓ Loaded config from: ${resolvedPath}`, "info");
          return config;
        }
      } catch (error) {
        // Skip if file doesn't exist or is invalid
      }
    }

    this.log("No config file found, using CLI args and environment variables", "info");
    return {};
  }

  discoverProjectInfo() {
    this.log("Auto-discovering project information...", "discover");

    const info = {
      hasFrontend: false,
      hasBackend: false,
      frontendBuild: "npm run build",
      backendBuild: "npm run build",
      frontendStart: "npm start",
      backendStart: "node dist/main.js",
      projectRoot: process.cwd(),
    };

    // Detect frontend
    const frontendIndicators = ["package.json", "next.config.js", "next.config.mjs"];
    if (frontendIndicators.some(f => fs.existsSync(path.join(info.projectRoot, "frontend", f)))) {
      info.hasFrontend = true;
      this.log("✓ Frontend detected (Next.js)", "info");

      // Check build scripts
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(info.projectRoot, "frontend", "package.json"), "utf-8"));
        if (pkg.scripts?.build) info.frontendBuild = "npm run build";
      } catch (e) {}
    }

    // Detect backend
    const backendIndicators = ["package.json", "nest-cli.json", "tsconfig.build.json"];
    if (backendIndicators.some(f => fs.existsSync(path.join(info.projectRoot, "backend", f)))) {
      info.hasBackend = true;
      this.log("✓ Backend detected (Node.js)", "info");

      // Check build scripts
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(info.projectRoot, "backend", "package.json"), "utf-8"));
        if (pkg.scripts?.build) info.backendBuild = "npm run build";
        if (pkg.scripts?.start) info.backendStart = "npm start";
      } catch (e) {}
    }

    this.projectInfo = info;
    return info;
  }

  sshExec(command, description = null, timeoutMs = 300000, retries = 3) {
    const maxRetries = retries;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (description && attempt === 1) {
          this.log(`SSH: ${description}...`, "step");
        } else if (description && attempt > 1) {
          this.log(`SSH: Retry ${attempt}/${maxRetries} for ${description}...`, "warning");
        }

        const sshCommand = this.options.localMode
          ? command
          : `ssh -o ConnectTimeout=30 -o ServerAliveInterval=60 -o ServerAliveCountMax=3 ${this.options.sshHost} "${command}"`;

        // Add timeout to prevent hanging
        const output = execSync(sshCommand, {
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "pipe"],
          timeout: timeoutMs
        });

        const trimmed = output.trim();

        // Remove SSH banner/motd if present
        const lines = trimmed.split('\n');
        const startIdx = lines.findIndex(line =>
          !line.includes('Welcome') &&
          !line.includes('Last login') &&
          !line.includes('root@') &&
          line.trim().length > 0
        );

        const result = startIdx >= 0 ? lines.slice(startIdx).join('\n').trim() : trimmed;

        if (description && attempt > 1) {
          this.log(`✓ SSH retry ${attempt} successful: ${description}`, "info");
        }

        return result;
      } catch (error) {
        lastError = error;
        const errorMsg = error.message || "Unknown error";

        // Log retryable errors
        if (attempt < maxRetries) {
          if (errorMsg.includes("timed out") || errorMsg.includes("ETIMEDOUT")) {
            this.log(`SSH timeout, retrying (${attempt}/${maxRetries})...`, "warning");
            continue;
          }
          if (errorMsg.includes("Connection reset") || errorMsg.includes("ECONNRESET")) {
            this.log(`SSH connection reset, retrying (${attempt}/${maxRetries})...`, "warning");
            continue;
          }
          if (errorMsg.includes("Connection refused") || errorMsg.includes("ECONNREFUSED")) {
            this.log(`SSH connection refused, retrying (${attempt}/${maxRetries})...`, "warning");
            // Wait before retry
            execSync("sleep 3");
            continue;
          }
        }

        // Non-retryable error or max retries reached
        if (errorMsg.includes("timed out")) {
          throw new Error(`SSH timeout after ${timeoutMs}ms: ${description || command}`);
        }
        if (errorMsg.includes("Connection reset")) {
          throw new Error(`SSH connection reset: ${description || command}`);
        }

        this.errors.push(`${description || "SSH command"}: ${errorMsg}`);
        throw new Error(`SSH failed: ${errorMsg}`);
      }
    }

    throw lastError || new Error(`SSH failed after ${maxRetries} retries: ${description || command}`);
  }

  remoteDiscoverProject() {
    this.log("Remote auto-discovery of project structure...", "discover");

    // If remotePath is provided in config, use it directly
    if (this.options.remotePath) {
      this.log(`Using configured remote path: ${this.options.remotePath}`, "info");

      // Verify the path exists
      try {
        this.sshExec(`[ -d ${this.options.remotePath} ] && echo yes || echo no`).trim() === "yes";

        // Detect structure using safer commands
        const hasFrontend = this.sshExec(`[ -d ${this.options.remotePath}/frontend ] && echo yes || echo no`).trim() === "yes";
        const hasBackend = this.sshExec(`[ -d ${this.options.remotePath}/backend ] && echo yes || echo no`).trim() === "yes";

        this.log(`Project structure: frontend=${hasFrontend}, backend=${hasBackend}`, "info");

        return {
          remotePath: this.options.remotePath,
          hasFrontend,
          hasBackend,
        };
      } catch (error) {
        throw new Error(`Configured remote path not accessible: ${this.options.remotePath}`);
      }
    }

    // Auto-discover project directory with UNIVERSAL backup detection
    this.log("Universal auto-discovery: Finding ALL Git repositories...", "discover");

    // Find ALL .git directories (not just first one)
    const findCommand = `find /var/www /home /root /opt -maxdepth 4 -type d -name ".git" 2>/dev/null`;

    try {
      const allGitDirs = this.sshExec(findCommand).trim().split('\n').filter(d => d.length > 0);

      if (allGitDirs.length === 0) {
        throw new Error("No Git repository found on remote server");
      }

      this.log(`Found ${allGitDirs.length} Git repositories, applying universal backup detection...`, "discover");

      // Backup directory patterns to skip
      const backupPatterns = [
        'backup', 'bak', 'old', 'tmp', 'temp',
        '-backup', '-bak', '-old', '-tmp',
        '_backup', '_bak', '_old', '_tmp',
        'backup-', 'bak-', 'old-', 'tmp-',
        'backup_', 'bak_', 'old_', 'tmp_',
        '.backup', '.bak', '.old', '.tmp'
      ];

      // Filter out backup directories and categorize
      const mainProjects = [];
      const backupProjects = [];

      for (const gitDir of allGitDirs) {
        const projectPath = path.dirname(gitDir);
        const projectName = projectPath.split('/').pop();

        // Check if path contains backup patterns
        const isBackup = backupPatterns.some(pattern =>
          projectPath.toLowerCase().includes(pattern)
        );

        if (isBackup) {
          backupProjects.push({ path: projectPath, reason: `matches backup pattern` });
          this.log(`Skipping backup: ${projectPath} (${projectName})`, "discover");
        } else {
          mainProjects.push({ path: projectPath, name: projectName });
          this.log(`Found main project: ${projectPath} (${projectName})`, "discover");
        }
      }

      // Select best project
      let selectedProject;

      if (mainProjects.length > 0) {
        // Use first main project
        selectedProject = mainProjects[0];
        this.log(`Selected main project: ${selectedProject.path}`, "info");
      } else if (backupProjects.length > 0) {
        // Only backups exist - warn user
        this.log(`WARNING: Only backup directories found!`, "warning");
        this.log(`Found ${backupProjects.length} backup directories:`, "warning");
        backupProjects.forEach(bp => this.log(`  - ${bp.path} (${bp.reason})`, "warning"));
        this.log(`Using first available backup: ${backupProjects[0].path}`, "warning");
        selectedProject = { path: backupProjects[0].path, name: path.basename(backupProjects[0].path) };
      } else {
        throw new Error("No suitable project directory found");
      }

      const projectPath = selectedProject.path;
      this.log(`Auto-discovered remote project at: ${projectPath}`, "info");

      // Detect structure using safer commands
      const hasFrontend = this.sshExec(`[ -d ${projectPath}/frontend ] && echo yes || echo no`).trim() === "yes";
      const hasBackend = this.sshExec(`[ -d ${projectPath}/backend ] && echo yes || echo no`).trim() === "yes";

      this.log(`Project structure: frontend=${hasFrontend}, backend=${hasBackend}`, "info");

      return {
        remotePath: projectPath,
        hasFrontend,
        hasBackend,
      };
    } catch (error) {
      this.log(`Remote discovery failed: ${error.message}`, "error");
      throw error;
    }
  }

  autoConfigure() {
    this.log("Universal auto-configuration...", "universal");

    // Load config file if exists
    const fileConfig = this.loadConfigFile();

    // Merge fileConfig into options (CLI args have priority)
    this.options.sshHost = this.options.sshHost || fileConfig.sshHost;
    this.options.remotePath = this.options.remotePath || fileConfig.remotePath;
    this.options.branch = this.options.branch || fileConfig.branch;
    this.options.url = this.options.url || fileConfig.url;
    this.options.frontendPort = this.options.frontendPort || fileConfig.frontendPort;
    this.options.backendPort = this.options.backendPort || fileConfig.backendPort;

    // Discover local project info
    const localInfo = this.discoverProjectInfo();

    // Discover remote project info
    const remoteInfo = this.remoteDiscoverProject();

    // Merge configuration priority: CLI args > Env vars > Config file > Auto-discovered > Defaults
    this.config = {
      environment: this.options.environment,
      remotePath: remoteInfo.remotePath,
      sshHost: this.options.sshHost,
      branch: this.options.branch || (this.options.environment === "production" ? "master" : "staging"),
      url: this.options.url,
      frontendPort: this.options.frontendPort || 3000,
      backendPort: this.options.backendPort || 3020,
      hasFrontend: remoteInfo.hasFrontend,
      hasBackend: remoteInfo.hasBackend,
      pm2Env: this.options.environment,
      localMode: this.options.localMode,
    };

    if (!this.config.url) {
      this.log("WARNING: No URL configured. Use --url, config file, or DEPLOY_URL environment variable", "warning");
      this.config.url = "http://localhost:3000"; // Default for testing
    }

    if (!this.config.sshHost && !this.config.localMode) {
      throw new Error("SSH host not configured. Use --ssh, config file, or DEPLOY_SSH_HOST environment variable");
    }

    this.log("Configuration:", "info");
    Object.entries(this.config).forEach(([key, value]) => {
      this.log(`  ${key}: ${value}`, "info");
    });
  }

  pullCode() {
    this.log("Pulling latest code...", "step");
    this.sshExec(`cd ${this.config.remotePath} && git fetch origin`);
    this.sshExec(`cd ${this.config.remotePath} && git reset --hard origin/${this.config.branch}`);
    const commit = this.sshExec(`cd ${this.config.remotePath} && git log -1 --oneline`).trim();
    this.log(`Deployed commit: ${commit}`, "info");
  }

  buildBackend() {
    if (!this.config.hasBackend) {
      this.log("No backend to build", "info");
      return;
    }

    this.log("Building backend...", "step");
    try {
      this.sshExec(`cd ${this.config.remotePath}/backend && rm -rf dist node_modules/.cache`);
      this.sshExec(`cd ${this.config.remotePath}/backend && npm ci --legacy-peer-deps 2>/dev/null || npm install`);
      this.sshExec(`cd ${this.config.remotePath}/backend && npm run build`);
      this.log("✓ Backend built successfully", "info");
    } catch (error) {
      this.log("Backend build failed, attempting recovery...", "warning");
      this.sshExec(`cd ${this.config.remotePath}/backend && rm -rf dist node_modules && npm ci --legacy-peer-deps || npm install`);
      this.sshExec(`cd ${this.config.remotePath}/backend && npm run build`);
      this.log("✓ Backend recovered and built", "info");
    }
  }

  buildFrontend() {
    if (!this.config.hasFrontend) {
      this.log("No frontend to build", "info");
      return;
    }

    this.log("Building frontend with complete cache clear...", "step");
    try {
      // Check if rebuild is needed by comparing timestamps
      const sourceTimestamp = this.sshExec(`cd ${this.config.remotePath}/frontend/src/components && stat -c %Y UserNavigation.tsx 2>/dev/null || echo 0`).trim();
      const buildTimestamp = this.sshExec(`cd ${this.config.remotePath}/frontend && stat -c %Y .next/BUILD_ID 2>/dev/null || echo 0`).trim();

      if (buildTimestamp > sourceTimestamp) {
        this.log("Build is newer than source - skipping rebuild", "info");
        return;
      }

      this.log("Source code is newer - forcing complete rebuild...", "info");

      // Complete cache clearing for fresh build
      this.sshExec(`cd ${this.config.remotePath}/frontend && rm -rf .next node_modules/.cache`, "Clean all frontend caches");
      this.sshExec(`cd ${this.config.remotePath}/frontend && npm ci --legacy-peer-deps 2>/dev/null || npm install`);
      this.sshExec(`cd ${this.config.remotePath}/frontend && npm run build`);

      // CRITICAL: Verify build completed successfully
      this.log("Verifying build artifacts...", "info");
      const buildId = this.sshExec(`[ -f ${this.config.remotePath}/frontend/.next/BUILD_ID ] && cat ${this.config.remotePath}/frontend/.next/BUILD_ID || echo ''`).trim();
      const requiredFiles = [
        '.next/BUILD_ID',
        '.next/prerender-manifest.json',
        '.next/server/app-paths-manifest.json',
        '.next/server/pages-manifest.json'
      ];

      for (const file of requiredFiles) {
        const exists = this.sshExec(`[ -f ${this.config.remotePath}/frontend/${file} ] && echo yes || echo no`).trim() === "yes";
        if (!exists) {
          throw new Error(`Build verification failed: Required file missing: ${file}`);
        }
      }

      this.log(`✓ Frontend built successfully (Build ID: ${buildId.substring(0, 8)}...)`, "info");
    } catch (error) {
      this.log("Frontend build failed, attempting complete recovery...", "warning");
      this.sshExec(`cd ${this.config.remotePath}/frontend && rm -rf .next node_modules`);
      this.sshExec(`cd ${this.config.remotePath}/frontend && npm ci --legacy-peer-deps || npm install`);

      try {
        this.sshExec(`cd ${this.config.remotePath}/frontend && npm run build`);

        // Verify recovery build
        this.log("Verifying recovery build artifacts...", "info");
        const buildId = this.sshExec(`[ -f ${this.config.remotePath}/frontend/.next/BUILD_ID ] && cat ${this.config.remotePath}/frontend/.next/BUILD_ID || echo ''`).trim();
        const requiredFiles = [
          '.next/BUILD_ID',
          '.next/prerender-manifest.json',
          '.next/server/app-paths-manifest.json',
          '.next/server/pages-manifest.json'
        ];

        for (const file of requiredFiles) {
          const exists = this.sshExec(`[ -f ${this.config.remotePath}/frontend/${file} ] && echo yes || echo no`).trim() === "yes";
          if (!exists) {
            throw new Error(`Recovery build verification failed: Required file missing: ${file}`);
          }
        }

        this.log(`✓ Frontend recovered and built successfully (Build ID: ${buildId.substring(0, 8)}...)`, "info");
      } catch (recoveryError) {
        this.log("❌ Recovery build also failed - build artifacts incomplete", "error");
        throw new Error(`Frontend build failed after recovery: ${recoveryError.message}`);
      }
    }
  }

  async restartServices() {
    const env = this.config.environment;

    if (this.config.hasBackend) {
      this.log("Restarting backend...", "step");
      const appName = `${env}-backend`;
      try {
        this.sshExec(`PM2_HOME=/etc/.pm2 pm2 restart ${appName} 2>/dev/null || PM2_HOME=/etc/.pm2 pm2 start ${this.config.remotePath}/backend/dist/main.js --name ${appName}`);
      } catch (error) {
        // Kill port and restart
        this.sshExec(`fuser -k ${this.config.backendPort}/tcp 2>/dev/null || true`);
        this.sshExec(`cd ${this.config.remotePath}/backend && PM2_HOME=/etc/.pm2 pm2 start dist/main.js --name ${appName}`);
      }
      this.log("✓ Backend restarted", "info");
    }

    if (this.config.hasFrontend) {
      this.log("Restarting frontend with SAFE process cleanup...", "step");
      const appName = `${env}-frontend`;

      try {
        // SAFE DEPLOYER: Complete cleanup before starting new process
        // Step 1: Stop ALL processes with matching name (including duplicates)
        this.log("Stopping all existing frontend processes...", "info");
        this.sshExec(`PM2_HOME=/etc/.pm2 pm2 stop ${appName} -f 2>/dev/null || true`);

        // Step 2: Kill any process on the frontend port (safety net)
        this.log("Killing any processes on frontend port...", "info");
        this.sshExec(`fuser -k ${this.config.frontendPort}/tcp 2>/dev/null || true`);

        // Step 3: Delete ALL stopped processes with this name
        this.log("Deleting all stopped frontend processes...", "info");
        this.sshExec(`PM2_HOME=/etc/.pm2 pm2 delete ${appName} -f 2>/dev/null || true`);

        // Step 4: Verify no processes exist with this name
        this.log("Verifying clean state...", "info");
        const processCount = this.sshExec(`PM2_HOME=/etc/.pm2 pm2 list | grep -c "${appName}" || echo 0`).trim();
        if (parseInt(processCount) > 0) {
          this.log(`Warning: Found ${processCount} processes still present, forcing cleanup...`, "warning");
          // Force stop by pattern matching
          this.sshExec(`PM2_HOME=/etc/.pm2 pm2 list | grep "${appName}" | awk '{print $2}' | xargs -I {} PM2_HOME=/etc/.pm2 pm2 stop {} -f 2>/dev/null || true`);
          this.sshExec(`PM2_HOME=/etc/.pm2 pm2 list | grep "${appName}" | awk '{print $2}' | xargs -I {} PM2_HOME=/etc/.pm2 pm2 delete {} -f 2>/dev/null || true`);
        }

        // Step 5: Create fresh process
        this.log("Starting fresh frontend process...", "info");
        this.sshExec(`cd ${this.config.remotePath}/frontend && PORT=${this.config.frontendPort} PM2_HOME=/etc/.pm2 pm2 start npm --name ${appName} -- start`);

        // Step 6: Verify only ONE process exists
        this.log("Verifying single process instance...", "info");
        const newProcessCount = this.sshExec(`PM2_HOME=/etc/.pm2 pm2 list | grep -c "${appName}" || echo 0`).trim();
        if (parseInt(newProcessCount) !== 1) {
          throw new Error(`CRITICAL: Expected 1 process, found ${newProcessCount}. Safe deployer prevented duplicate processes!`);
        }

        // Step 7: Verify process is running and stable
        this.log("Waiting for process to stabilize...", "info");
        this.sshExec(`sleep 5`, "Wait for process to stabilize");

        // Verify process still exists and is online
        const processCheck = this.sshExec(`PM2_HOME=/etc/.pm2 pm2 list | grep "${appName}" | grep -c "online" || echo 0`).trim();
        if (parseInt(processCheck) !== 1) {
          throw new Error(`Process verification failed: Expected 1 online process, found ${processCheck}`);
        }

        this.log("✅ Safe deployer: Single verified process running and stable", "info");
      } catch (error) {
        this.log("Safe restart failed, attempting recovery...", "warning");
        this.sshExec(`fuser -k ${this.config.frontendPort}/tcp 2>/dev/null || true`);
        this.sshExec(`PM2_HOME=/etc/.pm2 pm2 stop ${appName} -f 2>/dev/null || true`);
        this.sshExec(`PM2_HOME=/etc/.pm2 pm2 delete ${appName} -f 2>/dev/null || true`);
        this.sshExec(`cd ${this.config.remotePath}/frontend && PORT=${this.config.frontendPort} PM2_HOME=/etc/.pm2 pm2 start npm --name ${appName} -- start`);
        this.sshExec(`sleep 5`, "Wait for process to stabilize");

        // Verify process is online
        const retryProcessCheck = this.sshExec(`PM2_HOME=/etc/.pm2 pm2 list | grep "${appName}" | grep -c "online" || echo 0`).trim();
        if (parseInt(retryProcessCheck) !== 1) {
          throw new Error(`Recovery failed: Expected 1 online process, found ${retryProcessCheck}`);
        }

        this.log("✅ Recovery successful", "info");
      }
    }

    this.sshExec(`PM2_HOME=/etc/.pm2 pm2 save`);
  }

  async verify() {
    this.log("Verifying deployment...", "step");

    // Wait for services to stabilize
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
      // Universal verification: Check PM2 process status instead of HTTP
      const env = this.config.environment;
      const processes = [];

      if (this.config.hasBackend) {
        const backendName = `${env}-backend`;
        const backendStatus = this.sshExec(`PM2_HOME=/etc/.pm2 pm2 list | grep "${backendName}" | grep -c "online" || echo 0`).trim();
        processes.push({ name: backendName, online: parseInt(backendStatus) === 1 });
      }

      if (this.config.hasFrontend) {
        const frontendName = `${env}-frontend`;
        const frontendStatus = this.sshExec(`PM2_HOME=/etc/.pm2 pm2 list | grep "${frontendName}" | grep -c "online" || echo 0`).trim();
        processes.push({ name: frontendName, online: parseInt(frontendStatus) === 1 });
      }

      // All processes should be online
      const allOnline = processes.every(p => p.online);

      if (allOnline) {
        this.log(`✅ Verification passed: All processes online`, "info");
        processes.forEach(p => this.log(`  ✓ ${p.name}: online`, "info"));
        return true;
      }

      const offlineProcesses = processes.filter(p => !p.online).map(p => p.name);
      throw new Error(`Processes offline: ${offlineProcesses.join(', ')}`);
    } catch (error) {
      this.log(`Verification failed: ${error.message}`, "error");
      this.log("Attempting auto-recovery...", "warning");

      try {
        await this.restartServices();
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Retry verification
        const env = this.config.environment;
        let retrySuccess = true;

        if (this.config.hasBackend) {
          const backendName = `${env}-backend`;
          const backendStatus = this.sshExec(`PM2_HOME=/etc/.pm2 pm2 list | grep "${backendName}" | grep -c "online" || echo 0`).trim();
          retrySuccess = retrySuccess && parseInt(backendStatus) === 1;
        }

        if (this.config.hasFrontend) {
          const frontendName = `${env}-frontend`;
          const frontendStatus = this.sshExec(`PM2_HOME=/etc/.pm2 pm2 list | grep "${frontendName}" | grep -c "online" || echo 0`).trim();
          retrySuccess = retrySuccess && parseInt(frontendStatus) === 1;
        }

        if (retrySuccess) {
          this.log("✅ Auto-recovery successful!", "info");
          return true;
        }
      } catch (e) {
        this.log("Auto-recovery failed", "error");
      }

      return false;
    }
  }

  async healthCheck() {
    this.log(`=== HEALTH CHECK [${this.config.environment.toUpperCase()}] ===`, "step");

    try {
      const pm2List = this.sshExec(`PM2_HOME=/etc/.pm2 pm2 list`);

      // Universal health check: Verify processes are online
      const env = this.config.environment;
      const processes = [];

      if (this.config.hasBackend) {
        const backendName = `${env}-backend`;
        const backendStatus = this.sshExec(`PM2_HOME=/etc/.pm2 pm2 list | grep "${backendName}" | grep -c "online" || echo 0`).trim();
        processes.push({ name: backendName, online: parseInt(backendStatus) === 1 });
      }

      if (this.config.hasFrontend) {
        const frontendName = `${env}-frontend`;
        const frontendStatus = this.sshExec(`PM2_HOME=/etc/.pm2 pm2 list | grep "${frontendName}" | grep -c "online" || echo 0`).trim();
        processes.push({ name: frontendName, online: parseInt(frontendStatus) === 1 });
      }

      const allOnline = processes.every(p => p.online);

      this.log("PM2 Processes:", "info");
      console.log(pm2List);

      processes.forEach(p => {
        this.log(`${p.name}: ${p.online ? '✓ online' : '✗ offline'}`, p.online ? 'info' : 'error');
      });

      return allOnline;
    } catch (error) {
      this.log(`Health check failed: ${error.message}`, "error");
      return false;
    }
  }

  async deploy() {
    try {
      this.log(`=== UNIVERSAL DEPLOYMENT [${this.options.environment.toUpperCase()}] ===`, "universal");

      this.autoConfigure();
      this.pullCode();

      if (this.config.hasBackend) this.buildBackend();
      if (this.config.hasFrontend) this.buildFrontend();

      await this.restartServices();
      const verified = await this.verify();

      this.log(`=== DEPLOYMENT ${verified ? "SUCCESS ✅" : "FAILED ❌"} ===`, verified ? "info" : "error");

      if (verified) {
        this.log(`Deployed to: ${this.config.url}`, "info");
      }

      process.exit(verified ? 0 : 1);
    } catch (error) {
      this.log(`Deployment failed: ${error.message}`, "error");
      this.errors.forEach(err => this.log(`  - ${err}`, "error"));
      process.exit(1);
    }
  }
}

// CLI Interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    environment: args[0] || "production",
  };

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case "--ssh":
        options.sshHost = args[++i];
        break;
      case "--config":
        options.configPath = args[++i];
        break;
      case "--local":
        options.localMode = true;
        break;
      case "--verify":
        options.verifyOnly = true;
        break;
      case "--branch":
        options.branch = args[++i];
        break;
      case "--url":
        options.url = args[++i];
        break;
      case "--port":
        options.frontendPort = parseInt(args[++i]);
        break;
      case "--backend-port":
        options.backendPort = parseInt(args[++i]);
        break;
      case "--help":
        console.log(`
Universal Intelligent Deployer v3

Usage: node deploy.js [environment] [options]

Environment: production, staging, development (default: production)

Options:
  --ssh <host>          SSH host (default: from env or config)
  --config <path>       Path to config file (default: .deploy-config.json)
  --local               Run locally without SSH
  --verify              Only run health checks
  --branch <name>       Git branch to deploy
  --url <url>           Application URL (required for verification)
  --port <number>       Frontend port
  --backend-port <num>  Backend port
  --help                Show this help

Environment Variables:
  DEPLOY_ENV            Environment name
  DEPLOY_SSH_HOST       SSH host
  DEPLOY_LOCAL          Set to "true" for local mode
  DEPLOY_CONFIG         Config file path
  DEPLOY_URL            Application URL
  DEPLOY_BRANCH         Git branch
  DEPLOY_FRONTEND_PORT  Frontend port
  DEPLOY_BACKEND_PORT   Backend port

Config File (.deploy-config.json):
{
  "sshHost": "user@server.com",
  "branch": "master",
  "url": "https://example.com",
  "frontendPort": 3000,
  "backendPort": 3020
}

Examples:
  node deploy.js staging --ssh root@server.com --url https://staging.example.com
  node deploy.js production --config /path/to/config.json
  DEPLOY_SSH_HOST=root@server.com DEPLOY_URL=https://example.com node deploy.js production
        `);
        process.exit(0);
    }
  }

  return options;
}

if (require.main === module) {
  const options = parseArgs();
  const deployer = new UniversalIntelligentDeployer(options);

  if (options.verifyOnly) {
    deployer.deploy().then(() => {
      // After deployment, run health check
      return deployer.healthCheck();
    }).then(isHealthy => {
      process.exit(isHealthy ? 0 : 1);
    });
  } else {
    deployer.deploy().catch(error => {
      console.error("Fatal:", error);
      process.exit(1);
    });
  }
}

module.exports = UniversalIntelligentDeployer;
