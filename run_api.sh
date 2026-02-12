#!/usr/bin/env bash
# Start the SCTR API with Playwright browsers from this repo (no system install needed).
cd "$(dirname "$0")"
export PLAYWRIGHT_BROWSERS_PATH="$(pwd)/.playwright-browsers"
exec .venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 "$@"
