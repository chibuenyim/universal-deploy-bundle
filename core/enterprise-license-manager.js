#!/usr/bin/env node

/**
 * 🔐 Enterprise License Manager
 *
 * Manages enterprise license validation and activation
 * Enables enterprise features for licensed customers
 *
 * This system:
 * - Validates enterprise license keys
 * - Activates enterprise features
 * - Manages license expiration
 * - Provides license information
 * - Integrates with all enterprise components
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const http = require('https');

class EnterpriseLicenseManager {
  constructor() {
    this.licenseFile = path.join(process.cwd(), '.enterprise-license.json');
    this.licenseKey = process.env.ENTERPRISE_LICENSE_KEY || null;
    this.licenseInfo = null;
  }

  /**
   * Check if enterprise license is valid
   */
  async validateLicense(licenseKey = null) {
    const keyToValidate = licenseKey || this.licenseKey;

    if (!keyToValidate) {
      return {
        valid: false,
        reason: 'No license key provided'
      };
    }

    // Check local license file
    if (fs.existsSync(this.licenseFile)) {
      try {
        const localLicense = JSON.parse(fs.readFileSync(this.licenseFile, 'utf8'));

        // Check if expired
        if (localLicense.expiresAt && new Date(localLicense.expiresAt) < new Date()) {
          return {
            valid: false,
            reason: 'License expired'
          };
        }

        // Verify key matches
        if (localLicense.licenseKey !== keyToValidate) {
          return {
            valid: false,
            reason: 'License key mismatch'
          };
        }

        this.licenseInfo = localLicense;
        return {
          valid: true,
          license: localLicense
        };
      } catch (error) {
        return {
          valid: false,
          reason: 'Invalid license file'
        };
      }
    }

    // Validate against remote server (if no local file)
    return await this.validateLicenseRemote(keyToValidate);
  }

  /**
   * Validate license key against remote server
   */
  async validateLicenseRemote(licenseKey) {
    return new Promise((resolve) => {
      const options = {
        hostname: 'agentic-toolkit.com',
        port: 443,
        path: `/api/validate-license?key=${licenseKey}`,
        method: 'GET'
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);

            if (response.valid) {
              this.licenseInfo = response.license;
              this.saveLicenseLocally(response.license);
            }

            resolve(response);
          } catch (error) {
            resolve({
              valid: false,
              reason: 'Invalid response from server'
            });
          }
        });
      });

      req.on('error', () => {
        // If remote validation fails, check for offline validation
        resolve(this.validateLicenseOffline(licenseKey));
      });

      req.setTimeout(5000, () => {
        req.destroy();
        resolve(this.validateLicenseOffline(licenseKey));
      });

      req.end();
    });
  }

  /**
   * Offline license validation (fallback)
   */
  validateLicenseOffline(licenseKey) {
    try {
      // Basic format validation
      const parts = licenseKey.split('-');
      if (parts.length !== 5) {
        return {
          valid: false,
          reason: 'Invalid license format'
        };
      }

      // Checksum validation
      const checksum = parts[4];
      const data = parts.slice(0, 4).join('-');

      const expectedChecksum = this.generateChecksum(data);

      if (checksum !== expectedChecksum) {
        return {
          valid: false,
          reason: 'Invalid license checksum'
        };
      }

      // Extract license info from key
      const licenseInfo = this.extractLicenseInfo(licenseKey);

      // Check expiration
      if (licenseInfo.expiresAt && new Date(licenseInfo.expiresAt) < new Date()) {
        return {
          valid: false,
          reason: 'License expired'
        };
      }

      this.licenseInfo = licenseInfo;

      return {
        valid: true,
        license: licenseInfo,
        warning: 'Using offline validation - some features may be limited'
      };
    } catch (error) {
      return {
        valid: false,
        reason: 'License validation failed'
      };
    }
  }

  /**
   * Extract license information from key
   */
  extractLicenseInfo(licenseKey) {
    const parts = licenseKey.split('-');

    return {
      licenseKey: licenseKey,
      type: this.decodeLicenseType(parts[0]),
      customer: this.decodeCustomer(parts[1]),
      features: this.decodeFeatures(parts[2]),
      issuedAt: new Date(parseInt(parts[3], 36)),
      expiresAt: this.calculateExpiration(parts[3], parts[0])
    };
  }

  /**
   * Decode license type
   */
  decodeLicenseType(code) {
    const types = {
      'UDB': 'Universal Deploy Bundle',
      'START': 'Starter Package',
      'PROF': 'Professional Package',
      'ENT': 'Enterprise Package'
    };

    return types[code] || 'Unknown';
  }

  /**
   * Decode customer identifier
   */
  decodeCustomer(code) {
    // Simple base64 decoding
    try {
      return Buffer.from(code, 'base64').toString('utf8');
    } catch {
      return 'Unknown Customer';
    }
  }

  /**
   * Decode feature flags
   */
  decodeFeatures(code) {
    const features = {
      'A': 'automated_fixing',
      'B': 'owasp_compliance',
      'C': 'risk_scoring',
      'D': 'security_reports',
      'E': 'pre_deploy_verification',
      'F': 'ai_automation',
      'G': 'self_healing',
      'H': 'anomaly_detection',
      'I': 'predictive_scaling',
      'J': 'real_time_alerts',
      'K': 'snyk_integration',
      'L': 'dependabot_integration',
      'M': 'security_dashboard',
      'N': 'incident_response',
      'O': 'compliance_reporting',
      'P': 'source_code_access',
      'Q': 'white_label',
      'R': 'commercial_license',
      'S': 'custom_features',
      'T': '24_7_support'
    };

    const enabled = [];

    for (const [key, feature] of Object.entries(features)) {
      if (code.includes(key)) {
        enabled.push(feature);
      }
    }

    return enabled;
  }

  /**
   * Calculate license expiration
   */
  calculateExpiration(dateCode, typeCode) {
    const issued = new Date(parseInt(dateCode, 36));

    // Different expiration periods based on type
    const periods = {
      'UDB': 365 * 24 * 60 * 60 * 1000, // 1 year
      'START': 365 * 24 * 60 * 60 * 1000, // 1 year
      'PROF': 365 * 24 * 60 * 60 * 1000, // 1 year
      'ENT': 365 * 24 * 60 * 60 * 1000 // 1 year
    };

    const period = periods[typeCode] || periods['UDB'];
    return new Date(issued.getTime() + period);
  }

  /**
   * Generate checksum for license key
   */
  generateChecksum(data) {
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 8).toUpperCase();
  }

  /**
   * Save license locally
   */
  saveLicenseLocally(licenseInfo) {
    try {
      fs.writeFileSync(this.licenseFile, JSON.stringify(licenseInfo, null, 2));
      console.log('✅ License saved locally');
    } catch (error) {
      console.error('⚠️  Could not save license locally:', error.message);
    }
  }

  /**
   * Check if specific feature is enabled
   */
  isFeatureEnabled(feature) {
    if (!this.licenseInfo) {
      return false;
    }

    return this.licenseInfo.features && this.licenseInfo.features.includes(feature);
  }

  /**
   * Get license information
   */
  getLicenseInfo() {
    return this.licenseInfo;
  }

  /**
   * Get days until expiration
   */
  getDaysUntilExpiration() {
    if (!this.licenseInfo || !this.licenseInfo.expiresAt) {
      return 0;
    }

    const now = new Date();
    const expires = new Date(this.licenseInfo.expiresAt);
    const diff = expires - now;

    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Activate enterprise features
   */
  async activateFeatures() {
    const validation = await this.validateLicense();

    if (!validation.valid) {
      console.log('❌ Enterprise features not available:', validation.reason);
      console.log('');
      console.log('To enable enterprise features:');
      console.log('1. Contact admin@agentic-toolkit.com');
      console.log('2. Purchase enterprise license');
      console.log('3. Set ENTERPRISE_LICENSE_KEY environment variable');
      console.log('');
      return false;
    }

    console.log('✅ Enterprise license validated!');
    console.log('');
    console.log('License Details:');
    console.log(`  Type: ${this.licenseInfo.type}`);
    console.log(`  Customer: ${this.licenseInfo.customer}`);
    console.log(`  Features: ${this.licenseInfo.features.length} enabled`);
    console.log(`  Expires: ${this.licenseInfo.expiresAt}`);
    console.log(`  Days remaining: ${this.getDaysUntilExpiration()}`);
    console.log('');

    // Check for expiration warning
    const daysRemaining = this.getDaysUntilExpiration();
    if (daysRemaining < 30) {
      console.log(`⚠️  WARNING: License expires in ${daysRemaining} days`);
      console.log('   Contact admin@agentic-toolkit.com to renew');
      console.log('');
    }

    return true;
  }

  /**
   * Generate trial license (for testing)
   */
  static generateTrialLicense() {
    const now = Date.now();
    const dateCode = now.toString(36).toUpperCase();

    const parts = [
      'TRIAL', // Trial identifier
      Buffer.from('Trial User').toString('base64'), // Customer
      'ABCDEFGHIJ', // All features
      dateCode, // Issued date
      'TRIAL123' // Checksum placeholder
    ];

    return parts.join('-');
  }

  /**
   * Display license status
   */
  async displayStatus() {
    console.log('🔐 Enterprise License Status');
    console.log('=' .repeat(50));
    console.log('');

    const validation = await this.validateLicense();

    if (validation.valid) {
      console.log('✅ Status: VALID');
      console.log(`   Type: ${this.licenseInfo.type}`);
      console.log(`   Customer: ${this.licenseInfo.customer}`);
      console.log(`   Features: ${this.licenseInfo.features.length} enabled`);
      console.log(`   Issued: ${this.licenseInfo.issuedAt}`);
      console.log(`   Expires: ${this.licenseInfo.expiresAt}`);
      console.log(`   Days remaining: ${this.getDaysUntilExpiration()}`);
      console.log('');

      console.log('📋 Enabled Features:');
      this.licenseInfo.features.forEach(feature => {
        console.log(`   ✓ ${feature}`);
      });
      console.log('');
    } else {
      console.log('❌ Status: INVALID');
      console.log(`   Reason: ${validation.reason}`);
      console.log('');
      console.log('To get an enterprise license:');
      console.log('   1. Visit: https://agentic-toolkit.com');
      console.log('   2. Email: admin@agentic-toolkit.com');
      console.log('   3. Subject: Enterprise License Inquiry');
      console.log('');
    }

    console.log('='.repeat(50));
  }
}

