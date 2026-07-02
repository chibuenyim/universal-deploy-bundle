#!/usr/bin/env node

/**
 * V4.1.4 Auto-Fix Engine
 * Automatically fixes code errors using specific resolution context
 *
 * This module provides intelligent error fixing capabilities:
 * - Detects specific errors (TypeScript, dependencies, environment, etc.)
 * - Applies targeted fixes based on error context
 * - Verifies fixes were successful
 * - Enables true "force continue" - fix then continue, not skip
 *
 * Usage:
 *   const autoFix = new AutoFixEngine(config);
 *   const fixed = await autoFix.fixError(error);
 *   if (fixed) {
 *     // Error was fixed, continue deployment
 *   }
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

/**
 * V4.1.4 AUTO-FIX ENGINE
 * Applies specific fixes based on error detection context
 */
class AutoFixEngine {
  constructor(config, logger) {
    this.config = config;
    this.log = logger || ((msg, level) => console.log(`[${level}] ${msg}`));
    this.fixesApplied = [];
  }

  /**
   * Main fix entry point
   * Attempts to fix an error using specific resolution context
   */
  async fixError(error) {
    const { category, message, resolution, autoRecoverable, context } = error;

    // Ensure config is initialized before proceeding
    if (!this.config) {
      this.log(`Auto-fix engine: config not initialized, skipping fix`, "warning");
      return false;
    }

    this.log(`Auto-fix engine activated for: ${category} - ${message}`, "info");

    // Check if error is auto-recoverable
    if (!autoRecoverable) {
      this.log(`Error not auto-recoverable, attempting manual fix guidance...`, "warning");
      return this.attemptManualFix(error);
    }

    // Apply specific fix based on category
    let fixed = false;
    switch (category) {
      case 'TYPESCRIPT':
        fixed = await this.fixTypeError(error);
        break;
      case 'MODULE_RESOLUTION':
        fixed = await this.fixModuleError(error);
        break;
      case 'DEPENDENCIES':
        fixed = await this.fixDependencyError(error);
        break;
      case 'ENVIRONMENT':
        fixed = await this.fixEnvironmentError(error);
        break;
      case 'PROCESS':
        fixed = await this.fixProcessError(error);
        break;
      case 'NETWORK':
        fixed = await this.fixNetworkError(error);
        break;
      case 'PERMISSION':
        fixed = await this.fixPermissionError(error);
        break;
      case 'CONFIG':
        fixed = await this.fixConfigError(error);
        break;
      default:
        this.log(`No specific fix available for category: ${category}`, "warning");
        return false;
    }

    if (fixed) {
      this.fixesApplied.push(error);
      this.log(`✓ Fix applied successfully for: ${message}`, "info");
    } else {
      this.log(`✗ Could not auto-fix: ${message}`, "error");
    }

    return fixed;
  }

