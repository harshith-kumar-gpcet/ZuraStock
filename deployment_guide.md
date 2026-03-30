# 🚀 ZuraStock Deployment Guide: Render & Railway

This guide provides the exact steps to deploy ZuraStock to a production cloud environment with persistent database storage.

---

## 1️⃣ GitHub Preparation
Before deploying, your project must be on GitHub.
1. **Initialize Git**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for production"
   ```
2. **Push to a new repo**:
   - Create a repository on [github.com](https://github.com/).
   - Follow the instructions to link your local folder:
     ```bash
     git remote add origin https://github.com/YOUR_USERNAME/zurastock.git
     git push -u origin main
     ```

---

## 2️⃣ Deployment on Render (Recommended)
Render is perfect for FastAPI projects with WebSockets and SQLite disks.

### Step 1: Create a Web Service
1. Log in to [Render.com](https://render.com/).
2. Click **New +** > **Web Service**.
3. Select your `zurastock` repository.

### Step 2: Configure Service Settings
* **Name**: `zurastock-app`
* **Region**: Choose the one closest to your users (e.g., `Singapore` or `US East`).
* **Runtime**: `Python 3`
* **Build Command**: `pip install -r backend/requirements.txt`
* **Start Command**:
  ```bash
  gunicorn -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --workers 1 --timeout 120 backend.main:app
  ```

### Step 3: Important - SQLite Persistence
> [!CAUTION]
> **Without a Disk, your data (portfolios/watchlists) will be wiped every time the server restarts.**

1. Go to the **Disks** tab in Render.
2. Click **Add Disk**:
   - **Name**: `db-disk`
   - **Mount Path**: `/data`
   - **Size**: `1GB`
3. Go to the **Environment** tab and add these variables:
   - `PORT`: `10000` (Default for Render)
   - `DATABASE_URL`: `sqlite:////data/zurastock.db`

---

## 3️⃣ Alternative: Railway.app
Railway is even simpler and auto-detects most settings.

1. Connect your GitHub repo on [Railway.app](https://railway.app/).
2. In **Variables**, add:
   - `PORT`: `8001`
3. In **Settings** > **Volumes**, click **Add Volume**:
   - **Mount Path**: `/data`
4. Update **Variables**:
   - `DATABASE_URL`: `sqlite:////data/zurastock.db`

---

## 🛠️ Final Checklist
- [ ] Check your deployment logs for any `ModuleNotFoundError`.
- [ ] Verify you can log in as `demo_user` (pass: `demo_pass`).
- [ ] Ensure the **Market Sentiment** and **Live Prices** are updating.
- [ ] Test the **AI Portfolio Builder** and **AI Chat**.

> [!TIP]
> **Need to update the app?** Just `git push` your changes to GitHub, and Render/Railway will automatically redeploy the new version!
