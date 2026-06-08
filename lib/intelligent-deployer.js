#!/usr/bin/env node

/**
 * INTELLIGENT UNIVERSAL DEPLOYER
 *
 * Automatically discovers deployment directories and configuration
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
  }

  exec(command, description) {
    try {
      this.log(`Executing: ${description}`, "step");
      const output = execSync(command, { encoding: "utf-8", stdio: "pipe", cwd: this.config.directory });
      this.log(`${description} - SUCCESS`, "info");
      return output;
    } catch (error) {
      this.errors.push(`${description}: ${error.message}`);
      this.log(`${description} - FAILED: ${error.message}`, "error");
      throw error;
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
    this.exec("cd frontend && npm run build", "Build frontend");
    this.log("Frontend built successfully", "info");
  }

  restartBackend() {
    this.log("Restarting backend...", "step");
    const appName = `${this.env}-backend`;
    try {
      this.exec(`PM2_HOME=/etc/.pm2 pm2 restart ${appName}`, `Restart ${appName}`);
    } catch (error) {
      this.log(`${appName} not running, starting fresh`, "warning");
      this.exec(`cd backend && PM2_HOME=/etc/.pm2 pm2 start dist/main.js --name ${appName}`, `Start ${appName}`);
    }
    this.log("Backend restarted", "info");
  }

  restartFrontend() {
    this.log("Restarting frontend...", "step");
    const appName = `${this.env}-frontend`;
    try {
      this.exec(`PM2_HOME=/etc/.pm2 pm2 restart ${appName}`, `Restart ${appName}`);
    } catch (error) {
      this.log(`${appName} not running, starting fresh`, "warning");
      this.exec(`cd frontend && PM2_HOME=/etc/.pm2 pm2 start npm.js --name ${appName} -- start`, `Start ${appName}`);
    }
    this.log("Frontend restarted", "info");
  }

  async verify() {
    this.log("Verifying deployment...", "step");
    await new Promise(resolve => setTimeout(resolve, 15000));
    try {
      const response = execSync(`curl -s -o /dev/null -w "%{http_code}" ${this.config.url}`, { encoding: "utf-8" }).trim();
      if (response === "200") {
        this.log(`Verification passed: HTTP ${response}`, "info");
        return true;
      }
      throw new Error(`HTTP ${response} - expected 200`);
    } catch (error) {
      this.log(`Verification failed: ${error.message}`, "error");
      return false;
    }
  }

  async deploy() {
    try {
      this.log(`=== STARTING ${this.env.toUpperCase()} DEPLOYMENT ===`, "step");
      this.autoConfigure();
      this.pullCode();
      this.buildBackend();
      this.buildFrontend();
      this.restartBackend();
      this.restartFrontend();
      const verified = await this.verify();
      this.log(`=== ${this.env.toUpperCase()} DEPLOYMENT ${verified ? "SUCCESS" : "FAILED"} ===`, verified ? "info" : "error");
      process.exit(verified ? 0 : 1);
    } catch (error) {
      this.log(`Deployment failed: ${error.message}`, "error");
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const environment = process.argv[2] || "production";
  const deployer = new IntelligentDeployer(environment);
  deployer.deploy().catch(error => { console.error("Fatal error:", error); process.exit(1); });
}

module.exports = IntelligentDeployer;