// CLI Interface
if (require.main === module) {
  const licenseManager = new EnterpriseLicenseManager();
  const args = process.argv.slice(2);

  if (args.includes('--validate') || args.includes('-v')) {
    licenseManager.validateLicense()
      .then(validation => {
        console.log(JSON.stringify(validation, null, 2));
        process.exit(validation.valid ? 0 : 1);
      });
  }

  if (args.includes('--activate') || args.includes('-a')) {
    licenseManager.activateFeatures()
      .then(success => {
        process.exit(success ? 0 : 1);
      });
  }

  if (args.includes('--status') || args.includes('-s')) {
    licenseManager.displayStatus()
      .then(() => {
        process.exit(0);
      });
  }

  if (args.includes('--trial') || args.includes('-t')) {
    console.log('🎫 Trial License (for testing):');
    console.log(EnterpriseLicenseManager.generateTrialLicense());
    console.log('');
    console.log('Usage:');
    console.log('  export ENTERPRISE_LICENSE_KEY=<trial-license>');
    console.log('  node enterprise-license-manager.js --validate');
    process.exit(0);
  }

  // Default: show help
  console.log('🔐 Enterprise License Manager');
  console.log('=' .repeat(50));
  console.log('');
  console.log('Commands:');
  console.log('  --validate, -v    Validate license key');
  console.log('  --activate, -a    Activate enterprise features');
  console.log('  --status, -s      Display license status');
  console.log('  --trial, -t       Generate trial license (testing)');
  console.log('');
  console.log('Environment Variables:');
  console.log('  ENTERPRISE_LICENSE_KEY    Your enterprise license key');
  console.log('');
  console.log('Example usage:');
  console.log('  export ENTERPRISE_LICENSE_KEY=your-key-here');
  console.log('  node enterprise-license-manager.js --validate');
  console.log('  node enterprise-license-manager.js --activate');
  console.log('');
  console.log('Get a license:');
  console.log('  Email: admin@agentic-toolkit.com');
  console.log('  Subject: Enterprise License Inquiry');
  console.log('');
  console.log('=' .repeat(50));
}

module.exports = EnterpriseLicenseManager;
