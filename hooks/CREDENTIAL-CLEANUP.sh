#!/bin/bash

# V4.1.3 Credential Cleanup Script
# Scans entire Git history for hardcoded credentials and removes them
# CRITICAL: Run this to clean up private data from repository history

echo "🔒 V4.1.3 Credential Cleanup"
echo "═".repeat(70)
echo ""
echo "⚠️  WARNING: This script will scan entire Git history for credentials"
echo "         and help you remove them from the repository."
echo ""
echo "📋 What this does:"
echo "   1. Scans all commits in repository for credential patterns"
echo "   2. Lists all commits containing credentials"
echo "   3. Provides options to clean up the history"
echo ""

read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "🔍 Scanning Git history for credentials..."
echo "═".repeat(70)

# Credential patterns to search for
PATTERNS=(
  "ssh.*-i.*~\/\.ssh\/"
  "password\s*[:=]\s*['\"][^'\"]{4,}['\"]"
  "api[_-]?key\s*[:=]\s*['\"][^'\"]{10,}['\"]"
  "secret\s*[:=]\s*['\"][^'\"]{10,}['\"]"
  "token\s*[:=]\s*['\"][^'\"]{20,}['\"]"
  "aws[_-]?access[_-]?key[_-]?id"
  "aws[_-]?secret[_-]?access[_-]?key"
  "database[_-]?url.*@"
  "mongodb[_-]?uri.*@"
  "redis[_-]?url.*@"
  "jwt[_-]?secret"
  "private[_-]?key"
)

# Scan commits
COMMITS_WITH_CREDENTIALS=()

for PATTERN in "${PATTERNS[@]}"; do
  echo ""
  echo "🔎 Scanning for: $PATTERN"

  # Use git log -G to find commits that added/removed lines matching pattern
  COMMITS=$(git log -G"$PATTERN" --pretty=format:"%H|%s|%an|%ad" --date=short 2>/dev/null || echo "")

  if [ -n "$COMMITS" ]; then
    echo "   Found matches in commits:"
    echo "$COMMITS" | while IFS='|' read -r HASH SUBJECT AUTHOR DATE; do
      if [ -n "$HASH" ]; then
        echo "      • $DATE - $HASH (${SUBJECT:0:60}) by $AUTHOR"

        # Check if this commit is already in our list
        if [[ ! " ${COMMITS_WITH_CREDENTIALS[@]} " =~ " ${HASH} " ]]; then
          COMMITS_WITH_CREDENTIALS+=("$HASH|$SUBJECT|$AUTHOR|$DATE")
        fi
      fi
    done
  fi
done

echo ""
echo "═".repeat(70)
echo "📊 SCAN SUMMARY"
echo "═".repeat(70)
echo ""

if [ ${#COMMITS_WITH_CREDENTIALS[@]} -eq 0 ]; then
  echo "✅ No credentials found in Git history!"
  echo ""
  echo "Your repository is clean. 🎉"
  exit 0
fi

echo "⚠️  Found ${#COMMITS_WITH_CREDENTIALS[@]} commit(s) with potential credentials:"
echo ""

for COMMIT in "${COMMITS_WITH_CREDENTIALS[@]}"; do
  IFS='|' read -r HASH SUBJECT AUTHOR DATE <<< "$COMMIT"
  echo "   • $DATE - $HASH"
  echo "     Subject: $SUBJECT"
  echo "     Author: $AUTHOR"
  echo ""
done

echo "═".repeat(70)
echo ""
echo "🛠️  CLEANUP OPTIONS"
echo ""
echo "You have several options to clean up credential history:"
echo ""
echo "1. git rm-credential <commit-hash>"
echo "   → Remove specific commit (requires rebase)"
echo ""
echo "2. git filter-branch --tree-filter 'sed -i ...' HEAD"
echo "   → Rewrite history to remove credentials (DESTRUCTIVE)"
echo ""
echo "3. git filter-repo"
echo "   → Modern replacement for filter-branch (DESTRUCTIVE)"
echo ""
echo "4. BFG Repo-Cleaner"
echo "   → Specialized tool for credential removal"
echo ""
echo "⚠️  WARNING: History rewriting is DESTRUCTIVE and changes all commit hashes!"
echo "    Only do this on your own repositories. Coordinate with team first."
echo ""

read -p "View detailed information for each commit? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  for COMMIT in "${COMMITS_WITH_CREDENTIALS[@]}"; do
    IFS='|' read -r HASH SUBJECT AUTHOR DATE <<< "$COMMIT"

    echo ""
    echo "═".repeat(70)
    echo "Commit: $HASH"
    echo "Date: $DATE"
    echo "Author: $AUTHOR"
    echo "Subject: $SUBJECT"
    echo ""
    echo "Files changed:"
    git show --name-only --pretty=format:"" $HASH | head -20
    echo ""
    echo "Matching lines:"
    git show $HASH | grep -iE "(${PATTERNS[*]})" | head -10
    echo ""
  done
fi

echo ""
echo "═".repeat(70)
echo "📚 RECOMMENDED CLEANUP STEPS"
echo "═".repeat(70)
echo ""
echo "1. Backup your repository:"
echo "   git clone --mirror <your-repo> <backup-repo>"
echo ""
echo "2. Install BFG Repo-Cleaner (recommended):"
echo "   brew install bfg"
echo "   # or download from: https://rtyley.github.io/bfg-repo-cleaner/"
echo ""
echo "3. Clean credentials:"
echo "   bfg --replace-text passwords.txt <repo-dir>"
echo ""
echo "4. Clean large files (optional):"
echo "   bfg --strip-blobs-bigger-than 100K <repo-dir>"
echo ""
echo "5. Finish cleanup:"
echo "   cd <repo-dir>"
echo "   git reflog expire --expire=now --all"
echo "   git gc --prune=now --aggressive"
echo ""
echo "6. Force push to remote:"
echo "   git push origin --force --all"
echo "   git push origin --force --tags"
echo ""
echo "7. Notify all team members to re-clone:"
echo "   git clone <your-repo-url>"
echo ""

# Create passwords.txt file for BFG
cat > passwords.txt << 'EOF'
# Add one secret per line
# BFG will replace these with ***REMOVED***
~/.ssh/id_rsa_cheapestdata
id_rsa_cheapestdata
EOF

echo "✅ Created passwords.txt file for BFG Repo-Cleaner"
echo ""
echo "📖 Edit passwords.txt to add your credentials, one per line"
echo ""

read -p "Attempt automatic cleanup with BFG? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  if command -v bfg &> /dev/null; then
    echo "🚀 Running BFG Repo-Cleaner..."
    bfg --replace-text passwords.txt .

    echo ""
    echo "🔄 Running git gc..."
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive

    echo ""
    echo "✅ Cleanup complete!"
    echo ""
    echo "⚠️  IMPORTANT: Force push to update remote:"
    echo "   git push origin --force --all"
    echo "   git push origin --force --tags"
    echo ""
    echo "📢 Notify all team members to re-clone the repository!"
  else
    echo "❌ BFG Repo-Cleaner not found."
    echo ""
    echo "Install it first:"
    echo "   brew install bfg"
    echo "   # or download from: https://rtyley.github.io/bfg-repo-cleaner/"
  fi
fi

echo ""
echo "🔒 Credential cleanup complete!"
echo ""
