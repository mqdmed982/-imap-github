# Inboxious — GitHub Pages Edition

A multi-account email inbox tester. Check whether your emails land in **Inbox** or **Spam** across Gmail, Outlook, Yahoo, and more.

---

## Architecture

GitHub Pages only serves **static files** — it cannot run a Node.js server. Inboxious is therefore split into two parts:

| Part | Hosting | What it does |
|------|---------|--------------|
| **Frontend** (React) | GitHub Pages (free) | UI — displays emails, stats, charts |
| **Backend** (Node/Express + PostgreSQL) | Render / Railway / any VPS | Fetches emails via IMAP, stores them in Postgres, exposes a REST API |

---

## Quick Start

### Step 1 — Deploy the Backend

You need a server to run the backend. **Render.com free tier** works well.

1. Create a new **Web Service** on Render pointing to the `backend/` folder.
2. Add a **PostgreSQL** database on Render and copy its `DATABASE_URL`.
3. Set these environment variables in Render:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | Your Render Postgres URL |
   | `FRONTEND_URL` | `https://<your-username>.github.io` |
   | `ACCOUNT_1_NAME` | Your name |
   | `ACCOUNT_1_EMAIL` | yourname@gmail.com |
   | `ACCOUNT_1_PASSWORD` | Gmail App Password (not your real password) |
   | `ACCOUNT_1_HOST` | `imap.gmail.com` |
   | `ACCOUNT_1_PORT` | `993` |
   | `POLL_INTERVAL` | `60` |

4. Deploy. Note your backend's public URL, e.g. `https://inboxious-backend.onrender.com`.

> **Gmail App Passwords:** Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) — you need 2FA enabled.

---

### Step 2 — Deploy the Frontend to GitHub Pages

```bash
cd frontend

# 1. Edit package.json — set your homepage:
#    "homepage": "https://<YOUR-USERNAME>.github.io/<YOUR-REPO-NAME>"

# 2. Create .env with your backend URL:
echo "REACT_APP_API_URL=https://your-backend.onrender.com" > .env

# 3. Install dependencies
npm install

# 4. Deploy to GitHub Pages
npm run deploy
```

This runs `npm run build` then pushes the `build/` folder to the `gh-pages` branch of your repository. GitHub Pages will serve from that branch automatically.

> **First time?** Make sure GitHub Pages is enabled in your repo:  
> **Settings → Pages → Source → Deploy from branch → `gh-pages` / `/ (root)`**

---

### Step 3 — Open your site

Visit `https://<YOUR-USERNAME>.github.io/<YOUR-REPO-NAME>`

---

## Local Development

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env        # fill in your values
npm install
node server.js

# Terminal 2 — frontend
cd frontend
# .env is NOT needed locally — the proxy in package.json handles it
npm install
npm start
```

> The `"proxy": "http://localhost:4000"` line in `package.json` forwards API calls to the local backend during development. This proxy is only active with `npm start` — it does **not** apply to the built/deployed site.

---

## Adding More Email Accounts

In your backend's environment variables, add more `ACCOUNT_N_*` blocks:

```
ACCOUNT_2_NAME=Second Inbox
ACCOUNT_2_EMAIL=second@outlook.com
ACCOUNT_2_PASSWORD=app_password_here
ACCOUNT_2_HOST=imap-mail.outlook.com
ACCOUNT_2_PORT=993
```

Restart the backend after adding accounts.

---

## Project Structure

```
inboxious/
├── backend/          ← Node.js API (deploy to Render/Railway)
│   ├── server.js     — Express server + cron polling
│   ├── routes.js     — REST API endpoints
│   ├── imap.js       — IMAP email fetching
│   ├── db.js         — PostgreSQL setup
│   └── .env.example  — Environment variable template
│
└── frontend/         ← React app (deploy to GitHub Pages)
    ├── src/
    │   ├── pages/Dashboard.jsx       — Main dashboard
    │   ├── components/AccountPanel.jsx
    │   ├── components/EmailViewer.jsx
    │   ├── components/Badge.jsx
    │   ├── components/DonutChart.jsx
    │   └── hooks/useEmails.js        — Data fetching hook
    ├── public/index.html
    └── .env.example  — Set REACT_APP_API_URL here
```

---

## Deploying Updates

After changing frontend code, just run:

```bash
cd frontend
npm run deploy
```

After changing backend code, push to your Render/Railway service (or redeploy manually).
