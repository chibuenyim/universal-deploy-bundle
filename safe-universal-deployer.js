#!/usr/bin/env node

/**
 * 🛡️ SAFE UNIVERSAL DEPLOYER - Won't Break Sites
 *
 * KEY LESSON: Always verify PM2 process actually starts
 * This deployer includes critical checks to prevent 502 errors
 */

const { execSync } = require('child_process');

class SafeDeployer {
  constructor() {
    this.environment = process.argv[2] || 'staging';
    this.errors = [];
  }

  log(msg, level = 'info') {
    const prefix = { info: '✅', error: '❌', warning: '⚠️', step: '🔄' }[level] || 'ℹ️';
    console.log(`${prefix} [${this.environment.toUpperCase()}] ${msg}`);
  }

  async deploy() {
    try {
      // CRITICAL: Verify before changing anything
      this.log('=== SAFE DEPLOYMENT START ===', 'step');

      // Step 1: Check current status
      this.log('Step 1: Check current site status...', 'step');
      const beforeStatus = this.checkSite();
      this.log(`Current status: HTTP ${beforeStatus}`);

      // Step 2: Verify build works locally
      this.log('Step 2: Verify build locally...', 'step');
      this.verifyBuild();

      // Step 3: Deploy changes
      this.log('Step 3: Deploy changes...', 'step');
      this.deployChanges();

      // Step 4: CRITICAL - Verify PM2 starts
      this.log('Step 4: Verify PM2 process starts...', 'step');
      this.verifyPM2();

      // Step 5: Verify site responds
      this.log('Step 5: Verify site responds...', 'step');
      this.verifySite();

      this.log('=== DEPLOYMENT SUCCESS ===', 'success');

    } catch (error) {
      this.log(`Deployment failed: ${error.message}`, 'error');
      this.log('Rolling back changes...', 'warning');
      this.rollback();
      throw error;
    }
  }

  checkSite() {
    try {
      const url = this.environment === 'production'
        ? 'https://cheapestdata.com'
        : 'https://staging.cheapestdata.com';
      const result = execSync(`curl -s -o /dev/null -w "%{http_code}" ${url}`, {
        encoding: 'utf-8',
        timeout: 10000
      });
      return result.trim();
    } catch (error) {
      return '0';
    }
  }

  verifyBuild() {
    try {
      // Clean and build
      execSync('cd frontend && rm -rf .next && npm run build', {
        stdio: 'inherit',
        timeout: 300000
      });

      if (!require('fs').existsSync('frontend/.next')) {
        throw new Error('Build failed - .next not created');
      }

      this.log('Build verification passed');
    } catch (error) {
      throw new Error(`Build verification failed: ${error.message}`);
    }
  }

  deployChanges() {
    try {
      // Commit and push
      execSync('git add .', { stdio: 'inherit' });
      const status = execSync('git status --short', { encoding: 'utf-8' });

      if (status.trim()) {
        execSync(`git commit -m "deploy: Safe deployment to ${this.environment}"`, {
          stdio: 'inherit'
        });
      }

      const branch = this.environment === 'production' ? 'master' : 'staging';
      execSync(`git push origin ${branch}`, { stdio: 'inherit' });

      this.log('Changes deployed');
    } catch (error) {
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  verifyPM2() {
    // This is the CRITICAL check that was missing
    this.log('Waiting 30s for PM2 to start...');
    execSync('sleep 30', { stdio: 'inherit' });

    try {
      // Check if PM2 process is running
      const result = execSync(
        `ssh root@80.65.211.16 "PM2_HOME=/etc/.pm2 pm2 status | grep ${this.environment}-frontend"`,
        { encoding: 'utf-8' }
      );

      if (!result.includes('online')) {
        throw new Error('PM2 process not online');
      }

      this.log('PM2 verification passed');
    } catch (error) {
      throw new Error('PM2 verification failed - process did not start');
    }
  }

  verifySite() {
    const maxAttempts = 10;
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      this.log(`Checking site... attempt ${attempts}/${maxAttempts}`);

      const status = this.checkSite();

      if (status === '200') {
        this.log('Site verification passed - HTTP 200');
        return;
      }

      if (status === '502') {
        this.log('Site returning 502 - PM2 may have crashed', 'warning');
        throw new Error('Site crashed with 502 - deployment failed');
      }

      execSync('sleep 10', { stdio: 'inherit' });
    }

    throw new Error('Site verification failed - not returning 200');
  }

  rollback() {
    try {
      const branch = this.environment === 'production' ? 'master' : 'staging';
      execSync(`git reset --hard HEAD~1`, { stdio: 'inherit' });
      execSync(`git push origin ${branch} --force`, { stdio: 'inherit' });
      this.log('Rollback completed');
    } catch (error) {
      this.log('Rollback failed', 'error');
    }
  }
}

// Run deployment
(async () => {
  const deployer = new SafeDeployer();
  try {
    await deployer.deploy();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ DEPLOYMENT FAILED:', error.message);
    process.exit(1);
  }
})();
