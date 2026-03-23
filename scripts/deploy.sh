#!/bin/bash
set -e

cd "$(dirname "$0")/.."

# Build
npm run build

# Extract build ID from the built JS (it's baked in by Vite define)
BUILD_ID=$(grep -oP '__BUILD_ID__\s*=\s*"\K[^"]+' dist/assets/index-*.js 2>/dev/null || echo "")

# If not found in source, extract from vite config at build time
if [ -z "$BUILD_ID" ]; then
  # Fallback: generate one matching the vite.config.ts logic
  BUILD_ID=$(date +%s | node -e "process.stdin.on('data',d=>{process.stdout.write(parseInt(d).toString(36))})")$(head -c 4 /dev/urandom | xxd -p | head -c 4)
fi

# Write version.json
echo "{\"buildId\":\"$BUILD_ID\"}" > dist/version.json

echo "Build ID: $BUILD_ID"
echo "Deploying..."

# Deploy to Cloudflare Pages
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-$(grep CLOUDFLARE_API_TOKEN ~/.openclaw/.env 2>/dev/null | cut -d= -f2)}" \
  npx wrangler pages deploy dist --project-name command-center

echo "Deployed!"
