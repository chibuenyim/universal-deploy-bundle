#!/bin/bash

# V4.1.3 Git Hooks Installation Script
# Installs pre-commit and pre-push hooks for automatic code scanning

echo "🔧 Installing V4.1.3 Pre-Commit Hooks..."
echo "═".repeat(60)

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Create .git/hooks directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/.git/hooks"

# Copy hook files
echo "📁 Copying hooks to .git/hooks/..."

# Pre-commit hook
cp "$SCRIPT_DIR/pre-commit" "$PROJECT_ROOT/.git/hooks/pre-commit"
chmod +x "$PROJECT_ROOT/.git/hooks/pre-commit"
echo "   ✓ pre-commit installed"

# Pre-push hook
cp "$SCRIPT_DIR/pre-push" "$PROJECT_ROOT/.git/hooks/pre-push"
chmod +x "$PROJECT_ROOT/.git/hooks/pre-push"
echo "   ✓ pre-push installed"

# Create example configuration file
CONFIG_FILE="$PROJECT_ROOT/.pre-commit-config.json"
if [ ! -f "$CONFIG_FILE" ]; then
  echo ""
  echo "📝 Creating example configuration file..."
  cat > "$CONFIG_FILE" << 'EOF'
{
  "enabled": true,
  "blockOn": {
    "credentials": true,
    "buildErrors": true,
    "twelveFactor": false,
    "debugCode": false
  },
  "warnOn": {
    "debugCode": true,
    "todos": true,
    "commentedCode": true,
    "longLines": false
  },
  "exceptions": [
    "**/*.test.js",
    "**/*.spec.js",
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/node_modules/**",
    "**/dist/**",
    "**/.next/**",
    "**/build/**"
  ],
  "maxLineLength": 120
}
EOF
  echo "   ✓ .pre-commit-config.json created"
fi

echo ""
echo "═".repeat(60)
echo "✅ V4.1.3 Pre-Commit Hooks installed successfully!"
echo ""
echo "📚 What's installed:"
echo "   • Pre-commit hook: Scans code before commit"
echo "   • Pre-push hook: Scans code before push"
echo "   • Configuration: .pre-commit-config.json"
echo ""
echo "🎯 What gets scanned:"
echo "   • Hardcoded credentials (SSH keys, API keys, passwords)"
echo "   • Build errors (TypeScript, ESLint, modules)"
echo "   • Debug code (console.log, debugger, TODOs)"
echo "   • Commented-out code blocks"
echo "   • Twelve-Factor violations"
echo ""
echo "⚙️  Configuration:"
echo "   Edit .pre-commit-config.json to customize behavior"
echo ""
echo "🧪 Test the scanner:"
echo "   node hooks/pre-commit-scan.js"
echo ""
echo "📖 Documentation:"
echo "   See PRE-COMMIT-SCAN.md for details"
echo ""
echo "🚀 Ready to commit with confidence!"
echo ""
