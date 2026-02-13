# Deploy frontend to Cloudflare Pages

Use **one Railway service** (API only) and host the UI on **Cloudflare Pages** (free, fast CDN).  
Your current Railway frontend: [https://300spicks-production.up.railway.app/](https://300spicks-production.up.railway.app/)

---

## Set up Cloudflare now (≈2 minutes)

1. **Open:** [Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git](https://dash.cloudflare.com/?to=/:account/pages/new/create).
2. **Connect:** Choose **GitHub** → authorize if needed → select repo **rolandtalk/300spicks**.
3. **Configure build:**
   - **Project name:** `300spicks` (or any name; you’ll get `https://<name>.pages.dev`).
   - **Production branch:** `main`.
   - **Build command:** `cd web && npm ci && npm run build`
   - **Build output directory:** `web/dist`
   - **Root directory:** leave blank.
4. **Add env var:** Under “Environment variables (advanced)” → **Add variable**:
   - **Variable name:** `VITE_API_URL`
   - **Value:** Your **Railway API** URL (the service with Root = `api`), e.g. `https://300spicks-xxxx.up.railway.app` — **not** `300spicks-production` (that’s the frontend). No trailing slash.
5. **Save and Deploy.** When the build finishes, your UI will be at `https://300spicks.pages.dev` (or your project name).

---

## 1. API on Railway (one service)

- Deploy only the **API**: same repo **300spicks**, **Root Directory** = **`api`**.
- Copy the API URL (e.g. `https://300spicks-xxxx.up.railway.app`).
- Remove or ignore the Railway **frontend** service (the one with Root Directory `web`) if you no longer need it.

## 2. Frontend on Cloudflare Pages

**Option A – Dashboard (no CLI):**

1. **Dashboard**: [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. **Repo**: Select **rolandtalk/300spicks**.
3. **Build settings**:
   - **Framework preset**: None (or Vite if available).
   - **Build command**: `cd web && npm ci && npm run build`
   - **Build output directory**: `web/dist`
   - **Root directory**: leave empty (repo root).
4. **Environment variable** (so the built app calls your API):
   - **Variable name**: `VITE_API_URL`
   - **Value**: your Railway API URL, e.g. `https://300spicks-xxxx.up.railway.app` (no trailing slash).
5. **Save and Deploy**. Your site will be at `https://300spicks.pages.dev` (or the project name you chose).

**Option B – Deploy from your machine (CLI):**

1. Log in once: `wrangler login` (opens browser).
2. Set your Railway **API** URL and deploy:
   ```bash
   export VITE_API_URL=https://YOUR-RAILWAY-API-URL.up.railway.app
   chmod +x deploy-pages.sh && ./deploy-pages.sh
   ```
   Or without the script: `cd web && npm run build && cd .. && wrangler pages deploy web/dist --project-name=300spicks`

## 3. CORS

The API in `api/main.py` already allows `https://300spicks.pages.dev`. If you use a different Pages URL (e.g. a custom domain), add it to `allow_origins` in `api/main.py` and redeploy the API.

## Summary

| What        | Where              |
|------------|--------------------|
| Frontend   | Cloudflare Pages   |
| API        | Railway (Root = `api`) |
| `VITE_API_URL` | Set in Pages build env to your Railway API URL |
