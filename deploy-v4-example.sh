#!/bin/bash

# V4 Deployment Script Examples
# This file contains practical examples for using the V4 deployment agent

set -e

echo "=== Universal Deployer V4 - Usage Examples ==="
echo ""

# =============================================================================
# EXAMPLE 1: Basic Production Deployment
# =============================================================================
echo "1. Basic Production Deployment"
echo "   Command: node deployment-agent/intelligent-deployer-universal-v4.js production --ssh root@server.com --url https://example.com"
echo ""

# =============================================================================
# EXAMPLE 2: Force Continue (Resume Failed Deployment)
# =============================================================================
echo "2. Resume Failed Deployment with Force Continue"
echo "   Command: node deployment-agent/intelligent-deployer-universal-v4.js production --force-continue"
echo "   Use Case: Deployment failed or was interrupted, simply re-run with --force-continue"
echo ""

# =============================================================================
# EXAMPLE 3: Strict Twelve-Factor Deployment
# =============================================================================
echo "3. Strict Twelve-Factor Compliance Deployment"
echo "   Command: node deployment-agent/intelligent-deployer-universal-v4.js production --ssh root@server.com --url https://example.com --strict-12factor"
echo "   Use Case: Enforce 12-factor principles, fail on any violation"
echo ""

# =============================================================================
# EXAMPLE 4: Staging Deployment
# =============================================================================
echo "4. Staging Deployment"
echo "   Command: node deployment-agent/intelligent-deployer-universal-v4.js staging --ssh root@staging.example.com --url https://staging.example.com --branch staging"
echo "   Use Case: Deploy to staging environment with different branch"
echo ""

# =============================================================================
# EXAMPLE 5: Local Development Deployment
# =============================================================================
echo "5. Local Development Deployment"
echo "   Command: node deployment-agent/intelligent-deployer-universal-v4.js development --local --url http://localhost:3000"
echo "   Use Case: Test deployment locally without SSH"
echo ""

# =============================================================================
# EXAMPLE 6: Production with Environment Variables
# =============================================================================
echo "6. Production Deployment with Environment Variables"
echo "   Environment:"
echo "     export DEPLOY_SSH_HOST=root@server.com"
echo "     export DEPLOY_URL=https://example.com"
echo "     export DEPLOY_BRANCH=master"
echo "     export DEPLOY_ENV=production"
echo "   Command: node deployment-agent/intelligent-deployer-universal-v4.js production"
echo ""

# =============================================================================
# EXAMPLE 7: Using Config File
# =============================================================================
echo "7. Using Config File (.deploy-config.json)"
echo "   Config File Content:"
echo "   {"
echo "     \"sshHost\": \"root@server.com\","
echo "     \"branch\": \"master\","
echo "     \"url\": \"https://example.com\","
echo "     \"frontendPort\": 3000,"
echo "     \"backendPort\": 3020"
echo "   }"
echo "   Command: node deployment-agent/intelligent-deployer-universal-v4.js production --config .deploy-config.json"
echo ""

# =============================================================================
# EXAMPLE 8: Complete Production Deployment with All Features
# =============================================================================
echo "8. Complete Production Deployment (Recommended)"
echo "   Command: node deployment-agent/intelligent-deployer-universal-v4.js production \\"
echo "     --ssh root@server.com \\"
echo "     --url https://example.com \\"
echo "     --force-continue \\"
echo "     --strict-12factor"
echo "   Features:"
echo "     - Forced continuation (resumes from any failure)"
echo "     - Strict 12-factor compliance validation"
echo "     - Zero-error detection and automatic recovery"
echo "     - Comprehensive deployment reporting"
echo ""

# =============================================================================
# EXAMPLE 9: Health Check Only
# =============================================================================
echo "9. Health Check Only (Verify Deployment)"
echo "   Command: node deployment-agent/intelligent-deployer-universal-v4.js production --verify --ssh root@server.com --url https://example.com"
echo "   Use Case: Check if deployment is healthy without deploying"
echo ""

# =============================================================================
# EXAMPLE 10: Custom Ports
# =============================================================================
echo "10. Custom Port Configuration"
echo "    Command: node deployment-agent/intelligent-deployer-universal-v4.js production --ssh root@server.com --url https://example.com --port 3001 --backend-port 3021"
echo "    Use Case: Deploy with custom frontend and backend ports"
echo ""

# =============================================================================
# TROUBLESHOOTING EXAMPLES
# =============================================================================
echo "=== TROUBLESHOOTING ==="
echo ""

echo "1. Deployment Failed - Resume from Current State"
echo "   node deployment-agent/intelligent-deployer-universal-v4.js production --force-continue"
echo ""

echo "2. Check Twelve-Factor Compliance"
echo "   node deployment-agent/intelligent-deployer-universal-v4.js production --ssh root@server.com --url https://example.com --strict-12factor"
echo ""

echo "3. Check Deployment State"
echo "   cat .deployment-state-v4.json"
echo ""

echo "4. Clear Deployment State (Start Fresh)"
echo "   rm .deployment-state-v4.json"
echo ""

echo "5. View Deployment Logs"
echo "   PM2_HOME=/etc/.pm2 pm2 logs"
echo ""

# =============================================================================
# BEST PRACTICES
# =============================================================================
echo "=== BEST PRACTICES ==="
echo ""

echo "1. ALWAYS use --force-continue for production deployments"
echo "   This ensures deployment reaches completion even if errors occur"
echo ""

echo "2. Enable --strict-12factor for new projects"
echo "   This enforces 12-factor compliance from the start"
echo ""

echo "3. Use environment variables for sensitive configuration"
echo "   Never hardcode credentials in config files"
echo ""

echo "4. Review deployment reports after each deployment"
echo "   Check for unresolved errors and 12-factor violations"
echo ""

echo "5. Test deployments in staging first"
echo "   Always validate in staging before production"
echo ""

# =============================================================================
# QUICK START
# =============================================================================
echo "=== QUICK START ==="
echo ""
echo "For first-time users, follow these steps:"
echo ""
echo "1. Create .deploy-config.json with your server details"
echo ""
echo "2. Set up SSH access to your server"
echo "   ssh-copy-id root@server.com"
echo ""
echo "3. Run your first deployment (development mode)"
echo "   node deployment-agent/intelligent-deployer-universal-v4.js development --local --url http://localhost:3000"
echo ""
echo "4. Run staging deployment"
echo "   node deployment-agent/intelligent-deployer-universal-v4.js staging --ssh root@staging.example.com --url https://staging.example.com"
echo ""

echo "5. Run production deployment (recommended)"
echo "   node deployment-agent/intelligent-deployer-universal-v4.js production --ssh root@server.com --url https://example.com --force-continue"
echo ""

echo "For more information, see README-V4.md"
