#!/usr/bin/env node

/**
 * REMOTE MONITORING & ERROR CATCHING
 *
 * Real-time monitoring of remote deployments:
 * - Watch remote servers via SSH
 * - Catch errors instantly
 * - Real-time log streaming
 * - Health checks
 * - Auto-alert on failures
 */

const { execSync } = require("child_process");

class RemoteMonitor {
  constructor(config) {
    this.config = {
      hosts: config.hosts || [],
      checkInterval: config.checkInterval || 30000, // 30 seconds
      alertThreshold: config.alertThreshold || 3, // alerts after 3 failures
      ...config
    };
    this.failures = {};
    this.alerts = [];
  }

  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const prefix = { info: "✅", warning: "⚠️", error: "❌", step: "🔄" }[level] || "ℹ️";
    console.log(`${timestamp} ${prefix} [REMOTE-MONITOR] ${message}`);
  }

  /**
   * Execute command on remote host via SSH
   */
  sshExec(host, command, description) {
    const sshCmd = `ssh -o StrictHostKeyChecking=no ${host} "${command}"`;
    
    try {
      this.log(`SSH ${host}: ${description}`, "step");
      const output = execSync(sshCmd, { encoding: "utf-8", timeout: 10000 });
      this.log(`${host}: ${description} - SUCCESS`, "info");
      return output;
    } catch (error) {
      this.log(`${host}: ${description} - FAILED`, "error");
      throw error;
    }
  }

  /**
   * Check health of remote host
   */
  checkHealth(host) {
    try {
      // Check if host is reachable
      const ping = execSync(`ping -c 1 -W 2 ${host} 2>&1 | grep "1 received"`, { encoding: "utf-8" });
      
      // Check HTTP response
      const url = `http://${host}`;
      const http = execSync(`curl -s -o /dev/null -w "%{http_code}" --max-time 5 ${url}`, { encoding: "utf-8" }).trim();
      
      if (http === "200") {
        this.log(`${host}: Healthy (HTTP 200)`, "info");
        this.failures[host] = 0; // Reset failure count
        return true;
      } else {
        this.log(`${host}: Unhealthy (HTTP ${http})`, "warning");
        this.incrementFailure(host);
        return false;
      }
    } catch (error) {
      this.log(`${host}: Unreachable`, "error");
      this.incrementFailure(host);
      return false;
    }
  }

  /**
   * Increment failure count and alert
   */
  incrementFailure(host) {
    this.failures[host] = (this.failures[host] || 0) + 1;
    
    if (this.failures[host] >= this.config.alertThreshold) {
      this.alert(host, `${this.failures[host]} consecutive failures`);
    }
  }

  /**
   * Send alert
   */
  alert(host, message) {
    const alert = {
      host,
      message,
      timestamp: new Date().toISOString(),
      severity: "critical"
    };
    
    this.alerts.push(alert);
    this.log(`🚨 ALERT: ${host} - ${message}`, "error");
    
    // Send to monitoring service (Slack, Discord, etc.)
    // Implementation depends on user's monitoring setup
  }

  /**
   * Stream logs from remote host
   */
  streamLogs(host, lines = 50) {
    try {
      const logs = this.sshExec(host, `tail -${lines} /var/log/pm2/*/error.log`, "Fetch error logs");
      this.log(`${host} error logs:`, "error");
      console.log(logs);
    } catch (error) {
      this.log(`Could not fetch logs from ${host}`, "warning");
    }
  }

  /**
   * Check PM2 status on remote host
   */
  checkPM2Status(host) {
    try {
      const status = this.sshExec(host, `PM2_HOME=/etc/.pm2 pm2 jlist`, "Get PM2 status");
      const processes = JSON.parse(status);
      
      processes.forEach(proc => {
        if (proc.pm2_env.status !== "online") {
          this.log(`${host}: ${proc.name} is ${proc.pm2_env.status}`, "error");
          this.alert(host, `Process ${proc.name} is ${proc.pm2_env.status}`);
        }
      });
      
      this.log(`${host}: All ${processes.length} PM2 processes online`, "info");
      return processes;
    } catch (error) {
      this.log(`${host}: PM2 check failed`, "error");
      return [];
    }
  }

  /**
   * Monitor all hosts continuously
   */
  async monitor() {
    this.log(`=== REMOTE MONITORING STARTED ===`, "step");
    this.log(`Monitoring ${this.config.hosts.length} hosts`, "info");
    this.log(`Check interval: ${this.config.checkInterval}ms`, "info");

    for (const host of this.config.hosts) {
      this.log(`Checking ${host}...`, "step");
      
      // Health check
      this.checkHealth(host);
      
      // PM2 status
      this.checkPM2Status(host);
      
      // Get logs if failing
      if (this.failures[host] > 0) {
        this.streamLogs(host, 20);
      }
    }

    this.log(`=== MONITORING CYCLE COMPLETE ===`, "info");
    this.log(`Active alerts: ${this.alerts.length}`, "info");
    
    // In production, this would run continuously
    // For now, just run once
  }
}

if (require.main === module) {
  const monitor = new RemoteMonitor({
    hosts: process.env.MONITOR_HOSTS?.split(",") || ["localhost"],
    checkInterval: parseInt(process.env.CHECK_INTERVAL) || 30000,
    alertThreshold: parseInt(process.env.ALERT_THRESHOLD) || 3,
  });

  monitor.monitor().catch(error => {
    console.error("Monitoring failed:", error);
    process.exit(1);
  });
}

module.exports = RemoteMonitor;
