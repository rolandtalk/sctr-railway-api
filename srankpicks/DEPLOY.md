# Deploy srankpicks to Cloudflare Pages

**Target URL:** https://srankpicks.pages.dev

## Setup

1. Push this repo to GitHub (or use the `srankpicks` folder as a separate repo).
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Pages** → **Create a project** → **Connect to Git**.
3. Select your repo. If monorepo, set **Root directory** to `srankpicks`.
4. Configure:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment variable:** `VITE_API_URL` = your Railway API URL (e.g. `https://sctr-railway-api.railway.app`)

5. Deploy.

## Local dev

```bash
cd srankpicks
npm install
npm run dev
```

Set `VITE_API_URL=http://localhost:8000` (or create `.env` with it) if your API runs locally.
