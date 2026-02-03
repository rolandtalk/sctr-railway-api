# How to use the Dockerfile

The Dockerfile uses **python:3.12-slim** + Chromium only (smaller than the full Playwright image) so `/api/sctr-top30` works.

---

## 1. Build the image (local)

From the **sctr-railway-standalone** folder (repo root):

```bash
cd /path/to/sctr-railway-standalone
docker build -t sctr-railway-api .
```

---

## 2. Run the container (local)

```bash
docker run -p 8000:8000 -e PORT=8000 sctr-railway-api
```

Then open:

- http://localhost:8000/health  
- http://localhost:8000/docs  
- http://localhost:8000/api/sctr-top30  

Stop with `Ctrl+C` or `docker stop <container_id>`.

---

## 3. Deploy on Railway with Dockerfile

Railway can build from a Dockerfile instead of `railway.toml` build commands.

1. **railway.app** → your project → **sctr-railway-api** service.
2. **Settings** → **Build** (or **Deploy**):
   - **Builder:** Dockerfile (or “Use Dockerfile”).
   - **Root Directory:** empty (repo root = API).
3. Redeploy (push to `main` or click **Redeploy**).

Railway will run `docker build` from the repo root and then run the image; it sets `PORT` for you. No need to run `playwright install` in the build—Chromium is already in the image.

---

## 4. Optional: run in background (detached)

```bash
docker run -d -p 8000:8000 -e PORT=8000 --name sctr-api sctr-railway-api
# logs
docker logs -f sctr-api
# stop
docker stop sctr-api
docker rm sctr-api
```

---

## Troubleshooting: Railway build timeout

If Railway times out during "importing to docker":

1. **Slim image:** The Dockerfile uses python-slim + Chromium only (not the full Playwright image) to reduce size.
2. **Excluded files:** `.dockerignore` excludes `srankpicks/`, `node_modules`, etc. to speed up context upload.
3. **Fallback:** If it still times out, try Railway's **native build** (no Docker): in Settings → Build → disable "Use Dockerfile", or temporarily rename `Dockerfile` to `Dockerfile.bak`. Railway will use `railway.toml` build commands. Note: Playwright on Nixpacks may require additional config.

---

## Summary

| Goal              | Command / step |
|-------------------|----------------|
| Build image       | `docker build -t sctr-railway-api .` |
| Run locally       | `docker run -p 8000:8000 -e PORT=8000 sctr-railway-api` |
| Deploy Railway    | Use Dockerfile as builder in Railway → redeploy |
