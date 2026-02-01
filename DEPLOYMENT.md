# Deployment Guide

This project is separated into `frontend` (React) and `backend` (Django).

## 1. Frontend 🚀 (Vercel)
Ideal for the React App.

1.  Push this repository to **GitHub**.
2.  Log in to **Vercel** and click **"Add New Project"**.
3.  Import your `Playto-Pulse` repository.
4.  **Configure Project**:
    *   **Framework Preset**: Vite (should be auto-detected).
    *   **Root Directory**: Click "Edit" and select `frontend`.
5.  Click **Deploy**.

*Note: The `frontend/vercel.json` file ensures routing works correctly (e.g., refresh on a post detail page won't 404).*

## 2. Backend 🛠️ (Railway / Render)
**Important**: Do not deploy the Backend to Vercel unless you use an external database (e.g., Neon, Supabase). Vercel is serverless/stateless, so your SQLite file would reset requests/sleeps.

**Recommended: Use Railway (easiest) or Render.**

### option A: Railway.app
1.  Log in to **Railway**.
2.  Click **"New Project"** > **"Deploy from GitHub repo"**.
3.  Select `Playto-Pulse`.
4.  Click **"Variables"** or "Settings":
    *   **Root Directory**: `backend`.
5.  Variables to set:
    *   `DJANGO_ALLOWED_HOSTS`: `*` (or your specific railway URL).
    *   `CORS_ALLOW_ALL_ORIGINS`: `True`.
6.  Railway usually auto-detects the `Dockerfile` or Python app. If using Dockerfile (recommended), it's ready to go.

### Option B: Render.com
1.  New **"Web Service"**.
2.  Connect Repo.
3.  **Root Directory**: `backend`.
4.  **Runtime**: Python 3.
5.  **Build Command**: `pip install -r requirements.txt && python manage.py migrate`.
6.  **Start Command**: `python manage.py runserver 0.0.0.0:$PORT` (For demo) or use Gunicorn.

## 3. Connecting Them 🔗
Once both are deployed:
1.  Copy your **Backend URL** (e.g., `https://playto-pulse.up.railway.app`).
2.  Go to your **Frontend Source Code** (`frontend/src/api.js`).
3.  Update the `baseURL`:
    ```javascript
    const api = axios.create({
        baseURL: 'https://playto-pulse.up.railway.app/api/', // Update this!
        // ...
    });
    ```
4.  Commit and Push the change. Vercel will auto-redeploy the Frontend.

## 4. Docker (Self-Hosted) 🐳
If you have a VPS (DigitalOcean/EC2), you can just run:

```bash
docker-compose up --build -d
```
The app will run on port `5173` (Frontend) and `8000` (Backend).
