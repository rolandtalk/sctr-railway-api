# Restart: GitHub + Railway (no Cloudflare “sctrpicks-api” naming)

Use this after deleting the old repo and Railway project. Names are distinct so they don’t conflict with Cloudflare. **This project has nothing to do with any “Stockshopping” workspace** — you can run it as a standalone repo (see below).

- **GitHub repo:** `rolandtalk/sctr-railway-api`
- **Folder in repo:** either `sctr-railway-api` inside a parent repo, or **repo root = this folder** (standalone)
- **Railway:** New project from that repo; Root Directory = `sctr-railway-api` if repo has a parent, or **empty** if standalone

---

## Step 1: Create the GitHub repo

1. Go to **https://github.com/new**
2. **Repository name:** `sctr-railway-api`
3. **Owner:** rolandtalk
4. **Public**
5. Do **not** add README, .gitignore, or license (empty repo)
6. Click **Create repository**

---

## Step 2: Push your code from this project root

Your project root is the folder that **contains** `sctr-railway-api` (the parent directory of this API folder).

```bash
cd /path/to/your/project/root   # the folder that contains sctr-railway-api

# Remove old remote if it pointed to deleted repo
git remote remove sctrpicks01 2>/dev/null || true

# Add the new repo
git remote add railway-repo https://github.com/rolandtalk/sctr-railway-api.git

# Commit and push (use main; if your branch is master, use master)
git add -A
git status
git commit -m "SCTR API on Railway: sctr-railway-api, restart"
git push -u railway-repo main
```

If GitHub shows `master` as default:  
`git push -u railway-repo main:main` so the branch on GitHub is `main`.

---

## Step 3: Create the Railway project

1. Go to **https://railway.app** and sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo**.
3. Select **rolandtalk/sctr-railway-api** (authorize Railway if asked).
4. Use branch **main**.

---

## Step 4: Set Root Directory (important)

1. Click the **service** (the box for your repo).
2. **Settings** tab.
3. Find **Root Directory** (under Source / Build).
4. Set to: **sctr-railway-api**
5. Save.

Railway will then use `sctr-railway-api/railway.toml` and `sctr-railway-api/Procfile` (build + start + health check).

---

## Step 5: Get your API URL

1. In the same service, open **Networking** (or **Settings** → **Networking**).
2. Click **Generate Domain** (or **Add Public Domain**).
3. Copy the URL.  
   **Your API domain:** `https://web-production-1b15c.up.railway.app` (no trailing slash).

---

## Step 6: Test the API

```bash
curl "https://web-production-1b15c.up.railway.app/health"
# Expect: {"status":"ok"}

curl "https://web-production-1b15c.up.railway.app/api/price-performance?symbols=AAPL,MSFT"
# Expect: JSON with perf5d, perf20d, perf60d
```

**Swagger UI:** https://web-production-1b15c.up.railway.app/docs

---

## Step 7: Use in your frontend

In your frontend (e.g. Cloudflare Pages or Vite):

- **Variable:** `VITE_API_URL` (or whatever your app uses)
- **Value:** `https://web-production-1b15c.up.railway.app` (no trailing slash)

Redeploy the frontend after setting the variable.

---

## Later: push updates

From your project root (folder that contains `sctr-railway-api`):

```bash
git add -A
git commit -m "Your change message"
git push railway-repo main
```

Railway will redeploy automatically.

---

**Summary:** New repo **rolandtalk/sctr-railway-api** → push code → Railway **New Project** from that repo → **Root Directory** = **sctr-railway-api** (or empty if standalone) → **Generate Domain** → use that URL as your API and in `VITE_API_URL`.

---

## Option: Standalone repo (get rid of the parent project)

If you want **this API to be its own project** with no parent folder (no Stockshopping, no other repo):

1. **Create the GitHub repo** as in Step 1 above: `rolandtalk/sctr-railway-api`, empty.

2. **Copy or move** the `sctr-railway-api` folder to a new location (e.g. `~/projects/sctr-railway-api`). That folder should contain only the API files (`main.py`, `requirements.txt`, `railway.toml`, etc.) — no parent “Stockshopping” or other project.

3. **Init git and push** from inside that folder:
   ```bash
   cd ~/projects/sctr-railway-api   # or wherever you put the API folder
   git init
   git add -A
   git commit -m "SCTR Railway API standalone"
   git branch -M main
   git remote add origin https://github.com/rolandtalk/sctr-railway-api.git
   git push -u origin main
   ```

4. **Railway:** New Project → Deploy from GitHub → **rolandtalk/sctr-railway-api**.  
   Leave **Root Directory empty** (the repo root is already the API).  
   Generate Domain and use that URL.

After this, the SCTR API lives in its own repo and folder; you never need the old parent project again.
