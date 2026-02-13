#!/bin/sh
# Run the API locally (port 8000). Use from api/ folder.
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  echo "Creating venv and installing deps..."
  python3 -m venv .venv
  ./.venv/bin/pip install -r requirements.txt
  ./.venv/bin/playwright install chromium
fi
. .venv/bin/activate
exec uvicorn main:app --reload --port 8000
