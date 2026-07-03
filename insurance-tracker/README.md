# Ledger — Insurance Policy Renewal Tracker

A working web app for insurance agents to track client policies and never miss a renewal —
inspired by the "renewal engine" concept used in products like AetherLabs' Flow.

Built as a college / academic project. Full stack, no external services required.

## Tech stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | HTML, CSS, vanilla JavaScript (no framework needed) |
| Backend   | Node.js + Express (REST API) |
| Database  | SQLite, via Node's built-in `node:sqlite` module (no native/compiled dependencies) |

## Features

- **Dashboard** — total policies, expired count, policies due in 15 days, premium at risk
- **Renewal runway** — every policy shows a color-coded gauge (green → amber → red) for
  days until expiry, so urgency is visible at a glance instead of buried in a date column
- **Search & filter** — search by client, policy number, or insurer; filter by urgency band
  (expired / ≤15 days / 16–30 days / 31–60 days / healthy)
- **Full CRUD** — add, edit, and delete policies through a modal form
- **Seeded sample data** — 10 realistic sample policies load automatically on first run so
  the dashboard isn't empty when you demo it

## Project structure

```
insurance-tracker/
├── server.js          # Express app + REST API routes
├── db.js              # SQLite schema, seed data, connection
├── package.json
├── policies.db         # created automatically on first run
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```

## Running it

Requires **Node.js 22.5 or newer** (needs the built-in `node:sqlite` module).

```bash
cd insurance-tracker
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

The database file `policies.db` is created automatically in the project folder on first
run, pre-populated with 10 sample policies (a mix of expired, urgent, and healthy ones so
you can see every state of the app immediately).

## API reference

| Method | Route                | Description                        |
|--------|-----------------------|-------------------------------------|
| GET    | `/api/policies`       | List policies (`?search=`, `?urgency=`) |
| GET    | `/api/policies/:id`   | Get one policy                     |
| POST   | `/api/policies`       | Create a policy                    |
| PUT    | `/api/policies/:id`   | Update a policy                    |
| DELETE | `/api/policies/:id`   | Delete a policy                    |
| GET    | `/api/stats`          | Dashboard summary numbers           |

Urgency bands are computed server-side from `expiry_date`:
`expired` (< 0 days) · `urgent` (0–15) · `upcoming` (16–30) · `soon` (31–60) · `healthy` (60+).

## Ideas for extending this (good "future work" section for your report)

- Login/auth so multiple agents each see only their own book of policies
- Email/WhatsApp renewal reminders (e.g. via a cron job + a mail API)
- Commission reconciliation: upload a payout CSV and auto-match against policies
- Multi-quote comparison tool for a client shopping for a new policy
- Export policy list to CSV/PDF
