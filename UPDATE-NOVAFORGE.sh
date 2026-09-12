#!/usr/bin/env bash
set -euo pipefail
echo "=== Novaforge auto update ==="
command -v git >/dev/null || { echo "Install git first"; exit 1; }
REPO="${REPO_URL:-https://github.com/davekavan888/New-project.git}"
DIR="$(mktemp -d)/novaforge"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
git clone "$REPO" "$DIR"
cd "$DIR"
cp -f "$SCRIPT_DIR/files/index.html" index.html
mkdir -p src/pages
cp -f "$SCRIPT_DIR/files/src/main.tsx" src/main.tsx
cp -f "$SCRIPT_DIR/files/src/App.tsx" src/App.tsx
cp -f "$SCRIPT_DIR/files/src/index.css" src/index.css
cp -f "$SCRIPT_DIR/files/src/pages/ExtraPages.tsx" src/pages/ExtraPages.tsx
git add index.html src/main.tsx src/App.tsx src/index.css src/pages/ExtraPages.tsx
git commit -m "force: light desk + locks + report card" || true
git push origin HEAD
echo "SUCCESS — wait for Vercel, then hard-refresh novaforges.in"
