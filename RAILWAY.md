# Deploy to Railway

This repo has **two** parts: **frontend** (React in `web/`) and **API** (FastAPI in `main.py`). Use **two Railway services** in the same project.

---

## Service 1: Frontend (you already have this)

- **Root Directory:** `web`
- **URL:** e.g. `300spicks-production.up.railway.app`
- Builds and serves the React app.

## Service 2: API (add this)

1. In the same Railway project, click **+ New** → **GitHub Repo** → choose **300spicks** again (same repo).
2. For this new service, leave **Root Directory** empty (repo root). Railway will see `requirements.txt` and `Procfile` and run the Python API.
3. After deploy, open the new service → **Settings** → copy its **public URL** (e.g. `https://300spicks-xxxx.up.railway.app`).

## Connect frontend to API

1. Open **Service 1 (frontend)** → **Variables**.
2. Add: **`VITE_API_URL`** = the API service URL from step 3 above (no trailing slash).  
   Example: `https://300spicks-xxxx.up.railway.app`
3. **Redeploy** the frontend service (Deployments → ⋮ → Redeploy) so the new variable is baked into the build.

Then the live site at `300spicks-production.up.railway.app` will load data from your API.
