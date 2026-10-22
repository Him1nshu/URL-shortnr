# How the URL Shortener Works

This document explains the application’s workflow and the concepts behind each part
of the implementation. The project is intentionally small: the frontend handles user
interaction, while the backend owns validation, code generation, storage, and
redirects.

## 1. High-level architecture

```text
Browser
  │
  │  React UI at localhost:5173
  │  POST /api/shorten
  ▼
Vite development proxy
  │
  │  forwards /api/* to localhost:3000
  ▼
Express API
  │
  ├─ validates the submitted URL
  ├─ creates a random short code
  ├─ stores code → original URL
  └─ redirects GET /:code requests
```

The frontend and backend are separate Node.js packages. During development, Vite
serves the frontend and proxies API requests. The browser therefore calls a relative
path (`/api/shorten`) instead of hard-coding the backend origin in the React code.

## 2. URL-shortening workflow

### Step 1: The user submits a URL

`App.jsx` stores the input in the `url` state variable. Submitting the form calls
`shorten`, which:

1. Prevents the browser’s default form submission.
2. Clears the previous error and result.
3. Sets `loading` to `true`.
4. Sends a JSON `POST` request to `/api/shorten`.

The input uses `type="url"` and `required`, which gives the browser a first layer of
client-side validation. This improves the user experience, but it is not a security
boundary because clients can bypass browser validation.

### Step 2: Vite forwards the API request

In development, `vite.config.js` maps `/api` to `http://localhost:3000`.
Consequently:

```text
Browser request:  http://localhost:5173/api/shorten
Backend request:  http://localhost:3000/api/shorten
```

This avoids a cross-origin request for the frontend API call during development and
lets the frontend use the same relative URL in the browser.

### Step 3: Express parses and validates the request

`express.json()` parses the request body. The route reads `url` from `req.body`.
The backend then:

- rejects a missing value with HTTP 400;
- constructs `new URL(url)` to verify that the value is a parseable absolute URL;
- rejects parsing failures with HTTP 400.

Validation must happen on the server even though the browser validates the form.
Server-side validation protects the API when it is called directly by scripts or
other clients.

### Step 4: A code is generated

`generateCode()` calls `crypto.randomBytes(4)`, converts the bytes to base64url, and
takes the first six characters. Base64url is useful here because it avoids characters
that commonly need escaping in URLs.

The route checks the generated value against the `urls` map. If it already exists,
the route generates another code. This is a collision check, not a guarantee of
infinite uniqueness: the code space is finite and the current implementation does
not impose a retry limit.

### Step 5: The mapping is stored

The backend stores this shape in the in-memory map:

```js
code -> {
  url,
  createdAt
}
```

The map gives average constant-time lookup for both collision checks and redirects.
The trade-off is that it is process-local and volatile. All mappings disappear when
the server restarts, and multiple backend instances would not share mappings.

### Step 6: The result returns to React

The backend responds with JSON containing the generated `code` and a `shortUrl`.
The frontend:

- stores `shortUrl` in `result`;
- adds the original and short values to `history`;
- keeps only the ten newest history entries;
- clears the input;
- turns off the loading state in `finally`.

React re-renders the result and history sections because those values are component
state. The history is not persisted in a database or browser storage.

## 3. Redirect workflow

When a user opens a generated short URL:

```text
GET http://localhost:3000/Ab12xY
```

Express matches `/:code`, looks up `Ab12xY` in `urls`, and calls
`res.redirect(entry.url)`. The browser follows the redirect to the original
destination.

If the code is missing, the server returns a JSON 404 response rather than redirecting.
This prevents unknown codes from silently producing an incorrect destination.

## 4. Frontend concepts

### React state

The component uses separate state values for separate UI concerns:

| State | Meaning |
| --- | --- |
| `url` | Current input value |
| `result` | Most recently created short URL |
| `error` | User-visible error message |
| `loading` | Whether a shorten request is in progress |
| `copied` | Which result was most recently copied |
| `history` | Recent mappings shown in the UI |

This separation keeps rendering declarative: the JSX describes what to show for each
state instead of manually manipulating DOM nodes.

### Async request handling

`shorten` is asynchronous because it waits for the network response. The `try/catch/
finally` structure ensures that:

- successful responses update the result;
- non-2xx responses become visible errors;
- request failures are also shown to the user;
- the loading state is reset whether the request succeeds or fails.

### Clipboard behavior

The `copy` function uses `navigator.clipboard.writeText`. After a successful copy,
the `copied` state identifies the relevant button and resets it after two seconds.
The result copy button uses the string `"result"` as its identifier, while history
buttons use their list index.

## 5. Backend concepts

### Middleware

The backend uses two kinds of middleware:

- `express.json()` parses JSON request bodies before route handlers run.
- The custom middleware adds CORS response headers.

The CORS configuration currently allows every origin and only declares `GET` and
`POST`. That is convenient for development, but production deployments should use a
specific allowed origin and should review allowed methods and headers.

### Random identifiers and collisions

Shortening requires a mapping from a compact identifier to a long URL. Random
identifiers reduce predictability compared with sequential IDs, but six characters
still provide a limited namespace. A production service should choose a namespace
size based on expected volume, retry safely, and enforce a maximum generation attempt.

### Volatile storage

The `Map` is an in-memory cache-like store, not durable persistence. A database or
shared key-value store would be needed for:

- surviving process restarts;
- running multiple backend instances;
- enforcing uniqueness across deployments;
- adding expiration, ownership, or analytics;
- querying and managing stored links.

The current backend also contains an unused `localStorage()` initialization. Normal
Node.js does not expose the browser `localStorage` API as a callable function, so this
line prevents startup and should be removed or replaced before running the server.

## 6. Error paths

There are three main user-visible failure categories:

1. **Input failure:** the browser or backend rejects a missing or invalid URL.
2. **Network/server failure:** `fetch` fails or the API returns a non-success status.
3. **Redirect failure:** the generated code is not found and the backend returns 404.

The frontend displays API errors in the `.error` element. The backend returns JSON
errors so API clients can handle failures consistently.

## 7. Production considerations

This project is a learning-oriented baseline. A production-ready design should
address the following:

- Replace the in-memory map with durable, shared storage.
- Remove the startup-blocking `localStorage()` call.
- Configure the public base URL instead of hard-coding `localhost:3000`.
- Add rate limiting and abuse protection.
- Restrict CORS to trusted origins.
- Validate accepted URL schemes and consider blocking unsafe schemes.
- Add request size limits and structured logging.
- Add tests for validation, collisions, redirects, and persistence.
- Add expiration and ownership rules if links should not live forever.
- Serve the frontend and API through a deployment-aware origin or configure a
  production reverse proxy.

## 8. A request example

For an input of `https://example.com/docs`:

```text
1. React sends POST /api/shorten with {"url":"https://example.com/docs"}.
2. Vite forwards the request to Express on port 3000.
3. Express validates the URL.
4. Express generates a code such as k9P2aQ.
5. Express stores k9P2aQ → https://example.com/docs.
6. Express returns http://localhost:3000/k9P2aQ.
7. React renders the link and adds it to recent history.
8. Opening the link makes GET /k9P2aQ.
9. Express redirects the browser to https://example.com/docs.
```
