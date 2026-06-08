#!/usr/bin/env node

/**
 * SSH UNIVERSAL DEPLOYER
 *
 * Deploy to ANY server via SSH with instant error catching:
 * - SSH to remote servers for deployment
 * - Auto-discovery on remote servers
 * - Instant error rejection
 * - Continuous deployment ready
 * - Remote monitoring
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

class SSHDeployer {
  constructor(config) {
    this.config = {
      host: config.host || "localhost",
      username: config.username || "root",
      port: config.port || 22,
      keyPath: config.keyPath || "~/.ssh/id_rsa",
      environment: config.environment || "production",
      remoteDir: config.remoteDir || "/var/www/app",
      branch: config.branch || "master",
      ...config
    };
    this.errors = [];
    this.warnings = [];
  }

  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const prefix = { info: "✅", warning: "⚠️", error: "❌", step: "🔄" }[level] || "ℹ️";
    console.log(`${timestamp} ${prefix} [SSH-${this.config.host}] ${message}`);
  }

  /**
   * Execute command on remote server via SSH
   */
  sshExec(command, description) {
    const sshCommand = `ssh -i ${this.config.keyPath} -o StrictHostKeyChecking=no ${this.config.username}@${this.config.host} "${command}"`;
    
    try {
      this.log(`SSH: ${description}`, "step");
      const output = execSync(sshCommand, { encoding: "utf-8" });
      this.log(`${description} - SUCCESS`, "info");
      return output;
    } catch (error) {
      this.errors.push(`${description}: ${error.message}`);
      this.log(`${description} - FAILED: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Verify SSH connection
   */
  verifyConnection() {
    this.log("Verifying SSH connection...", "step");
    try {
      const output = this.sshExec("echo 'SSH connection successful'", "Test SSH");
      if (output.includes("SSH connection successful")) {
        this.log("✅ SSH connection verified", "info");
        return true;
      }
      throw new Error("Unexpected SSH response");
    } catch (error) {
      this.log("❌ SSH connection failed", "error");
      throw error;
    }
  }

  /**
   * Deploy to remote server via SSH
   */
  async deploy() {
    try {
      this.log(`=== STARTING SSH DEPLOYMENT TO ${this.config.host} ===`, "step");

      // Verify connection
      this.verifyConnection();

      // Pull code on remote
      this.log("Pulling code on remote server...", "step");
      this.sshExec(`cd ${this.config.remoteDir} && git fetch origin`, "Fetch origin");
      this.sshExec(`cd ${this.config.remoteDir} && git reset --hard origin/${this.config.branch}`, "Reset to origin");

      // Install dependencies
      this.log("Installing dependencies...", "step");
      this.sshExec(`cd ${this.config.remoteDir} && npm ci --legacy-peer-deps`, "Install dependencies");

      // Build
      this.log("Building on remote server...", "step");
      this.sshExec(`cd ${this.config.remoteDir} && npm run build`, "Build");

      // Restart services
      this.log("Restarting services...", "step");
      this.sshExec(`PM2_HOME=/etc/.pm2 pm2 restart ${this.config.environment}-backend`, "Restart backend");
      this.sshExec(`PM2_HOME=/etc/.pm2 pm2 restart ${this.config.environment}-frontend`, "Restart frontend");

      // Verify deployment
      this.log("Verifying deployment...", "step");
      const response = this.sshExec(`curl -s -o /dev/null -w "%{http_code}" --max-time 5 ${this.config.url || `https://${this.config.host}`}`, "HTTP check");
      
      if (response.trim() === "200") {
        this.log(`=== SSH DEPLOYMENT SUCCESS ===`, "info");
        return true;
      } else {
        throw new Error(`HTTP ${response.trim()} - expected 200`);
      }

    } catch (error) {
      this.log(`❌ SSH DEPLOYMENT FAILED: ${error.message}`, "error");
      this.log("Errors encountered:", "error");
      this.errors.forEach(err => this.log(`  - ${err}`, "error"));
      return false;
    }
  }
}

if (require.main === module) {
  // Load config from command line args or env
  const config = {
    host: process.env.SSH_HOST || process.argv[2],
    username: process.env.SSH_USER || "root",
    keyPath: process.env.SSH_KEY || "~/.ssh/id_rsa",
    environment: process.env.DEPLOY_ENV || "production",
    remoteDir: process.env.REMOTE_DIR || "/var/www/app",
    branch: process.env.GIT_BRANCH || "master",
  };

  if (!config.host) {
    console.error("Usage: node ssh-deployer.js <host>");
    console.error("Or set env vars: SSH_HOST, SSH_USER, SSH_KEY, DEPLOY_ENV");
    process.exit(1);
  }

  const deployer = new SSHDeployer(config);
  deployer.deploy().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = SSHDeployer;
