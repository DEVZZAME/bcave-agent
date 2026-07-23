# StyleMetrics

A product performance dashboard for fashion retail / merchandising teams.
Track **revenue, gross margin, units sold, sell-through, return rate and conversion**
across every category, channel and season — with sign-up / login and a rich analytics UI.

Runs 100% locally. No Docker. SQLite for storage.

## Stack
- **Backend:** Node.js + Express (ES modules)
- **Database:** SQLite via `better-sqlite3` (file created automatically at `db/stylemetrics.db`)
- **Auth:** email + password, `bcryptjs` hashing, JWT in an httpOnly cookie
- **Frontend:** vanilla HTML/CSS/JS + Chart.js (from CDN) — no build step

## Quick start

```bash
npm install        # install dependencies
npm run seed       # create tables + demo user + demo data
npm start          # start server → http://localhost:4000
```

Then open **http://localhost:4000**.

### Demo login
- **Email:** `demo@stylemetrics.app`
- **Password:** `demo1234`

Or click **Create account** to register your own — signup and login are fully functional.

## Scripts
| Command | What it does |
|---|---|
| `npm start` | Run the server on port 4000 |
| `npm run dev` | Run with `--watch` auto-restart |
| `npm run seed` | Seed the database (skips if already seeded) |
| `npm run reset` | Wipe and rebuild all demo data |

Change the port with `PORT=5000 npm start`.

## Features
- **KPI cards** with period-over-period deltas (revenue, units, margin, return rate, conversion)
- **Revenue & units trend** — dual-axis line + bar chart
- **Revenue by category** and **by channel** — doughnut charts
- **Top performing products** — horizontal bar chart
- **Product detail table** — filter by category / gender / season, click headers to sort
- **Date ranges:** 7 / 30 / 90 / 180 days

## Project layout
```
stylemetrics/
├── server.js            # Express app + page/route wiring
├── db/
│   ├── index.js         # SQLite connection + schema
│   ├── seed.js          # demo user + product/sales seed data
│   └── stylemetrics.db  # created on first seed (gitignored)
├── middleware/auth.js   # JWT sign / verify / requireAuth
├── routes/
│   ├── auth.js          # signup / login / logout / me
│   └── dashboard.js     # analytics endpoints
└── public/              # frontend (login + dashboard)
```
