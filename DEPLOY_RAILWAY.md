# Deploy SCTR API to Railway

**Repo:** [rolandtalk/sctr-railway-api](https://github.com/rolandtalk/sctr-railway-api)  
**Folder:** `sctr-railway-api` (no “sctrpicks-api” naming to avoid Cloudflare confusion).  
This project is independent of any “Stockshopping” workspace; you can use it as a standalone repo (see **RESTART.md**).

This service exposes two APIs plus a combined one. See **RESTART.md** for a full restart (new GitHub + Railway).

---

## APIs (once deployed)

| API | Method | Endpoint | Description |
|-----|--------|----------|-------------|
| **1. Scrape only** | GET | `/api/sctr-top30` | StockCharts SCTR top 30 symbols. Errors: `stage: "scrape"`. |
| **2. Price performance only** | GET | `/api/price-performance?symbols=AAPL,MSFT` | 5D/20D/60D % via yfinance. Errors: `stage: "performance"`. |
| **2. Price performance only** | POST | `/api/price-performance` | Body: `["AAPL", "MSFT", ...]`. Same as GET. |
| **Combined** | GET/POST | `/api/sctr-performance` | Scrape + performance. Errors include `stage: "scrape"` or `"performance"`. |

Other: `GET /` (service info), `GET /health` (health check), `GET /docs` (Swagger UI).

---

## Quick deploy (repo already exists)

1. **[railway.app](https://railway.app)** → sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → select **rolandtalk/sctr-railway-api**.
3. In the service **Settings** → **Root Directory** → **sctr-railway-api** (or leave empty if the repo root is already the API folder).
4. **Networking** → **Generate Domain** → copy the URL (e.g. `https://sctr-railway-api-production-xxxx.up.railway.app`).

---

## Test the API

Replace `YOUR-RAILWAY-URL` with your generated domain.

```bash
curl "https://YOUR-RAILWAY-URL/health"
curl "https://YOUR-RAILWAY-URL/api/sctr-top30"
curl "https://YOUR-RAILWAY-URL/api/price-performance?symbols=AAPL,MSFT,GOOGL"
curl -X POST "https://YOUR-RAILWAY-URL/api/price-performance" -H "Content-Type: application/json" -d '["AAPL","MSFT","GOOGL"]'
curl "https://YOUR-RAILWAY-URL/api/sctr-performance"
```

**Docs:** `https://YOUR-RAILWAY-URL/docs`

---

## Build / start (from config)

Railway uses **sctr-railway-api/railway.toml** and **Procfile** when Root Directory = **sctr-railway-api**:

- **Build:** `pip install -r requirements.txt && playwright install chromium`
- **Start:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Health:** `GET /health`

---

## Frontend env

Set your API base URL (no trailing slash), e.g.:

- **Name:** `VITE_API_URL`
- **Value:** `https://YOUR-RAILWAY-URL`

---

## Troubleshooting

- **Build fails:** Root Directory must be exactly **sctr-railway-api**; `requirements.txt`, `main.py`, and `railway.toml` must be in that folder.
- **App crashes:** In Railway **Logs**, check that start command is `uvicorn main:app --host 0.0.0.0 --port $PORT` and root is **sctr-railway-api**.
- **Playwright / Chromium:** Build must run `playwright install chromium`. If the environment doesn’t support it, you can still use **API 2** (`/api/price-performance`) with a fixed list of symbols.
