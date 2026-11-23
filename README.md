# IT Support Desk API

Mulungushi University · ICT251 Activity 7 · Student number 202500305

This independent CommonJS Express API stores fictional IT support requests in PostgreSQL. It follows the Activity 7 data agreement exactly: the same four editable fields, three statuses, validation rules, route responses and JSON error format as Activity 6. It needs no browser to operate and can be used by any API client.

## How it matches the brief

- `GET /` serves the marker's HTML API guide with the live base URL, all routes, fields, statuses, example body, status codes and an idle-service note.
- `GET /health` returns `200` when the database responds and `503` when it does not.
- `GET /api/records`, `GET /api/records/:id`, `POST /api/records`, `PUT /api/records/:id` and `DELETE /api/records/:id` return the statuses required by the brief (`200`, `200`, `201`, `200`, `200`).
- POST/PUT accept all four editable fields as strings, trim them, enforce the length/status rules and ignore any client-supplied `id`. PUT never creates a missing record.
- Invalid IDs and malformed JSON return `400`; missing records and unknown routes return `404`; unexpected failures return `500`. Every error body has a `message` field.
- SQL uses `$1`-style placeholders and `RETURNING *` as in the brief; the eight seed records are fictional.

**Database note:** section 5 of the PDF says “Create an SQL lite Database”, but the brief also requires the `pg` package, PostgreSQL `$n` placeholders and `RETURNING`, and Render's free web-service filesystem is temporary. PostgreSQL is used so records actually survive restarts and the `/health` database check is meaningful.

## Run locally

Use Node.js 24 LTS. In PowerShell:

```powershell
npm.cmd ci
```

Start the API with its local persistent PostgreSQL-compatible development database:

```powershell
npm.cmd run dev
```

Open http://localhost:3000/ for the API guide, http://localhost:3000/health for the database check, or http://localhost:3000/api/records for the data. The schema and eight seed records are installed on first startup; later starts keep the existing records. Local database files are stored under the ignored `data/` folder. Stop the server with Ctrl+C. `npm.cmd start` remains available when you have configured `DATABASE_URL` to use a regular PostgreSQL server.

## Test

```powershell
npm.cmd test
```

The suite runs the real HTTP server against an isolated in-memory PostgreSQL-compatible database. It checks the guide, health, all CRUD operations, trimming and validation, invalid IDs, malformed JSON, missing records and routes, CORS preflight, ignored client IDs, and that re-running initialization does not reseed or erase data.

## Free deployment on Render

Commit and push `package.json`, `package-lock.json`, `render.yaml` and all source files. Do not commit `.env`, `node_modules/` or `data/`.

### Option A — Blueprint (recommended)

1. In the Render Dashboard, choose **New → Blueprint Instance** and select this repository.
2. If the Activity 8 frontend needs browser access, set `CLIENT_ORIGINS` to its origin (for example, `https://your-frontend.onrender.com`). Otherwise leave it unset.
3. Approve the deployment. The Blueprint creates a free web service plus a free PostgreSQL database and injects the database's internal connection string as `DATABASE_URL`.

Render allows only one free PostgreSQL database per workspace. If one already exists, use Option B and select that database instead.

### Option B — Manual setup

1. Create a free Render Postgres instance and a free Node Web Service in the same region.
2. Set build command to `npm ci` (or `npm install`), start command to `npm start`, and health check path to `/health`.
3. Add `DATABASE_URL` using the database's **internal** connection string. Add `CLIENT_ORIGINS` only when a browser frontend calls the API.

### Free-plan notes

- Free web services spin down after 15 minutes idle; the first request can take about a minute, which the guide mentions for the marker.
- Local files are lost on restart/redeploy, so data is kept in Postgres, not a local SQLite file.
- Free Render Postgres expires 30 days after creation. Create it close to the 24 November 2026 marking deadline and finish verification before it expires.

## Verify the hosted API

Open the public base URL and confirm the guide shows that URL. Then repeat the checks from the brief:

1. `GET /health` → `200`, `GET /api/records` → array of eight records.
2. `POST /api/records` with the guide's body → `201`; save the returned `id`.
3. `GET /api/records/<id>` → the same record; `PUT /api/records/<id>` with all four fields → `200` with the original id.
4. `DELETE /api/records/<id>` → `200` with `{"message":"Record deleted."}`; `GET` that id → `404`.
5. POST with a missing title or invalid status → `400`; an invalid id or malformed JSON → `400`; a positive id that does not exist → `404` for GET, PUT and DELETE.
6. Create a record, wait for a restart, then GET it again to confirm persistence; remove the test record.

Submit the public backend base URL (for example, `https://your-backend.onrender.com`) in the Activity 7 link field. Activity 8 can connect a separate frontend to this URL.
