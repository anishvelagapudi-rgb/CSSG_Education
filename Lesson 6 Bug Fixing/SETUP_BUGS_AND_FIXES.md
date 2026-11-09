# Lesson 6: Setup Bugs & Fixes for `boilerPlateEducationTeam`

Repo: https://github.com/ggreat317/boilerPlateEducationTeam (cloned into `./boilerPlateEducationTeam`, commit `4c59e0f`)

How this was tested: fresh clone on Linux, Node v24.16.0 / npm 11.13.0. Ran `npm install` in both folders, then `npm run build` and `npm run lint` in `frontend/`, then started the backend with and without a `.env` and hit every route with `curl`.

**Status key**
- ✅ **Reproduced**: I triggered it myself on the fresh clone.
- 📄 **Found in the code**: the bug is plainly in the files, but triggering it needs a real Supabase/Render/Vercel account.

---

## Part A: Bugs in the repo itself (should be fixed in the repo)

### A1. `backend/.env.example` has a typo in the secret key prefix 📄
**File:** `backend/.env.example`, line 7
```
SUPABASE_SECRET_KEY=ssb_secret_your-secret-key     <-- "ssb", should be "sb"
```
**What students see:** If a student keeps the prefix and only pastes over `your-secret-key`, they get `ssb_secret_...`. The server starts, but every request to `/api/example` returns `{"error":"Invalid API key"}` and the page shows that error.

**Fix:** Change the line in `.env.example` to:
```
SUPABASE_SECRET_KEY=sb_secret_your-secret-key
```
Students should paste the **whole** key copied from Supabase (Project Settings → API Keys → Secret) and replace the entire value.

---

### A2. `backend/.env.example` has a malformed JWKS URL 📄
**File:** `backend/.env.example`, line 8
```
SUPABASE_JWKS_URL=https://some-id/supabase.co/auth/v1/.well-known/jwks.json
                               ^ slash, should be a dot
```
**What students see:** Nothing yet, since the code doesn't read this variable. It will break later when the auth lesson uses it: token verification fails with a fetch or 404 error because the host is `some-id` instead of `some-id.supabase.co`.

**Fix:**
```
SUPABASE_JWKS_URL=https://your-project-id.supabase.co/auth/v1/.well-known/jwks.json
```

---

### A3. Publishable key placeholder says "secret" 📄
**File:** `backend/.env.example`, line 6
```
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-secret-key
```
**What students see:** They get confused about which key goes where, and some paste the **secret** key into the publishable slot or the reverse. If the publishable key ends up in `SUPABASE_SECRET_KEY`, RLS blocks the backend. The list then always comes back empty, and adding an item fails with `new row violates row-level security policy for table "example"`.

**Fix:**
```
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-publishable-key
```
Also tell students that **`SUPABASE_SECRET_KEY` must start with `sb_secret_`**.

---

### A4. Backend says "Server running" even when the port is already taken ✅
**File:** `backend/src/index.js`, last lines
```js
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```
**What students see (reproduced):** If something already uses port 3000, such as a second `npm run dev` in another terminal, an old project, or a hidden leftover node process, the terminal prints
```
Server running on http://localhost:3000
```
and then the process **quietly exits with code 0**. No error is shown. In Express 5 the listen error goes to this callback, and the code ignores it. Students then hit `localhost:3000` and either reach the *other* program or get "connection refused".

**Fix (repo):**
```js
app.listen(PORT, (err) => {
  if (err) throw err;   // e.g. EADDRINUSE: port already in use
  console.log(`Server running on http://localhost:${PORT}`);
});
```
**Fix (student, if the repo isn't patched):** Close the other terminal that runs the backend, or kill whatever holds the port:
- macOS/Linux: `lsof -i :3000` then `kill <PID>`
- Windows: `netstat -ano | findstr :3000` then `taskkill /PID <PID> /F`

Or set `PORT=3001` in `backend/.env` **and** `VITE_API_URL=http://localhost:3001` in `frontend/.env`.

---

### A5. `express` was accidentally added to the frontend ✅
**File:** `frontend/package.json` (added in commit `79c4f26 "dfasf"`)
```json
"dependencies": {
  "express": "^5.3.0",   <-- doesn't belong here
```
**What students see:** Nothing breaks, because the build still passes. But it is an unneeded install (about 850 extra lockfile lines), and it teaches the wrong idea that the React app runs Express.

**Fix:**
```bash
cd frontend
npm uninstall express
```
Commit the updated `package.json` and `package-lock.json`.

---

### A6. No Node version is pinned, and dependencies need a recent Node ✅
These minimums come from the installed packages:

| Package | Requires Node |
|---|---|
| `@supabase/supabase-js` (backend) | **>= 22.0.0** |
| `vite@8`, `@vitejs/plugin-react@6`, `oxlint` (frontend) | **^20.19.0 or >= 22.12.0** |

