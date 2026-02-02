# SCTR Picks API

FastAPI service: scrapes StockCharts SCTR Top 30 (Playwright) and computes 5D / 20D / 60D price performance with **yfinance**. Used by the SCTR Picks frontend (Cloudflare Pages).

## Local run

From **sctr-railway-api/** (self-contained; no repo root needed):

```bash
cd sctr-railway-api
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- API: http://localhost:8000  
- Docs: http://localhost:8000/docs  
- Endpoint: `POST` or `GET` `/api/sctr-performance` → `{ "data": [ { "rank", "symbol", "name", "perf5d", "perf20d", "perf60d" }, ... ] }`

Requires Playwright Chromium: `uv run python -m playwright install chromium` (once).

## Deploy (Railway / Render / Fly.io)

Cloudflare Workers/Pages cannot run Python or Playwright. Deploy this service to Railway, Render, or Fly.io.

1. **Railway**: Connect repo **rolandtalk/sctr-railway-api**, root directory `sctr-railway-api`, see **RESTART.md**.
2. **Render**: New Web Service, root `sctr-railway-api`, build `pip install -r requirements.txt && playwright install chromium`, start `uvicorn main:app --host 0.0.0.0 --port $PORT`.
3. **Fly.io**: Dockerfile or fly.toml that installs deps + Chromium and runs uvicorn.

**CORS**: Allowed origins include `https://sctrpicks.pages.dev` and localhost. Add more in `main.py` if needed.

After deploy, set the frontend env `VITE_API_URL` to this API URL.
