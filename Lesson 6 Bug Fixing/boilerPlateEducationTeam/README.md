# Full-Stack Boilerplate

React + Vite frontend (Vercel), Express backend (Render), and a Supabase database.

```
backend/    Express API: /health, /api/example
frontend/   React app, which calls the API through src/api.ts
```

How the pieces talk to each other:

```
Browser (React on Vercel)  →  Express API (Render)  →  Supabase (Postgres)
```

The frontend never talks to Supabase directly. It only calls your backend.

---

## 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste in `backend/schema.sql`, and click **Run**.
3. Go to **Project Settings → API Keys**. Supabase shows several values:

| Key | What it's for | Where it goes |
|---|---|---|
| **Project URL** | Address of your database | Backend |
| **Secret** (`sb_secret_...`) | Full access. Bypasses Row Level Security. | **Backend only** |
| **Publishable** (`sb_publishable_...`) | Limited access, safe in browsers | Not used yet (needed later for login) |
| **JWKS** | Verifies user login tokens | Not used yet (needed later for auth) |

> Older tutorials call the secret key the **service_role** key and the publishable key the **anon** key. They're the same idea with new names.

---

## 2. Run locally

Each folder has a `.env.example`. Copy it to `.env` and fill it in. The examples already point at `localhost`, which is what you want on your own machine.

**Backend**
```bash
cd backend
cp .env.example .env     # then paste in your Supabase URL + secret key
npm install
npm run dev              # visit http://localhost:3000/health and expect {"ok":true}
```

**Frontend** (in a second terminal)
```bash
cd frontend
cp .env.example .env     # VITE_API_URL=http://localhost:3000 is already correct
npm install
npm run dev              # visit http://localhost:5173
```

Add an item in the form. If it shows up in the list and in the Supabase **Table Editor**, everything is connected.

---

## 3. Environment variables explained

**What is `.env`, and why isn't it on GitHub?**
It holds secrets (like your Supabase secret key). The `.gitignore` keeps it out of git, so it **never gets pushed**. `.env.example` is the template you *do* commit, with fake values that show which keys are needed.

**So how do Render and Vercel get the values?**
You type them into each platform's dashboard (or paste your `.env` contents; both support that). Same keys, but **different values** for deployed vs local:

| Variable | Lives in | Local value | Deployed value |
|---|---|---|---|
| `SUPABASE_URL` | backend | your project URL | same |
| `SUPABASE_SECRET_KEY` | backend | `sb_secret_...` | same |
| `CORS_ORIGIN` | backend | `http://localhost:5173` | your Vercel URL |
| `PORT` | backend | `3000` | **don't set it** (Render sets it for you) |
| `VITE_API_URL` | frontend | `http://localhost:3000` | your Render URL |

**Why does the frontend only need one variable?**
The frontend only talks to your backend, so it only needs the backend's address. The Supabase keys stay on the server.

**Should I share my `.env` file with others?**
No. Your secret key gives full access to your database. Everyone makes their own Supabase project and their own `.env`.

---

## 4. Deploy

### The chicken-and-egg problem

Vercel needs Render's URL (`VITE_API_URL`), and Render needs Vercel's URL (`CORS_ORIGIN`). You solve it by deploying in this order:

1. **Render first**, with `CORS_ORIGIN` temporarily left as `http://localhost:5173`
2. **Vercel second**, with `VITE_API_URL` set to the Render URL
3. **Back to Render**, and change `CORS_ORIGIN` to the Vercel URL

### Step 1: Backend → Render

Render → **New → Web Service** → connect your GitHub repo.

**Does Render deploy a branch or a folder?** Both, as separate settings. Your repo has two apps in it, so you tell Render which folder holds the backend:

| Setting | Value |
|---|---|
| Branch | `main` (auto-deploys on every push) |
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

**Environment variables:** `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `CORS_ORIGIN=http://localhost:5173` (temporary).

**Where's my URL?** At the top of the service page, under its name, e.g. `https://my-api.onrender.com`.
✅ Check: open `https://my-api.onrender.com/health` and expect `{"ok":true}`.

### Step 2: Frontend → Vercel

Vercel → **Add New → Project** → import the same repo.

| Setting | Value |
|---|---|
| Framework Preset | Vite (auto-detected) |
| Root Directory | `frontend` |
| Build Command | `npm run build` (default) |
| Output Directory | `dist` (default) |

**Environment variable:** `VITE_API_URL` = your Render URL (no trailing `/`, no `/api`).

**Where's my URL?** In the project dashboard under **Domains**, e.g. `https://my-app.vercel.app`. Use this short one, not the long URLs with random characters (those are per-deploy previews).

⚠️ The site loads, but the list shows an error. **This is expected.** Open the browser console and you'll see a **CORS error**. The backend doesn't trust your Vercel URL yet.

### Step 3: Connect them

Back in Render → your service → **Environment** → set:

```
CORS_ORIGIN=https://my-app.vercel.app
```

Copy it exactly: `https://`, no trailing `/`. Save, and Render redeploys. Refresh your Vercel site and it should work.

To allow both local and deployed frontends, separate them with a comma:
`CORS_ORIGIN=http://localhost:5173,https://my-app.vercel.app`

---

## API

| Method | Route          | Body                | Returns        |
|--------|----------------|---------------------|----------------|
| GET    | `/health`      | none                | `{ ok: true }` |
| GET    | `/api/example` | none                | array of rows  |
| POST   | `/api/example` | `{ "title": "..." }` | created row    |

## Gotchas

- **Never put the secret key in the frontend.** Every `VITE_` variable gets bundled into the browser code, where anyone can read it.
- **Never commit `.env`.** Only commit `.env.example`.
- **Render's free tier sleeps** after 15 minutes idle, so the first request then takes about 30 seconds.
- **Changed `VITE_API_URL`?** Redeploy Vercel. Vite puts it into the build.
- **Vercel build failed?** `npm run build` type-checks first, so fix any TypeScript errors shown in the build log.
- **Seeing a CORS error?** `CORS_ORIGIN` on Render must exactly match your frontend URL.