**What students see on older Node (18, or early 20/22):**
- `npm WARN EBADENGINE Unsupported engine` during install
- the frontend crashes on `npm run dev` / `npm run build` with syntax or `require` errors from Vite/rolldown
- the backend may fail when it talks to Supabase

**Fix (student):** Install **Node 22 LTS or newer** (`node -v` should print `v22.12.0` or higher). With nvm: `nvm install 22 && nvm use 22`. Then delete `node_modules` and run `npm install` again.

**Fix (repo):** Add an `engines` field to **both** `package.json` files. Render also reads it to pick the Node version:
```json
"engines": { "node": ">=22.12.0" }
```

---

### A7. `.env.example` has no newline at the end of the file 📄
**File:** `backend/.env.example` (the last line `CORS_ORIGIN=...` has no trailing newline)

**What students see:** Running `echo "SOMETHING=x" >> .env` after `cp`, or pasting at the very end in some editors, glues the new text onto the CORS line: `CORS_ORIGIN=http://localhost:5173SOMETHING=x`. CORS then breaks for localhost.

**Fix:** Add a newline at the end of `backend/.env.example`.

---

## Part B: Setup mistakes students will make (the repo works, but these trip people up)

### B1. Backend crashes immediately: "Missing SUPABASE_URL or SUPABASE_SECRET_KEY" ✅
```
Error: Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Copy .env.example to .env and fill them in.
```
**Causes and fixes:**
- **No `.env` file.** Run `cp .env.example .env` *inside `backend/`*, not in the repo root.
- **Windows `cmd.exe` has no `cp`.** Use `copy .env.example .env`. PowerShell accepts `cp`.
- **The file became `.env.txt`.** Windows Notepad and "hide file extensions" cause this. In VS Code the file must be named exactly `.env`. Check with `dir` / `ls -a`.
- **The file isn't visible.** Finder and Explorer hide dotfiles. Use VS Code's file tree, or `ls -a`.
- **Spaces or quotes around `=`.** Use `SUPABASE_URL=https://abc.supabase.co`, not `SUPABASE_URL = "https://..."`.

---

### B2. `/api/example` returns `{"error":"TypeError: fetch failed"}` ✅
**Cause (reproduced):** `SUPABASE_URL` is still the placeholder `https://your-project-id.supabase.co`, has a typo, or the Supabase project is **paused** (free projects pause after about a week of inactivity).

**Fix:** Copy the **Project URL** from Supabase (Project Settings → API / Data API). It looks like `https://abcdefghijklmnop.supabase.co` with no trailing path. If the project is paused, click **Restore** in the Supabase dashboard. Restart the backend after you edit `.env`.

---

### B3. `/api/example` returns `Could not find the table 'public.example' in the schema cache` 📄
**Cause:** The student skipped step 1.2 and never ran `backend/schema.sql`, or ran it in a different Supabase project from the one in their `.env`.

**Fix:** Supabase → **SQL Editor** → paste the *entire* `backend/schema.sql` → **Run**. Then confirm that `example` appears in **Table Editor**.

---

### B4. `/api/example` returns `permission denied for table example` 📄
**Cause:** The student created the table by hand in the Table Editor, or copied only the `create table` part of the SQL, so the `grant ... to service_role;` line never ran. Newer Supabase projects don't grant the Data API access to new tables automatically.

**Fix:** Run this in the SQL Editor:
```sql
grant select, insert, update, delete on table public.example to service_role;
```

---

### B5. Frontend shows `Invalid API key` 📄
**Causes:** The `ssb_` typo (A1), a key with a missing character from a bad copy, a leftover space or quote, or a **legacy** `service_role` JWT (`eyJ...`) from an old tutorial pasted where the code expects the new `sb_secret_...` key.

**Fix:** Copy the **Secret** key fresh from Project Settings → API Keys. It starts with `sb_secret_`. Paste it as the whole value with no quotes, then restart the backend.

---

### B6. Frontend shows "Failed to fetch" (Chrome), "NetworkError…" (Firefox), or "Load failed" (Safari)
**Causes and fixes:**
1. **The backend isn't running.** Start it in a *second* terminal with `cd backend && npm run dev`, and leave that terminal open.
2. **The backend crashed silently because of the port problem.** See A4.
3. **A CORS block.** Open DevTools → Console. If it says *"blocked by CORS policy"*, see B7.

---

### B7. CORS error locally ✅
The backend only allows the exact origins listed in `CORS_ORIGIN`. I confirmed `http://localhost:5173` gets the `Access-Control-Allow-Origin` header and `http://127.0.0.1:5173` does **not**.

**Common ways students hit this:**
- **Vite moved to port 5174** because 5173 was busy (for example, another Vite app is open). Vite prints `Port 5173 is in use, trying another one...`.
- They opened `http://127.0.0.1:5173` instead of `http://localhost:5173`.
- They ran `npm run dev -- --host` and opened the `Network:` URL (`http://192.168.x.x:5173`), for example on a phone.

