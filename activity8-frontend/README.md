# IT Support Desk — Activity 8

Mulungushi University · ICT251 Web Technologies · Student number 202500305

This frontend integrates the Activity 6 IT Support Desk with the Activity 7 API. The browser reads and writes all support requests through the API, which stores them in the shared PostgreSQL database. The Activity 6 version remains unchanged in its separate project folder.

## Run locally

Use Node.js 24 LTS. Start the backend in one PowerShell window from the `activity7-backend` repository root:

```powershell
npm.cmd ci
npm.cmd run dev
```

In a second PowerShell window, start the static frontend from this folder:

```powershell
node serve.mjs
```

Open http://127.0.0.1:8000/. When served from `localhost` or `127.0.0.1`, the frontend uses the local backend at `http://localhost:3000`. When deployed, it uses the live backend URL in `js/config.js`.

## User actions

- Add a request with title, category, description, and one of the three allowed statuses.
- View a record using the backend-generated ID.
- Edit all four fields while keeping the original ID.
- Cancel an edit without changing the saved record.
- Delete a record after confirming.
- Search by title and filter by status; counts are based on the loaded API records.

The page starts in a loading state and reports API/network errors in the interface. It does not seed or store request records in `localStorage`. User-entered text is rendered with `textContent`.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Responsive request form, list, and About section |
| `css/styles.css` | Layout, status badges, responsive behavior, and focus styles |
| `js/config.js` | Local and hosted API base URLs |
| `js/data.js` | Validates input and implements the five asynchronous API methods |
| `js/app.js` | Loads records and connects page actions to the service |
| `qa-data.mjs` | Service tests for API requests, validation, and readable failures |

Run the service tests with:

```powershell
node --test qa-data.mjs
```

## Render deployment

The repository Blueprint publishes this folder as a separate Render Static Site named `activity8-frontend`. It has no build step; the publish directory is this folder. After the first deployment, copy the exact frontend origin shown by Render into the backend service's `CLIENT_ORIGINS`, keeping the local origins too, and save/redeploy the backend.

The About section links to the backend guide and health check. Open the public frontend URL in a signed-out browser and repeat add, view, edit, cancel, delete, search, and status-filter actions. A successful frontend change should also be visible at the backend's `/api/records` endpoint.

Submit only the live Activity 8 frontend URL in the Activity 8 link field.
