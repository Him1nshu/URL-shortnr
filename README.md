# URL Shortener

A small URL-shortening application with a React/Vite frontend and an Express backend.
Users submit a long URL, receive a short URL, and can copy or open the generated link.
The frontend also keeps the most recent results in the current browser session.

## Project structure

```text
SD/
├── .gitignore
├── README.md
├── explainable.md
└── urlstnr/
    ├── backend/
    │   ├── index.js
    │   ├── package.json
    │   └── package-lock.json
    └── frontend/
        ├── index.html
        ├── package.json
        ├── package-lock.json
        ├── vite.config.js
        └── src/
            ├── App.jsx
            ├── App.css
            ├── index.css
            └── main.jsx
```

## Features

- Validate and shorten an absolute URL.
- Generate a six-character URL-safe code.
- Redirect a short URL to its original destination.
- Copy generated URLs with the browser Clipboard API.
- Display up to ten recently generated links in the current frontend session.
- Use Vite’s development proxy so frontend requests to `/api` reach the backend.

## Prerequisites

- Node.js with npm installed.
- A browser with support for `fetch`, `URL`, and the Clipboard API.

There is no root package script, so install and run the frontend and backend independently.

## Installation

Open two terminals from the project root.

### Backend

```powershell
cd .\urlstnr\backend
npm install
```

### Frontend

```powershell
cd .\urlstnr\frontend
npm install
```

## Running locally

Start the backend in the first terminal:

```powershell
cd .\urlstnr\backend
node .\index.js
```

The backend is configured to listen on `http://localhost:3000`.

Start the Vite development server in the second terminal:

```powershell
cd .\urlstnr\frontend
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

> **Current implementation note:** `backend/index.js` currently calls
> `localStorage()` during startup. `localStorage` is not provided by a normal
> Node.js process, so the backend must remove or replace that unused initialization
> before it can start successfully. The intended URL map is currently held in memory
> by the `urls` `Map`.

## Available scripts

### Frontend (`urlstnr/frontend`)

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build in `dist/` |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build locally |

### Backend (`urlstnr/backend`)

| Command | Purpose |
| --- | --- |
| `node .\index.js` | Start the Express server |
| `npm test` | Placeholder script; no backend tests are configured yet |

## API

### Create a short URL

```http
POST http://localhost:3000/api/shorten
Content-Type: application/json
```

Request:

```json
{
  "url": "https://example.com/a/long/path"
}
```

Successful response:

```json
{
  "shortUrl": "http://localhost:3000/Ab12xY",
  "code": "Ab12xY"
}
```

Possible validation responses:

- `400 {"error":"URL is required"}` when `url` is missing or empty.
- `400 {"error":"Invalid URL"}` when the value cannot be parsed by `new URL(...)`.

### Resolve a short URL

```http
GET http://localhost:3000/:code
```

If the code exists, the server responds with an HTTP redirect to the original URL.
Unknown codes return `404 {"error":"URL not found"}`.

## Data and limitations

- Short URLs are stored in an in-memory `Map`; restarting the backend deletes all mappings.
- Codes are random and collision-checked only against the current process’s map.
- There is no authentication, rate limiting, analytics, database, or expiry policy.
- The generated hostname is hard-coded to `localhost:3000`, so deployment requires configuration changes.
- The frontend history is local React state and disappears when the page is reloaded.
- The frontend’s `type="url"` input provides browser-level validation, while the backend validates again.

For a deeper description of the request lifecycle and design concepts, see
[`explainable.md`](./explainable.md).

## Development checks

From `urlstnr/frontend`, run:

```powershell
npm run lint
npm run build
```

The backend currently has no automated test suite. A useful next step is to add tests
for URL validation, code collisions, redirect behavior, and persistence behavior once
a storage layer is selected.
