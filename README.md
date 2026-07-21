# Boarding — Full-Stack Job Application Tracker

A Kanban-style tracker for placement/job applications with a real backend: **user accounts, login, per-user data, and a status-change history log.** Frontend is vanilla HTML/CSS/JS (no framework), backend is Node.js + Express with JWT auth.

Design concept: applications as flights — **Applied → OA/Interview → Offer → Rejected** — styled like an airport departure board, with a small animated robot that greets you based on the time of day.

## What's new vs. a basic version

- **Real backend** — Node.js + Express REST API, not just `localStorage`
- **Login / signup** — password hashing with bcrypt, sessions via JWT
- **Per-user data** — every account only sees its own applications
- **History log** — every status change (Applied → Interview, etc.) is recorded with a timestamp; view it in the **History** panel
- **Time-aware robot mascot** — animated on the dashboard, says "Good morning / afternoon / evening" based on your system clock, addresses you by name
- **Radar-themed login screen** — animated sweep + blips, distinct from the dashboard's departure-board look

## Project structure

```
job-tracker-fullstack/
├── backend/
│   ├── server.js              # Express app entry point
│   ├── db.js                   # tiny JSON-file "database" (data/db.json)
│   ├── middleware/
│   │   └── auth.js              # JWT verification middleware
│   ├── routes/
│   │   ├── auth.js               # /api/auth/signup, /login, /me
│   │   └── applications.js       # /api/applications CRUD + history
│   ├── data/
│   │   └── db.json                # your data lives here (auto-created)
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
│
├── frontend/
│   ├── login.html              # sign in / create account
│   ├── index.html               # dashboard (protected — requires login)
│   ├── css/
│   │   ├── style.css              # dashboard + shared design tokens
│   │   └── auth.css               # login page styling
│   └── js/
│       ├── api.js                 # fetch wrapper + auth/session helpers
│       ├── auth.js                # login/signup form logic
│       └── app.js                 # dashboard logic (board, modal, history, robot)
│
└── README.md
```

## Why a JSON file instead of a real database?

`backend/db.js` stores everything in `backend/data/db.json`. This keeps the project runnable with **zero installs beyond `npm install`** — no MySQL/Postgres/MongoDB server to set up before a demo. It still goes through proper `readDB()`/`writeDB()` functions, so if you later want to swap in a real database, you only rewrite `db.js` — nothing in the routes changes. This is a completely reasonable and common thing to explain honestly in an interview: "I used a file-based store to keep setup friction at zero for a student project; the data layer is isolated so swapping to Postgres is a contained change."

---

## How to run this in VS Code

You need **two terminals running at once**: one for the backend, one for the frontend.

### Step 1 — Extract and open in VS Code
Unzip `job-tracker-fullstack.zip`, then `File → Open Folder…` → select the extracted `job-tracker-fullstack` folder.

### Step 2 — Start the backend

Open a terminal in VS Code (`` Ctrl + ` ``):

```bash
cd backend
npm install
```

Then create your environment file:

```bash
cp .env.example .env
```
(On Windows Command Prompt, use `copy .env.example .env` instead.)

Open `.env` and set `JWT_SECRET` to any long random string, e.g.:
```
JWT_SECRET=my_super_random_secret_key_change_me_12345
```

Now start the server:

```bash
npm start
```

You should see:
```
🚀 Boarding API running at http://localhost:5000
   Health check: http://localhost:5000/api/health
```

Leave this terminal running. Visit `http://localhost:5000/api/health` in a browser — it should show `{"status":"ok",...}`. If it doesn't, the backend isn't reachable and the frontend will fail to log in.

### Step 3 — Start the frontend

Open a **second** terminal (click the `+` in VS Code's terminal panel, or `` Ctrl+Shift+` ``):

```bash
cd frontend
```

The easiest way: install the **Live Server** extension (Extensions tab → search "Live Server" by Ritwick Dey → Install) → right-click `login.html` → **Open with Live Server**.

No-extension alternative:
```bash
python -m http.server 5501
```
Then open `http://localhost:5501/login.html`.

> Use a different port than the backend (5000) — 5501 here avoids clashing.

### Step 4 — Use it
1. On the login page, click **Create account**, fill in name/email/password, submit.
2. You'll land on the dashboard — the robot will greet you based on your current time.
3. Click **Log application** to add your first one, drag cards between columns, click **History** to see the timeline of every status change.
4. **Logout** (top-right icon) returns you to the login page; your data is still saved under your account for next time.

---

## Common errors & fixes

| Problem | Fix |
|---|---|
| "Could not reach the server. Is the backend running on port 5000?" | The backend terminal isn't running, or crashed. Go back to Step 2, run `npm start`, check for red error text. |
| `npm : command not found` / `'npm' is not recognized` | Node.js isn't installed. Install it from nodejs.org (LTS version), close and reopen VS Code's terminal. |
| `EADDRINUSE: address already in use :::5000` | Something else is using port 5000. Either stop it, or change `PORT` in `.env` to e.g. `5001` and update `API_BASE` in `frontend/js/api.js` to match. |
| Login says "An account with this email already exists" | Switch to the **Log in** tab instead of Create account, or use a different email. |
| Signup/login does nothing, no error shown | Open the browser DevTools console (F12) — likely a CORS or network error; confirm the backend terminal is still running. |
| Data disappears after restarting the backend | It shouldn't — data lives in `backend/data/db.json`. If you deleted that file, it regenerates empty. Don't manually edit it while the server is running. |
| `JWT_SECRET is not set` warning in terminal | You skipped Step 2's `.env` setup. Copy `.env.example` to `.env` and set a value. |
| Robot / fonts don't look right offline | Fonts load from Google Fonts via CDN — you need an internet connection for the fonts (the app itself still works without it, just falls back to system fonts). |

---

## Deploying this for your resume link

The frontend and backend deploy separately:

**Backend** → Render.com or Railway.app (both have free tiers for Node apps):
1. Push this project to a GitHub repo.
2. On Render/Railway, create a new **Web Service** from that repo, set root directory to `backend`, build command `npm install`, start command `npm start`.
3. Add environment variables `JWT_SECRET` and `PORT` in their dashboard (most platforms set `PORT` for you automatically).
4. You'll get a live URL like `https://boarding-api.onrender.com`.

**Frontend** → Netlify Drop or GitHub Pages:
1. Before deploying, update `API_BASE` in `frontend/js/api.js` to your deployed backend URL instead of `http://localhost:5000/api`.
2. Drag the `frontend` folder to https://app.netlify.com/drop, or push to GitHub Pages.

## What to say about it in an interview

- **Auth flow** — password hashing with bcrypt (never storing plaintext passwords), stateless sessions via JWT stored in `localStorage`, and an Express middleware (`requireAuth`) that protects routes by verifying the token on every request.
- **REST API design** — resource-based routes (`/api/applications`), proper HTTP status codes (401 for auth failures, 404 for missing resources, 400 for bad input).
- **Data modeling for history** — instead of just overwriting `status`, every change appends an immutable record to a `history` collection, so nothing is ever lost — a real audit-log pattern used in production systems.
- **Separation of concerns** — `api.js` isolates all networking so `app.js` never touches `fetch` directly; `db.js` isolates storage so the routes don't know or care how data persists.
- **Native browser APIs** — HTML5 Drag & Drop (no library), CSS-only mascot animation (no image assets, no animation library).
