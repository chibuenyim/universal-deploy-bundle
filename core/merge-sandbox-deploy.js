#!/usr/bin/env node

/**
 * MERGE-SANBOX DEPLOYMENT SYSTEM
 *
 * Safe deployment workflow:
 * 1. Deploy to sandbox for testing
 * 2. Run verification
 * 3. If passes, merge to production
 * 4. Deploy to production
 * 5. Run production verification
 * 6. Auto-rollback on failure
 *
 * Usage:
 *   node merge-sandbox-deploy.js [branch-name] [options]
 *
 * Options:
 *   --skip-sandbox    Skip sandbox testing (DANGEROUS!)
 *   --skip-verify     Skip verification (DANGEROUS!)
 *   --auto-merge      Auto-merge to master on pass
 *   --rollback        Immediately rollback production
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class MergeSandboxDeployer {
  constructor(branch, options = {}) {
    this.branch = branch;
    this.options = {
      skipSandbox: options.skipSandbox || false,
      skipVerify: options.skipVerify || false,
      autoMerge: options.autoMerge || false,
      rollback: options.rollback || false,
      sandboxUrl: options.sandboxUrl || 'https://sandbox.example.com',
      productionUrl: options.productionUrl || 'https://example.com'
    };

    this.results = {
      timestamp: new Date().toISOString(),
      branch: branch,
      steps: []
    };

    this.originalBranch = this.getCurrentBranch();
  }

  log(message, level = 'info') {
    const prefix = {
      info: '✅',
      warning: '⚠️',
      error: '❌',
      step: '🔄',
      success: '🎉',
      sandbox: '🏖️',
      production: '🚀',
      rollback: '⏪'
    }[level] || 'ℹ️';

    console.log(`${prefix} ${message}`);
  }

  getCurrentBranch() {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
      return 'unknown';
    }
  }

  recordStep(step, status, details = {}) {
    this.results.steps.push({
      step,
      status,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  async runCommand(command, description) {
    this.log(`Executing: ${description}`, 'step');
    try {
      const result = execSync(command, {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      this.recordStep(description, 'success', { output: result.substring(0, 200) });
      this.log(`✓ ${description} completed`, 'success');
      return true;
    } catch (error) {
      this.recordStep(description, 'failed', { error: error.message });
      this.log(`✗ ${description} failed: ${error.message}`, 'error');
      return false;
    }
  }

  async checkoutBranch() {
    this.log(`Checking out branch: ${this.branch}`, 'step');
    try {
      execSync(`git checkout -b ${this.branch}`, { stdio: 'pipe' });
      this.recordStep(`checkout ${this.branch}`, 'success');
      this.log(`✓ Created/checked out branch: ${this.branch}`, 'success');
      return true;
    } catch (error) {
      // Branch might already exist, try to checkout
      try {
        execSync(`git checkout ${this.branch}`, { stdio: 'pipe' });
        this.recordStep(`checkout ${this.branch}`, 'success');
        this.log(`✓ Checked out existing branch: ${this.branch}`, 'success');
        return true;
      } catch (error2) {
        this.recordStep(`checkout ${this.branch}`, 'failed', { error: error2.message });
        this.log(`✗ Failed to checkout branch: ${error2.message}`, 'error');
        return false;
      }
    }
  }

  async deployToSandbox() {
    if (this.options.skipSandbox) {
      this.log('⚠️ SKIPPING SANDBOX DEPLOYMENT (DANGEROUS!)', 'warning');
      this.recordStep('sandbox deploy', 'skipped', { warning: 'Skipped by user request' });
      return true;
    }

    this.log('Deploying to sandbox environment...', 'sandbox');

    // Use the intelligent deployer for sandbox
    const success = await this.runCommand(
      'cd deployment-agent && node intelligent-deployer-universal.js sandbox',
      'Deploy to sandbox'
    );

    if (success) {
      this.log('✅ Sandbox deployment successful', 'success');

      // Wait for deployment to stabilize
      this.log('Waiting 10 seconds for sandbox to stabilize...', 'step');
      await new Promise(resolve => setTimeout(resolve, 10000));

      return true;
    } else {
      this.log('❌ Sandbox deployment failed', 'error');
      return false;
    }
  }

  async verifySandbox() {
    if (this.options.skipVerify) {
      this.log('⚠️ SKIPPING SANDBOX VERIFICATION (DANGEROUS!)', 'warning');
      this.recordStep('sandbox verify', 'skipped', { warning: 'Skipped by user request' });
      return true;
    }

    this.log('Verifying sandbox deployment...', 'sandbox');

    // Run deployment verifier
    const success = await this.runCommand(
      `cd deployment-agent && node deployment-verifier.js ${this.options.sandboxUrl} --quick`,
      'Verify sandbox deployment'
    );

    if (success) {
      this.log('✅ Sandbox verification passed', 'success');
      return true;
    } else {
      this.log('❌ Sandbox verification failed', 'error');
      return false;
    }
  }

  async mergeToProduction() {
    if (!this.options.autoMerge) {
      this.log('Auto-merge disabled, stopping at sandbox verification', 'info');
      this.recordStep('auto-merge', 'skipped', { reason: 'Not enabled' });
      return true;
    }

    this.log('Merging to production (master)...', 'step');

    try {
      // Switch to master
      execSync('git checkout master', { stdio: 'pipe' });

      // Merge the branch
      execSync(`git merge ${this.branch} --no-edit`, { stdio: 'pipe' });

      this.recordStep('merge to master', 'success');
      this.log(`✅ Merged ${this.branch} to master`, 'success');

      return true;
    } catch (error) {
      this.recordStep('merge to master', 'failed', { error: error.message });
      this.log(`✗ Merge failed: ${error.message}`, 'error');

      // Attempt to revert
      try {
        execSync('git merge --abort', { stdio: 'pipe' });
        this.log('⏪ Merge aborted, reverted to clean state', 'rollback');
      } catch (e) {
        // Ignore abort errors
      }

      return false;
    }
  }

  async deployToProduction() {
    this.log('Deploying to production...', 'production');

    const success = await this.runCommand(
      'cd deployment-agent && node intelligent-deployer-universal.js production',
      'Deploy to production'
    );

    if (success) {
      this.log('✅ Production deployment successful', 'success');

      // Wait for deployment to stabilize
      this.log('Waiting 15 seconds for production to stabilize...', 'step');
      await new Promise(resolve => setTimeout(resolve, 15000));

      return true;
    } else {
      this.log('❌ Production deployment failed', 'error');
      return false;
    }
  }

  async verifyProduction() {
    if (this.options.skipVerify) {
      this.log('⚠️ SKIPPING PRODUCTION VERIFICATION (DANGEROUS!)', 'warning');
      this.recordStep('production verify', 'skipped', { warning: 'Skipped by user request' });
      return true;
    }

    this.log('Verifying production deployment...', 'production');

    const success = await this.runCommand(
      `cd deployment-agent && node deployment-verifier.js ${this.options.productionUrl} --quick --fail-on-error`,
      'Verify production deployment'
    );

    if (success) {
      this.log('✅ Production verification passed', 'success');
      return true;
    } else {
      this.log('❌ Production verification failed', 'error');
      return false;
    }
  }

  async rollbackProduction() {
    this.log('🚨 ROLLING BACK PRODUCTION...', 'rollback');

    const success = await this.runCommand(
      'cd deployment-agent && node intelligent-deployer-universal.js production --rollback',
      'Rollback production'
    );

    if (success) {
      this.log('✅ Production rollback successful', 'success');
      this.recordStep('production rollback', 'success');
    } else {
      this.log('❌ Production rollback failed', 'error');
      this.recordStep('production rollback', 'failed', { error: 'Manual intervention required' });
    }

    return success;
  }

  async cleanup() {
    this.log('Cleaning up...', 'step');

    // Return to original branch
    try {
      execSync(`git checkout ${this.originalBranch}`, { stdio: 'pipe' });
      this.log(`✓ Returned to branch: ${this.originalBranch}`, 'success');
    } catch (error) {
      this.log(`⚠️ Could not return to original branch: ${error.message}`, 'warning');
    }

    // Delete the feature branch if merge was successful
    if (this.options.autoMerge) {
      try {
        execSync(`git branch -d ${this.branch}`, { stdio: 'pipe' });
        this.log(`✓ Deleted branch: ${this.branch}`, 'success');
      } catch (error) {
        this.log(`⚠️ Could not delete branch: ${error.message}`, 'warning');
      }
    }
  }

  async run() {
    this.log('');
    this.log('═══════════════════════════════════════════════════════', 'info');
    this.log('🏖️  MERGE-SANBOX DEPLOYMENT SYSTEM', 'sandbox');
    this.log(`📋 Branch: ${this.branch}`, 'info');
    this.log(`⏰ Started: ${this.results.timestamp}`, 'info');
    this.log('═══════════════════════════════════════════════════════', 'info');
    this.log('');

    const startTime = Date.now();

    try {
      // Step 1: Checkout feature branch
      if (!await this.checkoutBranch()) {
        throw new Error('Branch checkout failed');
      }

      // Step 2: Deploy to sandbox
      if (!await this.deployToSandbox()) {
        throw new Error('Sandbox deployment failed');
      }

      // Step 3: Verify sandbox
      if (!await this.verifySandbox()) {
        throw new Error('Sandbox verification failed - aborting merge');
      }

      // Step 4: Merge to production (if auto-merge enabled)
      if (this.options.autoMerge) {
        if (!await this.mergeToProduction()) {
          throw new Error('Merge to production failed');
        }

        // Step 5: Deploy to production
        if (!await this.deployToProduction()) {
          throw new Error('Production deployment failed');
        }

        // Step 6: Verify production
        if (!await this.verifyProduction()) {
          this.log('❌ Production verification failed - AUTO-ROLLBACK INITIATED', 'error');

          const rollbackSuccess = await this.rollbackProduction();
          if (!rollbackSuccess) {
            throw new Error('Production rollback failed - MANUAL INTERVENTION REQUIRED');
          }

          throw new Error('Production deployment failed and rolled back');
        }

        this.log('');
        this.log('═══════════════════════════════════════════════════════', 'success');
        this.log('🎉 DEPLOYMENT SUCCESSFUL', 'success');
        this.log('═══════════════════════════════════════════════════════', 'success');
        this.log('');
      } else {
        this.log('');
        this.log('═══════════════════════════════════════════════════════', 'info');
        this.log('✅ SANDBOX TESTING COMPLETE', 'sandbox');
        this.log('Manual merge to production when ready', 'info');
        this.log('═══════════════════════════════════════════════════════', 'info');
        this.log('');
      }

    } catch (error) {
      this.log('');
      this.log('═══════════════════════════════════════════════════════', 'error');
      this.log(`❌ DEPLOYMENT FAILED: ${error.message}`, 'error');
      this.log('═══════════════════════════════════════════════════════', 'error');
      this.log('');

      // Save failure report
      this.results.overallStatus = 'FAILED';
      this.results.failureReason = error.message;
      this.results.duration = Date.now() - startTime;

      const reportFile = 'merge-sandbox-report.json';
      fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));
      this.log(`📋 Failure report saved: ${reportFile}`, 'info');

      // Cleanup on failure
      await this.cleanup();

      throw error;
    }

    // Cleanup on success
    await this.cleanup();

    // Save success report
    this.results.overallStatus = 'SUCCESS';
    this.results.duration = Date.now() - startTime;

    const reportFile = 'merge-sandbox-report.json';
    fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));
    this.log(`📋 Success report saved: ${reportFile}`, 'info');

    return this.results;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const branch = args[0];

  if (!branch) {
    console.error('Usage: node merge-sandbox-deploy.js <branch-name> [options]');
    console.error('');
    console.error('Examples:');
    console.error('  node merge-sandbox-deploy.js feature/new-auth');
    console.error('  node merge-sandbox-deploy.js fix/rate-limits --auto-merge');
    console.error('');
    console.error('Options:');
    console.error('  --skip-sandbox    Skip sandbox testing (DANGEROUS!)');
    console.error('  --skip-verify     Skip verification (DANGEROUS!)');
    console.error('  --auto-merge      Auto-merge to master on pass');
    console.error('  --rollback        Immediately rollback production');
    process.exit(1);
  }

  const options = {
    skipSandbox: args.includes('--skip-sandbox'),
    skipVerify: args.includes('--skip-verify'),
    autoMerge: args.includes('--auto-merge'),
    rollback: args.includes('--rollback')
  };

  const deployer = new MergeSandboxDeployer(branch, options);

  deployer.run()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      process.exit(1);
    });
}

module.exports = MergeSandboxDeployer;
