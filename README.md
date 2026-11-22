# IT Support Desk API

Mulungushi University · ICT251 Activity 7 · Student number 202500305

This independent CommonJS Express API stores fictional IT support requests in SQLite. The same record fields and statuses are used by the Activity 6 frontend. No browser or frontend is needed to test the API.

## Run locally

Use Node.js 24 or newer. In PowerShell:

```powershell
npm.cmd ci
npm.cmd start
```

Open http://localhost:3000/ for the marker’s API guide, http://localhost:3000/health for the database health check, or http://localhost:3000/api/records for the data.

The defaults work without an environment file. Copy `.env.example` to `.env` to customize the port, SQLite file, and comma-separated browser origins. The default database is `data/records.sqlite`. The schema and eight fictional seed records are installed automatically. Once initialized, an empty database stays empty. Keep database files and `.env` out of source control.

## Structure

- `server.js` configures Express, CORS, the guide, health, and JSON errors.
- `routes/records.js` validates input and implements the five record endpoints using parameterized SQL.
- `db.js`, `schema.sql`, and `seed.sql` initialize persistent SQLite storage.
- `guide.html` provides the API guide at the base URL.
- `api.test.js` verifies the API over HTTP against a temporary SQLite file.

## Test

```powershell
npm.cmd test
```

The suite covers guide and health, all CRUD operations, input and ID validation, missing records and routes, CORS, restart persistence, and the intentionally empty database case. The guide includes request bodies and response codes for manual API-client tests.

## Hosting and submission

The Activity 7 brief names SQLite in the database setup and also includes PostgreSQL-style examples. This implementation uses SQLite. [Render’s Free web service filesystem](https://render.com/docs/free) loses local SQLite data on restart or redeploy. Use a service with persistent storage for this build, or confirm a lecturer-approved alternative before changing the database or platform.

On Render with a persistent disk, connect this backend source as a Node web service. Use `npm ci` for build, `npm start` for start, and `/health` for the health check. Mount a disk such as `/var/data`, set `DATABASE_PATH=/var/data/records.sqlite`, and use Node 24 or newer. Set `CLIENT_ORIGINS` when a browser frontend needs access. No Activity 6 frontend code changes are required.

Once hosted, open the public base URL and repeat HTTP validation and CRUD checks. Verify a fictional test record remains after a service restart, then remove the test record. Submit the **public backend base URL** in the Activity 7 link field. Activity 8 will connect a separate frontend deployment to this URL.