**Fix:** Either use exactly `http://localhost:5173` (close the other Vite app), or add the origin you actually use to `backend/.env`:
```
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173
```
Then **restart the backend**, because `.env` is only read at startup.

---

### B8. Edited `.env`, but nothing changed
- **Backend:** `node --watch` restarts on **code** changes, not on `.env` changes. Press Ctrl+C and run `npm run dev` again.
- **Frontend locally:** Vite reads `.env` at startup. Restart `npm run dev`.
- **Frontend on Vercel:** `VITE_API_URL` is baked in at **build** time. After you change it in Vercel you must **Redeploy**; saving the variable alone does nothing.

---

### B9. `VITE_API_URL` with a trailing slash or `/api` gives "Not found" ✅
`VITE_API_URL=http://localhost:3000/` produces `http://localhost:3000//api/example`, which I confirmed returns `{"error":"Not found"}`. `VITE_API_URL=https://x.onrender.com/api` produces `/api/api/example`, which also returns "Not found".

**Fix:** Use only the bare origin: `http://localhost:3000` or `https://my-api.onrender.com`, with no trailing `/` and no `/api`.

---

### B10. Running commands in the wrong folder
**Symptoms:** `npm ERR! enoent Could not read package.json`, or `Missing script: "dev"`.

**Cause:** The repo root has no `package.json`. Each app lives in its own folder.

**Fix:** Run `cd backend` or `cd frontend` before any `npm` command. They need **two terminals**, one per app.

---

### B11. "Cannot find native binding" / `@rolldown/binding-...` / `@oxlint/binding-...` errors
**Cause:** Native platform binaries are platform-specific. This shows up when someone copies `node_modules` from another computer, switches between WSL and Windows, or hits npm's known optional-dependency bug.

**Fix:**
```bash
cd frontend
rm -rf node_modules package-lock.json   # Windows PowerShell: Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```
Don't commit the regenerated lockfile unless you mean to.

---

## Part C: Deployment problems (Render + Vercel)

### C1. Render: "Missing script: start" or "Cannot find module"
**Cause:** **Root Directory** wasn't set to `backend`, so Render ran `npm install` in the repo root.

**Fix:** Render → Settings → Root Directory = `backend`, Build = `npm install`, Start = `npm start`.

### C2. Render: deploy fails or the health check times out
**Fix:** Don't set `PORT` on Render, because Render provides its own. Set Health Check Path = `/health`. Add `SUPABASE_URL` and `SUPABASE_SECRET_KEY` under **Environment**; Render does **not** read your local `.env`. If the logs mention the Node version, add the `engines` field from A6.

### C3. Vercel: build fails, or the site is blank or 404
**Fix:** Root Directory = `frontend`, Framework = Vite. The build runs `tsc -b`, so any TypeScript error in the code fails the deploy. Run `npm run build` locally first; it currently passes on a fresh clone.

### C4. Vercel site calls `localhost:3000`
**Cause:** `VITE_API_URL` wasn't set in Vercel before the build. `api.ts` then falls back to `http://localhost:3000`.

**Fix:** Set `VITE_API_URL` = your Render URL in Vercel → Settings → Environment Variables (Production), then **Redeploy**.

### C5. Deployed site shows a CORS error
**Expected** until step 3 of the README is done. Set `CORS_ORIGIN` on Render to the Vercel **production domain** exactly (`https://my-app.vercel.app`, no trailing `/`). Preview URLs with random characters won't match.

### C6. First request takes about 30 seconds or times out
This is Render's free tier waking up. Wait and refresh.

---

## Quick triage table (for the instructor)

| Student sees… | Go to |
|---|---|
| `Missing SUPABASE_URL or SUPABASE_SECRET_KEY` | B1 |
| `TypeError: fetch failed` (in the page/JSON) | B2 |
| `Could not find the table 'public.example'` | B3 |
| `permission denied for table example` | B4 |
| `Invalid API key` | A1, B5 |
| `new row violates row-level security policy` / list always empty | A3 |
| `Failed to fetch` / `NetworkError` / `Load failed` | B6, A4 |
| `blocked by CORS policy` | B7 (local), C5 (deployed) |
| `{"error":"Not found"}` | B9 |
| "Server running…" but nothing works | A4 |
| `EBADENGINE` / weird Vite syntax errors | A6 |
| `Missing script: "dev"` / `enoent package.json` | B10 |
| `Cannot find native binding` | B11 |

## One-shot patch for the repo maintainer
Applying A1–A7 makes setup much smoother:
1. `backend/.env.example`: `ssb_` → `sb_`; fix the JWKS host (`/supabase.co` → `.supabase.co`); rename the publishable placeholder; add a trailing newline.
2. `backend/src/index.js`: handle the error argument in the `app.listen` callback.
3. `frontend/`: `npm uninstall express`.
4. Both `package.json` files: add `"engines": { "node": ">=22.12.0" }`.