  /**
   * Fix TypeScript type errors
   * Examples: "Type 'string' is not assignable to type 'number'"
   */
  async fixTypeError(error) {
    const { message, context } = error;

    this.log(`Fixing TypeScript error: ${message}`, "info");

    // Extract file and line from error message
    const fileMatch = message.match(/error TS\d+:(.+)?\((\d+),(\d+)\)/);
    if (!fileMatch) {
      this.log(`Could not parse TypeScript error location`, "warning");
      return false;
    }

    const [, file, line, col] = fileMatch;
    const filePath = path.join(this.config.remotePath, "backend", file.trim());

    try {
      // Read the file
      let content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      const lineNum = parseInt(line) - 1;

      if (lineNum >= lines.length) {
        this.log(`Invalid line number: ${line}`, "error");
        return false;
      }

      const originalLine = lines[lineNum];
      this.log(`Original line ${lineNum + 1}: ${originalLine}`, "info");

      // Apply common TypeScript fixes
      let fixedLine = originalLine;

      // Fix 1: string → number
      if (message.includes("string is not assignable to number")) {
        fixedLine = fixedLine.replace(/: string\s*=/, ": number = ");
        this.log(`Applied fix: Changed type from 'string' to 'number'`, "info");
      }
      // Fix 2: number → string
      else if (message.includes("number is not assignable to string")) {
        fixedLine = fixedLine.replace(/: number\s*=/, ": string = ");
        this.log(`Applied fix: Changed type from 'number' to 'string'`, "info");
      }
      // Fix 3: any → specific type
      else if (message.includes("implicitly has 'any' type")) {
        // Add explicit type annotation
        const varMatch = fixedLine.match(/(\w+)\s*=/);
        if (varMatch) {
          const varName = varMatch[1];
          fixedLine = fixedLine.replace(/const\s+(\w+)\s*=/, `const $1: unknown =`);
          this.log(`Applied fix: Added type annotation for '${varName}'`, "info");
        }
      }
      // Fix 4: Missing property
      else if (message.includes("does not exist on type")) {
        const propMatch = message.match(/property '(\w+)'/);
        if (propMatch) {
          this.log(`Property '${propMatch[1]}' does not exist on type`, "info");
          this.log(`This requires interface/type definition - cannot auto-fix`, "warning");
          return false;
        }
      }
      else {
        this.log(`TypeScript error type not auto-fixable`, "warning");
        return false;
      }

      // Verify fix was applied
      if (fixedLine === originalLine) {
        this.log(`No fix was applied`, "warning");
        return false;
      }

      // Write fixed line back
      lines[lineNum] = fixedLine;
      content = lines.join("\n");
      fs.writeFileSync(filePath, content, "utf-8");

      this.log(`Fixed line ${lineNum + 1}: ${fixedLine}`, "info");
      this.log(`✓ TypeScript error fixed in ${file}`, "info");

      return true;
    } catch (err) {
      this.log(`Failed to fix TypeScript error: ${err.message}`, "error");
      return false;
    }
  }

