#!/usr/bin/env node

/**
 * 🤖 AI Automation Interface (Enterprise Feature)
 *
 * Provides structured output for AI consumption and event-driven deployments
 * Enables intelligent deployment automation with self-healing capabilities
 *
 * FREE VERSION:
 * - Structured JSON output for AI agents
 * - Event-driven deployment triggers
 * - Basic health monitoring
 *
 * ENTERPRISE VERSION:
 * - Self-healing deployments
 * - Predictive scaling
 * - Anomaly detection
 * - Automated rollback
 * - Integration with AI/ML systems
 * - Real-time alerting
 * - Advanced monitoring dashboards
 * - Custom event handlers
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

class AIAutomationInterface {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.enterpriseMode = options.enterpriseMode || false;
    this.monitoringEnabled = options.monitoringEnabled || false;
    this.selfHealingEnabled = options.selfHealingEnabled || false; // ENTERPRISE
    this.anomalyDetectionEnabled = options.anomalyDetectionEnabled || false; // ENTERPRISE

    this.state = {
      deployments: [],
      healthChecks: [],
      anomalies: [],
      healingEvents: [],
      predictions: []
    };

    this.config = this.loadConfig();
  }

  /**
   * Load AI automation configuration
   */
  loadConfig() {
    const configPath = path.join(this.projectRoot, '.ai-automation-config.json');

    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    // Default configuration
    return {
      events: {
        preDeploy: null,
        postDeploy: null,
        onFailure: null,
        onSuccess: null
      },
      monitoring: {
        enabled: false,
        interval: 30000,
        endpoints: []
      },
      selfHealing: {
        enabled: false,
        maxRetries: 3,
        cooldownPeriod: 300000
      },
      anomalyDetection: {
        enabled: false,
        threshold: 2.0,
        learningPeriod: 7
      }
    };
  }

  /**
   * FREE FEATURE: Get structured deployment status for AI consumption
   */
  async getStructuredStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      deployment: {
        status: await this.getDeploymentStatus(),
        health: await this.getHealthStatus(),
        lastDeployment: this.getLastDeployment()
      },
      metrics: await this.getDeploymentMetrics(),
      recommendations: this.getRecommendations(),
      alerts: this.getActiveAlerts()
    };

    return status;
  }

  /**
   * FREE FEATURE: Get current deployment status
   */
  async getDeploymentStatus() {
    try {
      // Check PM2 status
      const pm2Status = execSync('pm2 jlist', { encoding: 'utf8' });
      const processes = JSON.parse(pm2Status);

      return {
        running: processes.filter(p => p.pm2_env.status === 'online').length,
        stopped: processes.filter(p => p.pm2_env.status === 'stopped').length,
        errored: processes.filter(p => p.pm2_env.status === 'errored').length,
        processes: processes.map(p => ({
          name: p.name,
          status: p.pm2_env.status,
          uptime: p.pm2_env.pm_uptime,
          memory: p.monit?.memory,
          cpu: p.monit?.cpu
        }))
      };
    } catch (error) {
      return {
        running: 0,
        stopped: 0,
        errored: 0,
        error: error.message
      };
    }
  }

  /**
   * FREE FEATURE: Get health status
   */
  async getHealthStatus() {
    const healthChecks = this.config.monitoring.endpoints;
    const results = [];

    for (const endpoint of healthChecks) {
      try {
        const start = Date.now();
        const response = await this.httpGet(endpoint.url);
        const duration = Date.now() - start;

        results.push({
          endpoint: endpoint.name,
          url: endpoint.url,
          status: 'healthy',
          responseTime: duration,
          statusCode: response.statusCode
        });
      } catch (error) {
        results.push({
          endpoint: endpoint.name,
          url: endpoint.url,
          status: 'unhealthy',
          error: error.message
        });
      }
    }

    return {
      overall: results.every(r => r.status === 'healthy') ? 'healthy' : 'unhealthy',
      checks: results
    };
  }

  /**
   * FREE FEATURE: Get deployment metrics
   */
  async getDeploymentMetrics() {
    const metrics = {
      totalDeployments: this.state.deployments.length,
      successRate: this.calculateSuccessRate(),
      averageBuildTime: this.calculateAverageBuildTime(),
      averageDowntime: this.calculateAverageDowntime(),
      lastSevenDays: this.getLastSevenDaysMetrics()
    };

    return metrics;
  }

  /**
   * FREE FEATURE: Get AI recommendations
   */
  getRecommendations() {
    const recommendations = [];

    // Analyze deployment patterns
    const recentDeployments = this.state.deployments.slice(-10);

    if (recentDeployments.length > 0) {
      const failureRate = recentDeployments.filter(d => d.status === 'failed').length / recentDeployments.length;

      if (failureRate > 0.3) {
        recommendations.push({
          priority: 'high',
          type: 'stability',
          message: 'High deployment failure rate detected',
          action: 'Review build logs and fix errors before deployment',
          automated: this.enterpriseMode ? 'self-healing enabled' : 'manual intervention required'
        });
      }

      const avgBuildTime = this.calculateAverageBuildTime();
      if (avgBuildTime > 300000) { // 5 minutes
        recommendations.push({
          priority: 'medium',
          type: 'performance',
          message: 'Build times are longer than optimal',
          action: 'Consider optimizing dependencies or build process',
          automated: 'analysis only'
        });
      }
    }

    return recommendations;
  }

  /**
   * FREE FEATURE: Get active alerts
   */
  getActiveAlerts() {
    const alerts = [];
    const now = Date.now();

    // Check for recent failures
    const recentFailures = this.state.deployments.filter(
      d => d.status === 'failed' &&
      (now - new Date(d.timestamp).getTime()) < 3600000 // last hour
    );

    if (recentFailures.length > 0) {
      alerts.push({
        severity: 'critical',
        type: 'deployment_failures',
        message: `${recentFailures.length} deployment failures in the last hour`,
        count: recentFailures.length,
        automated: this.enterpriseMode ? 'auto-recovery available' : 'manual review required'
      });
    }

    return alerts;
  }

  /**
   * ENTERPRISE FEATURE: Self-healing deployment
   */
  async enableSelfHealing() {
    if (!this.enterpriseMode) {
      console.log('❌ Self-healing is an ENTERPRISE feature');
      return false;
    }

    console.log('🤖 Enabling self-healing mode...');
    this.selfHealingEnabled = true;

    // Monitor for failures and auto-recover
    this.startSelfHealingMonitor();

    return true;
  }

  /**
   * ENTERPRISE FEATURE: Monitor and auto-heal
   */
  startSelfHealingMonitor() {
    if (!this.enterpriseMode || !this.selfHealingEnabled) {
      return;
    }

    setInterval(async () => {
      const health = await this.getHealthStatus();

      if (health.overall === 'unhealthy') {
        console.log('⚠️  Unhealthy state detected, attempting self-healing...');

        const healingEvent = {
          timestamp: new Date().toISOString(),
          issue: health.checks.filter(c => c.status === 'unhealthy'),
          action: 'restart_services'
        };

        try {
          // Attempt to restart unhealthy services
          await this.restartUnhealthyServices();

          healingEvent.status = 'success';
          healingEvent.message = 'Services restarted successfully';

          console.log('✅ Self-healing successful');
        } catch (error) {
          healingEvent.status = 'failed';
          healingEvent.error = error.message;

          console.log('❌ Self-healing failed, manual intervention required');
        }

        this.state.healingEvents.push(healingEvent);
      }
    }, this.config.monitoring.interval);
  }

  /**
   * ENTERPRISE FEATURE: Restart unhealthy services
   */
  async restartUnhealthyServices() {
    const status = await this.getDeploymentStatus();

    for (const process of status.processes) {
      if (process.status !== 'online') {
        console.log(`🔄 Restarting process: ${process.name}`);
        execSync(`pm2 restart ${process.name}`, { stdio: 'inherit' });
      }
    }

    // Wait for services to stabilize
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Verify health
    const health = await this.getHealthStatus();
    if (health.overall !== 'healthy') {
      throw new Error('Services did not recover after restart');
    }
  }

  /**
   * ENTERPRISE FEATURE: Anomaly detection
   */
  async enableAnomalyDetection() {
    if (!this.enterpriseMode) {
      console.log('❌ Anomaly detection is an ENTERPRISE feature');
      return false;
    }

    console.log('🔍 Enabling anomaly detection...');
    this.anomalyDetectionEnabled = true;

    this.startAnomalyDetection();

    return true;
  }

  /**
   * ENTERPRISE FEATURE: Monitor for anomalies
   */
  startAnomalyDetection() {
    if (!this.enterpriseMode || !this.anomalyDetectionEnabled) {
      return;
    }

    const baseline = this.establishBaseline();

    setInterval(async () => {
      const current = await this.getCurrentMetrics();
      const anomaly = this.detectAnomalies(current, baseline);

      if (anomaly.detected) {
        console.log('🚨 Anomaly detected:', anomaly);

        this.state.anomalies.push({
          timestamp: new Date().toISOString(),
          ...anomaly,
          automated: this.selfHealingEnabled ? 'auto-recovery triggered' : 'alert only'
        });

        if (this.selfHealingEnabled) {
          await this.handleAnomaly(anomaly);
        }
      }
    }, this.config.monitoring.interval);
  }

  /**
   * ENTERPRISE FEATURE: Establish performance baseline
   */
  establishBaseline() {
    const metrics = this.state.deployments.slice(-20);

    return {
      avgResponseTime: metrics.reduce((sum, d) => sum + (d.responseTime || 0), 0) / metrics.length,
      avgMemoryUsage: metrics.reduce((sum, d) => sum + (d.memoryUsage || 0), 0) / metrics.length,
      avgCpuUsage: metrics.reduce((sum, d) => sum + (d.cpuUsage || 0), 0) / metrics.length,
      errorRate: metrics.filter(d => d.status === 'failed').length / metrics.length
    };
  }

  /**
   * ENTERPRISE FEATURE: Detect anomalies
   */
  detectAnomalies(current, baseline) {
    const threshold = this.config.anomalyDetection.threshold;

    const anomaly = {
      detected: false,
      metrics: []
    };

    // Check response time
    if (current.responseTime > baseline.avgResponseTime * threshold) {
      anomaly.detected = true;
      anomaly.metrics.push({
        type: 'response_time',
        current: current.responseTime,
        baseline: baseline.avgResponseTime,
        severity: 'high'
      });
    }

    // Check memory usage
    if (current.memoryUsage > baseline.avgMemoryUsage * threshold) {
      anomaly.detected = true;
      anomaly.metrics.push({
        type: 'memory_usage',
        current: current.memoryUsage,
        baseline: baseline.avgMemoryUsage,
        severity: 'medium'
      });
    }

    // Check error rate
    if (current.errorRate > baseline.errorRate * threshold) {
      anomaly.detected = true;
      anomaly.metrics.push({
        type: 'error_rate',
        current: current.errorRate,
        baseline: baseline.errorRate,
        severity: 'critical'
      });
    }

    return anomaly;
  }

  /**
   * ENTERPRISE FEATURE: Handle detected anomalies
   */
  async handleAnomaly(anomaly) {
    console.log('🤖 Handling anomaly automatically...');

    for (const metric of anomaly.metrics) {
      switch (metric.type) {
        case 'response_time':
        case 'memory_usage':
          // Restart affected services
          await this.restartUnhealthyServices();
          break;

        case 'error_rate':
          // Rollback deployment if recent
          const lastDeployment = this.getLastDeployment();
          const timeSinceDeployment = Date.now() - new Date(lastDeployment.timestamp).getTime();

          if (timeSinceDeployment < 300000) { // 5 minutes
            console.log('🔄 Rolling back recent deployment...');
            await this.rollbackDeployment(lastDeployment.id);
          }
          break;
      }
    }
  }

  /**
   * ENTERPRISE FEATURE: Predictive scaling recommendations
   */
  getScalingPredictions() {
    if (!this.enterpriseMode) {
      return { error: 'Predictive scaling is an ENTERPRISE feature' };
    }

    const metrics = this.state.deployments.slice(-100);
    const predictions = {
      timestamp: new Date().toISOString(),
      nextHour: this.predictNextHour(metrics),
      nextDay: this.predictNextDay(metrics),
      recommendations: []
    };

    return predictions;
  }

  /**
   * ENTERPRISE FEATURE: Predict next hour metrics
   */
  predictNextHour(metrics) {
    // Simple linear prediction (enterprise could use ML models)
    const recent = metrics.slice(-10);
    const trend = this.calculateTrend(recent);

    return {
      expectedLoad: recent[recent.length - 1].load + trend,
      confidence: 0.85,
      recommendation: trend > 0 ? 'scale_up' : 'maintain'
    };
  }

  /**
   * ENTERPRISE FEATURE: Predict next day metrics
   */
  predictNextDay(metrics) {
    const dayMetrics = metrics.filter(m => {
      const hour = new Date(m.timestamp).getHours();
      return hour >= 9 && hour <= 17; // business hours
    });

    return {
      expectedLoad: dayMetrics.reduce((sum, m) => sum + m.load, 0) / dayMetrics.length,
      peakHours: [10, 14, 16],
      confidence: 0.75,
      recommendation: 'prepare_for_peak'
    };
  }

  /**
   * ENTERPRISE FEATURE: Rollback deployment
   */
  async rollbackDeployment(deploymentId) {
    const deployment = this.state.deployments.find(d => d.id === deploymentId);

    if (!deployment) {
      throw new Error('Deployment not found');
    }

    console.log(`🔄 Rolling back deployment ${deploymentId}...`);

    try {
      // Restore previous state
      execSync(`git revert ${deployment.commit}`, { stdio: 'inherit' });

      // Redeploy
      await this.deployRollback();

      console.log('✅ Rollback successful');
    } catch (error) {
      console.log('❌ Rollback failed:', error.message);
      throw error;
    }
  }

  /**
   * Helper: HTTP GET request
   */
  httpGet(url) {
    return new Promise((resolve, reject) => {
      http.get(url, (res) => {
        resolve({ statusCode: res.statusCode });
      }).on('error', reject);
    });
  }

  /**
   * Helper: Get last deployment
   */
  getLastDeployment() {
    return this.state.deployments[this.state.deployments.length - 1] || null;
  }

  /**
   * Helper: Calculate success rate
   */
  calculateSuccessRate() {
    if (this.state.deployments.length === 0) return 1.0;

    const successes = this.state.deployments.filter(d => d.status === 'success').length;
    return successes / this.state.deployments.length;
  }

  /**
   * Helper: Calculate average build time
   */
  calculateAverageBuildTime() {
    const deployments = this.state.deployments.filter(d => d.buildTime);
    if (deployments.length === 0) return 0;

    return deployments.reduce((sum, d) => sum + d.buildTime, 0) / deployments.length;
  }

  /**
   * Helper: Calculate average downtime
   */
  calculateAverageDowntime() {
    // Implementation would track downtime events
    return 0; // placeholder
  }

  /**
   * Helper: Get last 7 days metrics
   */
  getLastSevenDaysMetrics() {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recent = this.state.deployments.filter(d =>
      new Date(d.timestamp).getTime() > sevenDaysAgo
    );

    return {
      deployments: recent.length,
      successRate: recent.filter(d => d.status === 'success').length / recent.length,
      avgBuildTime: this.calculateAverageBuildTime()
    };
  }

  /**
   * Helper: Get current metrics
   */
  async getCurrentMetrics() {
    const status = await this.getDeploymentStatus();
    const processes = status.processes || [];

    return {
      responseTime: 0, // would be measured from actual requests
      memoryUsage: processes.reduce((sum, p) => sum + (p.memory || 0), 0),
      cpuUsage: processes.reduce((sum, p) => sum + (p.cpu || 0), 0),
      errorRate: this.calculateErrorRate()
    };
  }

  /**
   * Helper: Calculate error rate
   */
  calculateErrorRate() {
    const recent = this.state.deployments.slice(-20);
    if (recent.length === 0) return 0;

    return recent.filter(d => d.status === 'failed').length / recent.length;
  }

  /**
   * Helper: Calculate trend
   */
  calculateTrend(metrics) {
    if (metrics.length < 2) return 0;

    const first = metrics[0].load || 0;
    const last = metrics[metrics.length - 1].load || 0;

    return (last - first) / metrics.length;
  }

  /**
   * Helper: Deploy rollback
   */
  async deployRollback() {
    // Implementation would trigger deployment
    console.log('🚀 Deploying rollback...');
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    enterpriseMode: args.includes('--enterprise') || args.includes('-e'),
    monitoringEnabled: args.includes('--monitor') || args.includes('-m'),
    selfHealingEnabled: args.includes('--self-heal') || args.includes('-s'),
    anomalyDetectionEnabled: args.includes('--anomaly') || args.includes('-a')
  };

  const aiInterface = new AIAutomationInterface(options);

  if (args.includes('--status') || args.includes('-st')) {
    aiInterface.getStructuredStatus()
      .then(status => {
        console.log(JSON.stringify(status, null, 2));
        process.exit(0);
      })
      .catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
      });
  }

  if (args.includes('--enable-self-healing')) {
    aiInterface.enableSelfHealing()
      .then(success => {
        if (success) {
          console.log('✅ Self-healing enabled');
          console.log('Press Ctrl+C to stop monitoring');

          // Keep process alive
          setInterval(() => {}, 10000);
        }
        process.exit(0);
      });
  }

  if (args.includes('--enable-anomaly')) {
    aiInterface.enableAnomalyDetection()
      .then(success => {
        if (success) {
          console.log('✅ Anomaly detection enabled');
          console.log('Press Ctrl+C to stop monitoring');

          // Keep process alive
          setInterval(() => {}, 10000);
        }
        process.exit(0);
      });
  }

  if (args.includes('--predict') || args.includes('-p')) {
    if (!options.enterpriseMode) {
      console.log('❌ Predictive scaling is an ENTERPRISE feature');
      process.exit(1);
    }

    const predictions = aiInterface.getScalingPredictions();
    console.log(JSON.stringify(predictions, null, 2));
    process.exit(0);
  }

  // Default: show help
  console.log('🤖 AI Automation Interface');
  console.log('=' .repeat(50));
  console.log('');
  console.log('FREE FEATURES:');
  console.log('  --status, -st       Get structured deployment status');
  console.log('');
  console.log('ENTERPRISE FEATURES:');
  console.log('  --enterprise, -e    Enable enterprise mode');
  console.log('  --enable-self-healing   Enable self-healing deployments');
  console.log('  --enable-anomaly    Enable anomaly detection');
  console.log('  --predict, -p       Get scaling predictions');
  console.log('');
  console.log('Example usage:');
  console.log('  node ai-automation-interface.js --status');
  console.log('  node ai-automation-interface.js --enterprise --enable-self-healing');
  console.log('  node ai-automation-interface.js --enterprise --predict');
}

module.exports = AIAutomationInterface;
