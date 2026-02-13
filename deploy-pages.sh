#!/bin/sh
# Deploy frontend to Cloudflare Pages. Run from repo root.
# 1) Log in once: wrangler login
# 2) Set your Railway API URL (for the build): export VITE_API_URL=https://YOUR-API-URL.up.railway.app
# 3) Run: ./deploy-pages.sh

set -e
cd "$(dirname "$0")/web"
npm run build
cd ..
wrangler pages deploy web/dist --project-name=300spicks