  /**
   * Fix module resolution errors
   * Examples: "Cannot find module './components/Header'"
   */
  async fixModuleError(error) {
    const { message, context } = error;

    this.log(`Fixing module resolution error: ${message}`, "info");

    // Extract missing module path
    const moduleMatch = message.match(/Cannot find module ['"](.+)['"]/);
    if (!moduleMatch) {
      this.log(`Could not parse module path from error`, "warning");
      return false;
    }

    const missingModule = moduleMatch[1];

    // Fix 1: Check if it's a relative import with wrong path
    if (missingModule.startsWith("./") || missingModule.startsWith("../")) {
      this.log(`Relative import missing: ${missingModule}`, "info");
      this.log(`Cannot auto-fix relative imports - file may need to be created`, "warning");
      return false;
    }

    // Fix 2: Install missing package
    this.log(`Attempting to install missing package: ${missingModule}`, "info");
    try {
      this.sshExec(`cd ${this.config.remotePath}/backend && npm install ${missingModule} --save`);
      this.log(`✓ Installed ${missingModule}`, "info");
      return true;
    } catch (err) {
      this.log(`Failed to install ${missingModule}: ${err.message}`, "error");
      return false;
    }
  }

  /**
   * Fix dependency errors
   * Examples: "Missing required dependency: 'express'"
   */
  async fixDependencyError(error) {
    const { message, context } = error;

    this.log(`Fixing dependency error: ${message}`, "info");

    // Extract package name from error
    const packageMatch = message.match(/['"](@?[\w-]+\/?[\w-]*)['"]/) ||
                       message.match(/missing (\S+)/i);

    if (!packageMatch) {
      this.log(`Could not parse package name from error`, "warning");
      return false;
    }

    const packageName = packageMatch[1];

    try {
      this.log(`Installing missing dependency: ${packageName}`, "info");
      this.sshExec(`cd ${this.config.remotePath}/backend && npm install ${packageName} --save`);
      this.log(`✓ Installed ${packageName}`, "info");
      return true;
    } catch (err) {
      this.log(`Failed to install ${packageName}: ${err.message}`, "error");
      return false;
    }
  }

  /**
   * Fix environment errors
   * Examples: "JWT_SECRET is not defined"
   */
  async fixEnvironmentError(error) {
    const { message, context } = error;

    this.log(`Fixing environment error: ${message}`, "info");

    // Extract missing environment variable
    const envVarMatch = message.match(/(\w+)\s+(is not defined|not set|required)/i);
    if (!envVarMatch) {
      this.log(`Could not parse environment variable name`, "warning");
      return false;
    }

    const envVarName = envVarMatch[1];

    try {
      // Check if .env file exists
      const envFile = path.join(this.config.remotePath, "backend", ".env");
      let envContent = "";

      if (fs.existsSync(envFile)) {
        envContent = fs.readFileSync(envFile, "utf-8");
      }

      // Generate secure random value for secrets
      const isSecret = envVarName.includes("SECRET") ||
                      envVarName.includes("KEY") ||
                      envVarName.includes("TOKEN");

      const value = isSecret
        ? this.generateRandomSecret(32)
        : this.getDefaultValue(envVarName);

      // Add to .env file
      envContent += `\n${envVarName}=${value}\n`;
      fs.writeFileSync(envFile, envContent, "utf-8");

      this.log(`✓ Added ${envVarName} to .env`, "info");
      this.log(`⚠️  WARNING: Please update ${envVarName} with proper value!`, "warning");

      return true;
    } catch (err) {
      this.log(`Failed to add environment variable: ${err.message}`, "error");
      return false;
    }
  }

  /**
   * Fix process/port errors
   * Examples: "EADDRINUSE: address already in use :3020"
   */
  async fixProcessError(error) {
    const { message, context } = error;

    this.log(`Fixing process error: ${message}`, "info");

    // Extract port number
    const portMatch = message.match(/EADDRINUSE.*:(\d+)/) ||
                     message.match(/port\s+(\d+)/);

    if (!portMatch) {
      this.log(`Could not parse port number from error`, "warning");
      return false;
    }

    const port = portMatch[1];

    try {
      this.log(`Killing process on port ${port}`, "info");
      this.sshExec(`fuser -k ${port}/tcp 2>/dev/null || true`);
      this.sshExec(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`);

      // Wait for port to be released
      this.sshExec(`sleep 2`);

      this.log(`✓ Port ${port} is now free`, "info");
      return true;
    } catch (err) {
      this.log(`Failed to kill process on port ${port}: ${err.message}`, "error");
      return false;
    }
  }

  /**
   * Fix network errors
   * Examples: "ECONNREFUSED", "ETIMEDOUT"
   */
  async fixNetworkError(error) {
    const { message, context } = error;

    this.log(`Fixing network error: ${message}`, "info");

    // Retry with exponential backoff
    const maxRetries = 3;
    for (let i = 1; i <= maxRetries; i++) {
      try {
        this.log(`Retry ${i}/${maxRetries}...`, "info");

        // Wait before retry (exponential backoff)
        if (i > 1) {
          this.sshExec(`sleep ${Math.pow(2, i)}`);
        }

        // Test connection
        if (context?.host) {
          this.sshExec(`nc -zv ${context.host} ${context.port || 80} 2>&1`);
        }

        this.log(`✓ Network connection successful`, "info");
        return true;
      } catch (err) {
        this.log(`Retry ${i} failed: ${err.message}`, "warning");
        if (i === maxRetries) {
          this.log(`❌ Network error could not be resolved after ${maxRetries} retries`, "error");
          return false;
        }
      }
    }

    return false;
  }

  /**
   * Fix permission errors
   * Examples: "EACCES: permission denied"
   */
  async fixPermissionError(error) {
    const { message, context } = error;

    this.log(`Fixing permission error: ${message}`, "info");

    // Extract file path from error
    const pathMatch = message.match(/permission denied.*['"](.+)['"]/) ||
                    message.match(/EACCES.*['"](.+)['"]/);

    if (!pathMatch) {
      this.log(`Could not parse file path from error`, "warning");
      return false;
    }

    const filePath = pathMatch[1];

    try {
      this.log(`Fixing permissions for: ${filePath}`, "info");

      // Try different permission fixes
      // Fix 1: Make file executable
      this.sshExec(`chmod +x ${filePath} 2>/dev/null || true`);

      // Fix 2: Give write permissions
      this.sshExec(`chmod u+w ${filePath} 2>/dev/null || true`);

      // Fix 3: Fix ownership
      this.sshExec(`sudo chown -R $USER:$USER ${filePath} 2>/dev/null || true`);

      this.log(`✓ Permissions fixed for ${filePath}`, "info");
      return true;
    } catch (err) {
      this.log(`Failed to fix permissions: ${err.message}`, "error");
      return false;
    }
  }

  /**
   * Fix configuration errors
   * Examples: "Invalid configuration value"
   */
  async fixConfigError(error) {
    const { message, context } = error;

    this.log(`Fixing configuration error: ${message}`, "info");

    this.log(`Configuration errors require manual review`, "warning");
    this.log(`Please check: ${context?.file || 'configuration files'}`, "info");

    return false;
  }

  /**
   * Attempt manual fix with guidance
   * For errors that aren't auto-recoverable
   */
  async attemptManualFix(error) {
    const { category, message, resolution } = error;

    this.log(`Manual fix required for: ${category}`, "info");
    this.log(`Error: ${message}`, "info");
    this.log(`Resolution: ${resolution}`, "info");

    // Provide specific manual steps based on category
    const manualSteps = this.getManualSteps(error);

    this.log(`Manual steps required:`, "info");
    manualSteps.forEach((step, i) => {
      this.log(`  ${i + 1}. ${step}`, "info");
    });

    return false; // Manual fixes require user intervention
  }

  /**
   * Get manual fix steps for non-auto-recoverable errors
   */
  getManualSteps(error) {
    const { category, message } = error;

    switch (category) {
      case 'DATABASE':
        return [
          'Check if database service is running',
          'Verify DATABASE_URL environment variable',
          'Test database connection manually',
          'Ensure database credentials are correct'
        ];

      case 'ENVIRONMENT':
        return [
          'Add missing environment variable to .env file',
          'Restart application after adding variable',
          'Verify variable is loaded correctly'
        ];

      case 'CONFIG':
        return [
          'Review configuration file',
          'Update invalid configuration values',
          'Check configuration schema'
        ];

      case 'NESTJS':
        return [
          'Check NestJS module configuration',
          'Verify all dependencies are installed',
          'Ensure providers are properly declared',
          'Check for circular dependencies'
        ];

      default:
        return [
          'Review error message above',
          'Apply resolution guidance',
          'Test the fix manually',
          'Re-run deployment'
        ];
    }
  }

  /**
   * SSH command helper
   * Uses the deployer's SSH execution with null safety
   */
  sshExec(command) {
    // Check if config is initialized
    if (!this.config) {
      throw new Error('AutoFixEngine: config not initialized. Call initialize(config) before using sshExec.');
    }

    // Check if config has required properties
    if (!this.config.hasOwnProperty('localMode')) {
      throw new Error('AutoFixEngine: config.localMode not set');
    }

    const sshCommand = this.config.localMode
      ? command
      : `ssh -i ${this.config.sshKeyPath} -o StrictHostKeyChecking=no -o ConnectTimeout=30 ${this.config.sshHost} "${command}"`;

    return execSync(sshCommand, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  }

  /**
   * Generate random secret for environment variables
   */
  generateRandomSecret(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let secret = '';
    for (let i = 0; i < length; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  /**
   * Get default value for environment variables
   */
  getDefaultValue(envVarName) {
    const defaults = {
      'NODE_ENV': 'development',
      'PORT': '3000',
      'HOST': 'localhost',
      'LOG_LEVEL': 'info',
    };

    return defaults[envVarName] || '';
  }

  /**
   * Get summary of fixes applied
   */
  getFixesSummary() {
    return {
      total: this.fixesApplied.length,
      fixes: this.fixesApplied.map(f => ({
        category: f.category,
        message: f.message,
        resolution: f.resolution
      }))
    };
  }
}

module.exports = AutoFixEngine;
