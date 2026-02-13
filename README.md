# SCTR Picks 300

Separate app from the 60-symbol project. Tracks **300 stocks** from the StockCharts SCTR page using the same scraping and yfinance logic.

- **Backend**: FastAPI in `main.py`; scrape via `fetch_sctr.py` (Top 300), single `/api/dashboard` with parallel yfinance.
- **Frontend**: Vite + React in `web/` with **search** (filter by symbol/name) and **pagination** (50 per page) for 300 rows.

## Run locally

1. Backend (from this directory):
   ```bash
   python -m venv .venv
   source .venv/bin/activate   # or .venv\Scripts\activate on Windows
   pip install -r requirements.txt
   playwright install chromium
   uvicorn main:app --reload --port 8000
   ```

2. Frontend (from `web/`):
   ```bash
   cd web && npm install && npm run dev
   ```
   Set `VITE_API_URL=http://localhost:8000` if the API is on another host (dev default is already localhost:8000).

## Deploy

- **API**: Deploy `main.py` + `fetch_sctr.py` + `requirements.txt` to Railway/Render/Fly.io (same pattern as the 60-symbol API). Ensure Playwright/Chromium is available (e.g. Railway Nixpacks or Docker with playwright install).
- **Frontend**: Build `web/` (e.g. `npm run build`) and set `VITE_API_URL` to your 300-stock API URL; deploy `web/dist` to Cloudflare Pages or any static host.
