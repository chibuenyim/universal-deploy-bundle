#!/usr/bin/env bash

# UNIVERSAL SSH SETUP - Passwordless Deployment
# This script sets up SSH key-based authentication for universal deployments

set -e

echo "🔐 UNIVERSAL SSH SETUP FOR DEPLOYMENT"
echo "======================================"
echo ""

# Check if SSH keys exist
if [ ! -f ~/.ssh/id_rsa.pub ]; then
    echo "❌ No SSH keys found. Generating..."
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
    echo "✅ SSH keys generated"
else
    echo "✅ SSH keys already exist"
fi

echo ""
echo "📤 Copying SSH public key to server..."
echo ""

# Get SSH host from config or use default
SSH_HOST=${1:-"root@80.65.211.16"}

echo "Target: $SSH_HOST"
echo ""

# Copy SSH key to server
ssh-copy-id -i ~/.ssh/id_rsa.pub "$SSH_HOST"

echo ""
echo "✅ SSH key copied successfully!"
echo ""
echo "🧪 Testing passwordless SSH..."
echo ""

# Test SSH connection
ssh -o BatchMode=yes "$SSH_HOST" "echo '✅ Passwordless SSH works!'"

if [ $? -eq 0 ]; then
    echo ""
    echo "✨ UNIVERSAL DEPLOYMENT READY!"
    echo ""
    echo "You can now deploy without entering passwords:"
    echo "  npm run deploy:staging"
    echo "  npm run deploy:production"
    echo ""
else
    echo ""
    echo "❌ Passwordless SSH test failed"
    echo "You may need to enter your SSH key passphrase once"
    echo ""
fi
