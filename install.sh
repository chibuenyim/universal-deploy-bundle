#!/usr/bin/env bash

#
# Universal Deploy + Zero-Error Verification Bundle Installer
#
# This script installs the bundle into your project
#

set -e

echo "🚀 Universal Deploy + Zero-Error Verification Bundle Installer"
echo "================================================================"
echo ""

# Check if project path provided
if [ -z "$1" ]; then
  echo "Usage: ./install.sh /path/to/your/project"
  echo ""
  echo "This will install:"
  echo "  - Verification scripts (verify-zero-errors.js, verify-runtime-errors.js)"
  echo "  - E2E tests (runtime-errors.spec.ts)"
  echo "  - CI/CD workflows (frontend-deploy.yml, deploy-staging.yml)"
  echo "  - Location safety library (location-safety.ts, geocoding.ts)"
  echo ""
  exit 1
fi

PROJECT_PATH="$1"

# Verify project exists
if [ ! -d "$PROJECT_PATH" ]; then
  echo "❌ Error: Project directory does not exist: $PROJECT_PATH"
  exit 1
fi

echo "📁 Target project: $PROJECT_PATH"
echo ""

# Create directories
echo "📂 Creating directories..."
mkdir -p "$PROJECT_PATH/scripts"
mkdir -p "$PROJECT_PATH/e2e"
mkdir -p "$PROJECT_PATH/.github/workflows"
mkdir -p "$PROJECT_PATH/src/lib/utils"
echo "✓ Directories created"
echo ""

# Copy verification scripts
echo "📋 Installing verification scripts..."
cp scripts/verify-zero-errors.js "$PROJECT_PATH/scripts/"
cp scripts/verify-runtime-errors.js "$PROJECT_PATH/scripts/"
echo "✓ Verification scripts installed"
echo ""

# Copy E2E tests
echo "🎭 Installing E2E tests..."
cp e2e/runtime-errors.spec.ts "$PROJECT_PATH/e2e/"
echo "✓ E2E tests installed"
echo ""

# Copy CI/CD workflows
echo "⚙️  Installing CI/CD workflows..."
cp .github/workflows/frontend-deploy.yml "$PROJECT_PATH/.github/workflows/"
cp .github/workflows/deploy-staging.yml "$PROJECT_PATH/.github/workflows/"
echo "✓ CI/CD workflows installed"
echo ""

# Copy utility libraries
echo "📚 Installing utility libraries..."
cp lib/location-safety.ts "$PROJECT_PATH/src/lib/utils/"
cp lib/geocoding.ts "$PROJECT_PATH/src/lib/utils/"
echo "✓ Utility libraries installed"
echo ""

# Make scripts executable
chmod +x "$PROJECT_PATH/scripts/verify-zero-errors.js"
chmod +x "$PROJECT_PATH/scripts/verify-runtime-errors.js"

echo "================================================================"
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo ""
echo "1. Install Playwright for E2E tests:"
echo "   cd $PROJECT_PATH"
echo "   npm install -D @playwright/test"
echo ""
echo "2. Add to package.json scripts:"
echo "   'verify-zero-errors': 'node scripts/verify-zero-errors.js',"
echo "   'verify-runtime': 'node scripts/verify-runtime-errors.js',"
echo "   'test:e2e:runtime': 'playwright test e2e/runtime-errors.spec.ts',"
echo "   'verify-all': 'npm run verify-zero-errors && npm run build && npm run verify-runtime && npm run test:e2e:runtime'"
echo ""
echo "3. Update CI/CD workflows:"
echo "   - Edit .github/workflows/frontend-deploy.yml"
echo "   - Edit .github/workflows/deploy-staging.yml"
echo "   - Update paths to match your project structure"
echo "   - Configure SSH secrets"
echo ""
echo "4. Run verification:"
echo "   npm run verify-all"
echo ""
echo "📚 See README.md for full documentation"
echo ""
