#!/usr/bin/env node

/**
 * DEPLOYMENT VERIFIER
 *
 * Automated verification that deployments are successful and working
 * Can be integrated into any deployment pipeline
 *
 * Usage:
 *   node deployment-verifier.js <url> [options]
 *
 * Options:
 *   --quick              Run quick checks only (default: full)
 *   --auth <email:pass> Test authenticated endpoints
 *   --output <file>     Save results to JSON file
 *   --timeout <ms>      Request timeout (default: 30000)
 *   --fail-on-error     Exit with error code on verification failure
 *
 * Examples:
 *   node deployment-verifier.js https://staging.example.com
 *   node deployment-verifier.js https://example.com --quick
 *   node deployment-verifier.js https://api.example.com --auth user:pass
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

class DeploymentVerifier {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.options = {
      quick: options.quick || false,
      auth: options.auth || null,
      output: options.output || null,
      timeout: options.timeout || 30000,
      failOnError: options.failOnError || false,
      verbose: options.verbose || false
    };

    const environment = this.detectEnvironment(baseUrl);
    this.results = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      environment: environment,
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      },
      checks: []
    };

    this.authCookie = null;
  }

  detectEnvironment(url) {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('staging')) return 'staging';
    if (lowerUrl.includes('dev') || lowerUrl.includes('localhost')) return 'development';
    if (lowerUrl.includes('prod') || lowerUrl.includes('prod')) return 'production';
    return 'unknown';
  }

  log(message, level = 'info') {
    const prefix = {
      info: '✅',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      skip: '⏭️',
      test: '🧪',
      result: '📊'
    }[level] || 'ℹ️';

    console.log(`${prefix} ${message}`);
  }

  async makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: {
          'User-Agent': 'Deployment-Verifier/1.0',
          'Accept': 'application/json',
        },
        timeout: this.options.timeout
      };

      if (this.authCookie) {
        options.headers['Cookie'] = `accessToken=${this.authCookie}`;
      }

      if (data) {
        options.headers['Content-Type'] = 'application/json';
        options.headers['Content-Length'] = Buffer.byteLength(data);
      }

      const req = client.request(options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          try {
            const jsonData = body ? JSON.parse(body) : null;
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: jsonData
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: body
            });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data) {
        req.write(data);
      }

      req.end();
    });
  }

  async performLogin() {
    if (!this.options.auth) {
      this.log('No auth credentials provided, skipping authenticated checks', 'skip');
      return false;
    }

    const [email, password] = this.options.auth.split(':');

    try {
      this.log(`Testing login: ${email}`, 'test');

      const response = await this.makeRequest('/api/auth/login', 'POST', JSON.stringify({
        email,
        password
      }));

      if (response.statusCode === 200 && response.body?.accessToken) {
        this.authCookie = response.body.accessToken;
        this.log('Login successful', 'success');
        return true;
      } else {
        this.log(`Login failed: ${response.statusCode}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`Login error: ${error.message}`, 'error');
      return false;
    }
  }

  async checkEndpoint(name, path, expectedStatus = 200, options = {}) {
    const startTime = Date.now();
    this.results.summary.total++;

    const check = {
      name,
      path,
      expectedStatus,
      result: 'pending',
      statusCode: null,
      responseTime: null,
      error: null
    };

    try {
      const response = await this.makeRequest(path, options.method || 'GET', options.data);

      check.statusCode = response.statusCode;
      check.responseTime = Date.now() - startTime;

      const statusMatch = response.statusCode === expectedStatus ||
                         (options.allowRange && response.statusCode >= expectedStatus && response.statusCode < expectedStatus + 100);

      if (statusMatch) {
        check.result = 'pass';
        this.results.summary.passed++;
        this.log(`${name}: ${response.statusCode} (${check.responseTime}ms)`, 'success');
      } else {
        check.result = 'fail';
        this.results.summary.failed++;
        this.log(`${name}: Expected ${expectedStatus}, got ${response.statusCode}`, 'error');
      }

      // Check for critical errors in response
      if (response.body && typeof response.body === 'object') {
        if (response.body.statusCode >= 500) {
          check.result = 'fail';
          this.results.summary.failed++;
          check.error = response.body.message || 'Server error';
        }
      }

    } catch (error) {
      check.result = 'fail';
      check.error = error.message;
      this.results.summary.failed++;
      this.log(`${name}: ${error.message}`, 'error');
    }

    this.results.checks.push(check);
    return check.result === 'pass';
  }

  async runQuickChecks() {
    this.log('Running quick deployment checks...', 'test');
    this.log('');

    // 1. Homepage
    await this.checkEndpoint('Homepage', '/', 200);

    // 2. Health endpoint
    await this.checkEndpoint('Health Check', '/api/health', 200);

    // 3. Auth status
    await this.checkEndpoint('Auth Status', '/api/auth/status', 200);

    // 4. Public API endpoint
    await this.checkEndpoint('Public Stats', '/api/marketplace/public/stats', 200);
  }

  async runFullChecks() {
    this.log('Running full deployment verification...', 'test');
    this.log('');

    await this.runQuickChecks();

    // Test authenticated endpoints if credentials provided
    if (this.options.auth && await this.performLogin()) {
      this.log('');
      this.log('Testing authenticated endpoints...', 'test');

      await this.checkEndpoint('User Profile', '/api/users/me', 200);
      await this.checkEndpoint('Wallet Balance', '/api/wallet/balance', 200);
      await this.checkEndpoint('Transactions', '/api/transactions?limit=10', 200);
    }

    // Test critical pages
    this.log('');
    this.log('Testing critical pages...', 'test');

    const pages = [
      'Services',
      'Marketplace',
      'FAQ',
      'Blog'
    ];

    for (const page of pages) {
      await this.checkEndpoint(page, `/${page.toLowerCase().replace(' ', '-')}`, 200, { allowRange: true });
    }
  }

  async run() {
    this.log('');
    this.log('═══════════════════════════════════════════════════════', 'result');
    this.log(`📊 DEPLOYMENT VERIFIER - ${this.results.environment.toUpperCase()}`, 'result');
    this.log(`🌐 Target: ${this.baseUrl}`, 'result');
    this.log(`⏰ Started: ${this.results.timestamp}`, 'result');
    this.log('═══════════════════════════════════════════════════════', 'result');
    this.log('');

    const startTime = Date.now();

    try {
      if (this.options.quick) {
        await this.runQuickChecks();
      } else {
        await this.runFullChecks();
      }
    } catch (error) {
      this.log(`Fatal error: ${error.message}`, 'error');
    }

    const duration = Date.now() - startTime;

    // Print summary
    this.log('');
    this.log('═══════════════════════════════════════════════════════', 'result');
    this.log('📊 VERIFICATION SUMMARY', 'result');
    this.log('═══════════════════════════════════════════════════════', 'result');
    this.log('');
    this.log(`Total Checks: ${this.results.summary.total}`);
    this.log(`Passed: ${this.results.summary.passed}`);
    this.log(`Failed: ${this.results.summary.failed}`);
    this.log(`Skipped: ${this.results.summary.skipped}`);
    this.log(`Duration: ${duration}ms`);
    this.log('');

    const successRate = this.results.summary.total > 0
      ? ((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1)
      : 0;

    this.log(`Success Rate: ${successRate}%`);
    this.log('');

    const passed = this.results.summary.failed === 0;

    if (passed) {
      this.log('✅✅✅ DEPLOYMENT VERIFIED: ALL CHECKS PASSED ✅✅✅', 'success');
      this.log('');
      this.log('The deployment is successful and working correctly.', 'success');
    } else {
      this.log('❌❌❌ DEPLOYMENT VERIFICATION FAILED ❌❌❌', 'error');
      this.log('');
      this.log('Some checks failed. Please review the details above.', 'error');
    }

    this.log('');
    this.log('═══════════════════════════════════════════════════════', 'result');
    this.log('');

    // Save results if output file specified
    if (this.options.output) {
      const fs = require('fs');
      this.results.duration = duration;
      this.results.successRate = parseFloat(successRate);
      this.results.overall = passed ? 'PASS' : 'FAIL';
      fs.writeFileSync(this.options.output, JSON.stringify(this.results, null, 2));
      this.log(`Results saved to: ${this.options.output}`);
    }

    // Exit with appropriate code
    if (this.options.failOnError && !passed) {
      process.exit(1);
    }

    return passed;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const baseUrl = args[0];

  if (!baseUrl) {
    console.error('Usage: node deployment-verifier.js <url> [options]');
    console.error('');
    console.error('Examples:');
    console.error('  node deployment-verifier.js https://staging.example.com');
    console.error('  node deployment-verifier.js https://example.com --quick');
    console.error('  node deployment-verifier.js https://api.example.com --auth user:pass --output results.json');
    process.exit(1);
  }

  const options = {
    quick: args.includes('--quick'),
    auth: process.env.DEPLOY_VERIFIER_AUTH || null,
    output: null,
    timeout: 30000,
    failOnError: args.includes('--fail-on-error')
  };

  // Parse additional options
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--auth' && args[i + 1]) {
      options.auth = args[i + 1];
      i++;
    }
    if (args[i] === '--output' && args[i + 1]) {
      options.output = args[i + 1];
      i++;
    }
    if (args[i] === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[i + 1]);
      i++;
    }
  }

  const verifier = new DeploymentVerifier(baseUrl, options);
  verifier.run().then(passed => {
    process.exit(passed ? 0 : 1);
  });
}

module.exports = DeploymentVerifier;
