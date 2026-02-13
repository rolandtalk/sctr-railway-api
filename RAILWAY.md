# Deploy to Railway

## Frontend (this app)

1. **Push to GitHub** (if you haven’t already).
2. In [Railway](https://railway.app), **New Project** → **Deploy from GitHub repo** → choose this repo.
3. Set **Root Directory** to `web` (Settings → Source → Root Directory).
4. Add a **variable** so the app can reach your API:
   - Name: `VITE_API_URL`
   - Value: your API URL, e.g. `https://your-api-service.up.railway.app`  
   (No trailing slash. This is baked in at build time.)
5. Deploy. Railway will run `npm install`, `npm run build`, then `npm start` (serves `dist/` with `serve`).

Your 300 Best SCTR Picks UI will be live at the generated Railway URL.

## API (backend)

If your dashboard API is a separate service (e.g. another repo):

- Deploy that repo to Railway as a **second service** in the same project (or another project).
- Use that service’s public URL as `VITE_API_URL` in the frontend service above.

If the API and frontend are in the same repo (e.g. `api/` and `web/`), add two services and set each service’s Root Directory to `api` and `web` respectively.
