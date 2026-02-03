# Deploy srankpicks: Railway (API) + Cloudflare Pages (Frontend)

- **Frontend:** https://srankpicks.pages.dev (Cloudflare Pages)
- **API:** Railway (e.g. `https://sctr-railway-api.railway.app`)

---

## Part 1: Deploy API to Railway

1. Go to [railway.app](https://railway.app) → sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → select **rolandtalk/sctr-railway-api**.
3. **Settings** → **Root Directory** → leave **empty**.
4. **Networking** → **Generate Domain** → copy the URL (e.g. `https://sctr-railway-api-production-xxxx.up.railway.app`).
5. Wait for the build to finish. Test: `curl https://YOUR-RAILWAY-URL/health`

---

## Part 2: Deploy Frontend to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Pages** → **Create a project** → **Connect to Git**.
2. Select **rolandtalk/sctr-railway-api**.
3. Configure:
   - **Project name:** `srankpicks` (or any name → `srankpicks.pages.dev`)
   - **Production branch:** `main`
   - **Root directory:** `srankpicks` (important)
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. **Environment variables** (Production):
   - **Name:** `VITE_API_URL`
   - **Value:** Your Railway API URL (no trailing slash), e.g. `https://sctr-railway-api-production-xxxx.up.railway.app`
5. Click **Save and Deploy**.

---

## Verify

- Frontend: https://srankpicks.pages.dev loads the app.
- App fetches data from the Railway API (REF QQQ + 30 picks).
- If you see CORS errors, ensure `https://srankpicks.pages.dev` is in the API’s CORS `allow_origins` (already in `main.py`).

---

## Railway Root Directory Note

Railway uses the **repo root** as the project root. `main.py`, `requirements.txt`, and `railway.toml` are at the root, so **Root Directory** in Railway must stay **empty**.
