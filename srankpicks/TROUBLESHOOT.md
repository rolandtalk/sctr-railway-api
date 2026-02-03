# srankpicks – Troubleshooting

## App fails to load or shows error

### 1. Check the correct URL

Your Cloudflare Pages URL depends on the **project name**:
- If project is **srankpicks** → https://srankpicks.pages.dev
- If project is **sctr-railway-api** → https://sctr-railway-api.pages.dev

### 2. VITE_API_URL (required)

The app needs your Railway API URL at **build time**.

**Cloudflare Dashboard** → Your project → **Settings** → **Environment variables**:

| Name           | Value (example)                                          |
|----------------|----------------------------------------------------------|
| VITE_API_URL   | https://web-production-1b15c.up.railway.app              |

Use your real Railway URL (no trailing slash). Then **Redeploy**.

### 3. Railway API must be running

Test your API:
```bash
curl https://YOUR-RAILWAY-URL/health
```

Expected: `{"status":"ok"}`

### 4. Cloudflare build settings

- **Root directory:** `srankpicks`
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Deploy command:** `npx wrangler pages deploy dist` or leave default

### 5. Verify deploy

- Cloudflare Dashboard → **Deployments** → latest should be **Success**
- Open the deployment log and confirm `npm run build` completed
- If deploy command fails, try removing it and let Cloudflare auto-deploy
