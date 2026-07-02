#!/usr/bin/env node

/**
 * COMPREHENSIVE BACKEND BUILD ERROR DETECTION
 * Part of V4.1 Release
 *
 * Detects all backend build errors:
 * - TypeScript/Node.js compilation errors
 * - NestJS-specific errors
 * - Database connection errors
 * - Environment configuration errors
 * - API/Routing errors
 * - Service startup errors
 */

const { execSync } = require("child_process");

/**
 * BACKEND BUILD ERROR PATTERNS
 * Comprehensive detection of all backend build errors
 */
const BACKEND_BUILD_ERROR_PATTERNS = {
  // TypeScript Compilation Errors
  typescript: [
    { pattern: /error TS\d+:/i, message: "TypeScript compilation error" },
    { pattern: /cannot find type/i, message: "Type definition missing" },
    { pattern: /type '.*' is not assignable to/i, message: "Type mismatch error" },
    { pattern: /property '.*' does not exist/i, message: "Property does not exist" },
    { pattern: /argument of type/i, message: "Type argument error" },
    { pattern: /no overload matches/i, message: "Function overload mismatch" },
    { pattern: /this condition will always return/i, message: "Type guard issue" },
    { pattern: /typeof.*cannot be used as/i, message: "Type assertion error" },
    { pattern: /expected \d+ arguments, but got \d+/i, message: "Function argument count mismatch" },
    { pattern: /parameter '.*' implicitly has an/i, message: "Implicit any type" }
  ],

  // NestJS Specific Errors
  nestjs: [
    { pattern: /error: cannot resolve dependency/i, message: "NestJS dependency resolution failed" },
    { pattern: /error: unable to instantiate module/i, message: "Module instantiation failed" },
    { pattern: /error: invalid provider/i, message: "Invalid provider configuration" },
    { pattern: /error: missing dependency/i, message: "Required NestJS dependency missing" },
    { pattern: /error: circular dependency/i, message: "Circular dependency detected" },
    { pattern: /nest cannot find/i, message: "NestJS module not found" },
    { pattern: /unknown dependency/i, message: "Unknown NestJS dependency" },
    { pattern: /failed to register controller/i, message: "Controller registration failed" },
    { pattern: /failed to register provider/i, message: "Provider registration failed" },
    { pattern: /scope.*not found/i, message: "Injection scope not found" }
  ],

  // Database Connection Errors
  database: [
    { pattern: /error: connection refused/i, message: "Database connection refused" },
    { pattern: /error: connect econnrefused/i, message: "Database ECONNREFUSED" },
    { pattern: /error: cannot connect to database/i, message: "Cannot connect to database" },
    { pattern: /error: authentication failed/i, message: "Database authentication failed" },
    { pattern: /error: database.*does not exist/i, message: "Database does not exist" },
    { pattern: /error: access denied for user/i, message: "Database access denied" },
    { pattern: /error: too many connections/i, message: "Too many database connections" },
    { pattern: /error: connection timeout/i, message: "Database connection timeout" },
    { pattern: /error: connection lost/i, message: "Database connection lost" },
    { pattern: /error: invalid connection string/i, message: "Invalid connection string" }
  ],

  // Environment Configuration Errors
  environment: [
    { pattern: /error:.*is not defined/i, message: "Environment variable not defined" },
    { pattern: /error: missing required env var/i, message: "Required environment variable missing" },
    { pattern: /error: invalid env value/i, message: "Invalid environment variable value" },
    { pattern: /error: cannot read.*process\.env/i, message: "Cannot read environment variable" },
    { pattern: /error: config.*not found/i, message: "Configuration file not found" },
    { pattern: /error: invalid configuration/i, message: "Invalid configuration" },
    { pattern: /error: missing required config/i, message: "Required configuration missing" },
    { pattern: /error: env.*not set/i, message: "Environment variable not set" }
  ],

  // API/Routing Errors
  routing: [
    { pattern: /error: cannot get/i, message: "Route not found" },
    { pattern: /error: cannot post/i, message: "POST route error" },
    { pattern: /error: route.*already registered/i, message: "Duplicate route registration" },
    { pattern: /error: invalid route path/i, message: "Invalid route path" },
    { pattern: /error: controller method not found/i, message: "Controller method not found" },
    { pattern: /error: invalid middleware/i, message: "Invalid middleware configuration" },
    { pattern: /error: guard.*not found/i, message: "Guard not found" },
    { pattern: /error: interceptor.*not found/i, message: "Interceptor not found" },
    { pattern: /error: pipe.*not found/i, message: "Pipe not found" }
  ],

  // Service Startup Errors
  startup: [
    { pattern: /error: failed to start microservice/i, message: "Microservice startup failed" },
    { pattern: /error: application failed to start/i, message: "Application startup failed" },
    { pattern: /error: server failed to start/i, message: "Server startup failed" },
    { pattern: /error: cannot bind port/i, message: "Cannot bind to port" },
    { pattern: /error: port.*already in use/i, message: "Port already in use" },
    { pattern: /error: address already in use/i, message: "Address already in use" },
    { pattern: /error: listen eaddrinuse/i, message: "EADDRINUSE - Port in use" },
    { pattern: /error: failed to bootstrap/i, message: "NestJS bootstrap failed" },
    { pattern: /error: failed to initialize module/i, message: "Module initialization failed" }
  ],

  // Module Resolution Errors
  moduleResolution: [
    { pattern: /error: cannot find module/i, message: "Module not found" },
    { pattern: /error: module not found: can't resolve/i, message: "Module resolution failed" },
    { pattern: /error: unable to resolve path to/i, message: "Path resolution failed" },
    { pattern: /error: export '.*' was not found in/i, message: "Named export not found" },
    { pattern: /error: attempted to import error: circular/i, message: "Circular dependency detected" },
    { pattern: /error: cannot read propert.*require/i, message: "Require statement error" }
  ],

  // Missing Dependencies
  dependencies: [
    { pattern: /error: cannot find package/i, message: "Package not installed" },
    { pattern: /error: missing required package/i, message: "Required package missing" },
    { pattern: /error: peer dependency missing/i, message: "Peer dependency not satisfied" },
    { pattern: /error: unmet peer dependency/i, message: "Peer dependency version mismatch" },
    { pattern: /error: invalid package/i, message: "Invalid package.json" },
    { pattern: /error: could not resolve from/i, message: "Dependency resolution failed" }
  ],

  // Syntax Errors
  syntax: [
    { pattern: /error: syntax error/i, message: "Syntax error in code" },
    { pattern: /error: unexpected token/i, message: "Unexpected token encountered" },
    { pattern: /error: unexpected end of input/i, message: "Incomplete code" },
    { pattern: /error: illegal return statement/i, message: "Illegal return statement" },
    { pattern: /error: parse error/i, message: "JavaScript parse error" },
    { pattern: /error: invalid regular expression/i, message: "Invalid regex syntax" }
  ],

  // Memory/Resource Issues
  resources: [
    { pattern: /error: heap out of memory/i, message: "Out of memory during build" },
    { pattern: /error: out of memory/i, message: "Memory exhausted" },
    { pattern: /error: call stack size exceeded/i, message: "Stack overflow" },
    { pattern: /error: too many open files/i, message: "File descriptor limit exceeded" },
    { pattern: /error: enomem/i, message: "System out of memory" }
  ],

  // File System Errors
  filesystem: [
    { pattern: /error: enoent: no such file or directory/i, message: "File not found" },
    { pattern: /error: eacces: permission denied/i, message: "Permission denied" },
    { pattern: /error: cannot read.*file/i, message: "File read error" },
    { pattern: /error: file not found/i, message: "File missing" },
    { pattern: /error: cannot write.*file/i, message: "File write error" }
  ],

  // Network/Download Errors
  network: [
    { pattern: /error: network error/i, message: "Network connectivity issue" },
    { pattern: /error: fetch failed/i, message: "Fetch request failed" },
    { pattern: /error: download failed/i, message: "Download failed" },
    { pattern: /error: connection refused/i, message: "Connection refused" },
    { pattern: /error: timeout/i, message: "Request timeout" },
    { pattern: /error: etimedout/i, message: "Connection timeout" }
  ],

  // Critical Build Failures
  critical: [
    { pattern: /error: build failed/i, message: "Build process failed" },
    { pattern: /error: compilation failed/i, message: "Compilation failed" },
    { pattern: /error: build failed with errors/i, message: "Build completed with errors" },
    { pattern: /error: cannot compile/i, message: "Cannot compile source" },
    { pattern: /error: failed to compile/i, message: "Compilation error" },
    { pattern: /error: build error/i, message: "Build error encountered" },
    { pattern: /error: nest build failed/i, message: "NestJS build failed" },
    { pattern: /error: tsc compile failed/i, message: "TypeScript compile failed" }
  ],

  // ESLint Errors (backend)
  eslint: [
    { pattern: /error: no-unused-vars/i, message: "Unused variable detected" },
    { pattern: /error: no-undef/i, message: "Undefined variable" },
    { pattern: /error: no-console/i, message: "Console statement detected" },
    { pattern: /error: semi/i, message: "Missing semicolon" },
    { pattern: /error: comma-dangle/i, message: "Trailing comma issue" },
    { pattern: /error: quotes/i, message: "Quote style inconsistency" },
    { pattern: /error: indent/i, message: "Indentation error" },
    { pattern: /warning: .*/i, message: "ESLint warning" }
  ]
};

/**
 * BACKEND BUILD ERROR DETECTOR
 */
class BackendBuildErrorDetector {
  constructor(options = {}) {
    this.errors = [];
    this.warnings = [];
    this.errorCounts = {};
  }

  /**
   * Detect and categorize errors in backend build output
   */
  detectBuildErrors(buildOutput, context = {}) {
    const detectedErrors = [];
    const lines = buildOutput.split('\n');

    for (const line of lines) {
      // Check each error category
      for (const [category, patterns] of Object.entries(BACKEND_BUILD_ERROR_PATTERNS)) {
        for (const { pattern, message } of patterns) {
          if (pattern.test(line)) {
            const error = {
              category,
              message,
              line: line.trim(),
              severity: this.getSeverity(category),
              resolution: this.getResolution(category),
              context
            };

            detectedErrors.push(error);
            this.errorCounts[category] = (this.errorCounts[category] || 0) + 1;

            // Log immediately for visibility
            console.log(`❌ [${category.toUpperCase()}] ${message}`);
            console.log(`   Line: ${line.trim()}`);
            console.log(`   Resolution: ${error.resolution}`);
            console.log('');
          }
        }
      }
    }

    return detectedErrors;
  }

  /**
   * Get severity level for error category
   */
  getSeverity(category) {
    const severityMap = {
      typescript: 'HIGH',
      eslint: 'MEDIUM',
      nestjs: 'CRITICAL',
      database: 'CRITICAL',
      environment: 'CRITICAL',
      routing: 'HIGH',
      startup: 'CRITICAL',
      moduleResolution: 'HIGH',
      dependencies: 'HIGH',
      syntax: 'CRITICAL',
      resources: 'CRITICAL',
      filesystem: 'CRITICAL',
      network: 'MEDIUM',
      critical: 'CRITICAL'
    };
    return severityMap[category] || 'MEDIUM';
  }

  /**
   * Get resolution guidance for error category
   */
  getResolution(category) {
    const resolutionMap = {
      typescript: 'Fix TypeScript errors in source code - check type definitions and interfaces',
      eslint: 'Fix ESLint errors or adjust linting rules in .eslintrc',
      nestjs: 'Fix NestJS module configuration and dependencies',
      database: 'Check database connection and credentials in DATABASE_URL',
      environment: 'Set required environment variables in .env file',
      routing: 'Fix route definitions and controller methods',
      startup: 'Fix service configuration and port availability',
      moduleResolution: 'Fix import paths or install missing dependencies',
      dependencies: 'Install missing dependencies: npm install <package>',
      syntax: 'Fix syntax errors in source code',
      resources: 'Increase Node.js memory limit: NODE_OPTIONS=--max-old-space-size=4096',
      filesystem: 'Check file permissions and paths',
      network: 'Check network connectivity and try again',
      critical: 'Review all build errors and fix critical issues first'
    };
    return resolutionMap[category] || 'Review build logs for details';
  }

  /**
   * Generate error summary
   */
  generateSummary() {
    const totalErrors = Object.values(this.errorCounts).reduce((a, b) => a + b, 0);
    const summary = {
      totalErrors,
      errorsByCategory: this.errorCounts,
      hasCriticalErrors: this.errorCounts.critical > 0 ||
                        this.errorCounts.nestjs > 0 ||
                        this.errorCounts.database > 0 ||
                        this.errorCounts.environment > 0 ||
                        this.errorCounts.startup > 0,
      needsManualFix: this.errorCounts.typescript > 0 ||
                      this.errorCounts.eslint > 0 ||
                      this.errorCounts.nestjs > 0 ||
                      this.errorCounts.routing > 0 ||
                      this.errorCounts.moduleResolution > 0
    };

    return summary;
  }

  /**
   * Check if build can be auto-recovered
   */
  canAutoRecover(errorSummary) {
    // Auto-recoverable: dependencies, resources, network, filesystem
    // Manual fix required: typescript, eslint, nestjs, database, environment, routing

    if (errorSummary.needsManualFix) {
      return false;
    }

    // Check if only auto-recoverable errors present
    const autoRecoverableCategories = ['dependencies', 'resources', 'network', 'filesystem'];
    const hasOnlyAutoRecoverable = Object.keys(errorSummary.errorsByCategory)
      .every(cat => autoRecoverableCategories.includes(cat));

    return hasOnlyAutoRecoverable;
  }
}

/**
 * EXPORT MODULE
 */
if (require.main === module) {
  console.log("V4.1 Enhanced - Backend Build Console Error Detection");
  console.log("This module provides comprehensive error detection for backend builds.");
  console.log("\nFeatures:");
  console.log("- TypeScript error detection (10 patterns)");
  console.log("- NestJS error detection (10 patterns)");
  console.log("- Database error detection (10 patterns)");
  console.log("- Environment error detection (8 patterns)");
  console.log("- API/Routing error detection (9 patterns)");
  console.log("- Service startup error detection (9 patterns)");
  console.log("- Module resolution error detection (6 patterns)");
  console.log("- Missing dependency detection (6 patterns)");
  console.log("- Syntax error detection (6 patterns)");
  console.log("- Memory/resource detection (5 patterns)");
  console.log("- File system error detection (5 patterns)");
  console.log("- Network error detection (6 patterns)");
  console.log("- Critical build failure detection (8 patterns)");
  console.log("\nTotal: 98+ error detection patterns");
}

module.exports = {
  BackendBuildErrorDetector,
  BACKEND_BUILD_ERROR_PATTERNS
};
