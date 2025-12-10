# Todo Frontend with onit.lt API client

This repository provides a minimal static frontend and a reusable JavaScript API wrapper for communicating with the onit.lt PHP endpoints that handle TODO CRUD operations. The client centralizes endpoint URLs, schemas, authentication headers, and error handling, and the frontend wires the calls into list/add/update/delete flows.

## Project structure
- `index.html` – Static UI for viewing and managing todos.
- `js/apiClient.js` – Client-side API wrapper around the onit.lt PHP endpoints.
- `js/app.js` – Frontend behavior that connects UI events to API calls and renders results.

## Configuration
- Runtime configuration is read from `window.__TODO_CONFIG`, set in `js/runtime-config.js`.
- Copy `js/runtime-config.example.js` to `js/runtime-config.js` for local development and fill in the values for your PHP host, token, and CORS needs.
- For deployments, generate `js/runtime-config.js` during your build/release pipeline (e.g., using `envsubst`) so the static assets ship with the correct API base and credentials.

## Endpoints
The client is configured to call the following PHP endpoints, assuming they live under the `https://onit.lt/php/todos` base. Configure the base via `js/runtime-config.js` or an environment-specific runtime file if the deployment path differs.

| Operation | Method | URL | Body | Success response |
|-----------|--------|-----|------|------------------|
| List todos | GET | `${BASE_URL}/list.php` | _none_ | `{ "status": "ok", "data": [ { "id": number, "title": string, "done": boolean } ] }` |
| Create todo | POST | `${BASE_URL}/create.php` | `{ "title": string, "done": boolean }` | `{ "status": "ok", "data": { "id": number, "title": string, "done": boolean } }` |
| Update todo | PUT | `${BASE_URL}/update.php?id={id}` | `{ "title": string, "done": boolean }` | `{ "status": "ok", "data": { "id": number, "title": string, "done": boolean } }` |
| Delete todo | DELETE | `${BASE_URL}/delete.php?id={id}` | _none_ | `{ "status": "ok", "data": { "id": number } }` |

## Request/response schema notes
- Requests use JSON bodies, and the client sets `Content-Type: application/json`.
- Responses are expected to be JSON with a top-level `status` and `data`. The client treats any non-`ok` status or missing `data` as an error.
- PHP endpoints that do not support PUT/DELETE can be configured to accept POST overrides via the `methodOverride` helper in `js/apiClient.js` if needed.

## Authentication and CORS
- Configure API connectivity in `js/runtime-config.js` (a placeholder is committed) or by copying `js/runtime-config.example.js` to `js/runtime-config.js` and editing the values. The file runs before the ES modules and sets `window.__TODO_CONFIG`, which the client reads at runtime.
- Available keys: `apiBaseUrl` (e.g., `https://onit.lt/php/todos`), `authToken` (for `Authorization: Bearer <token>`), `fetchMode` (e.g., `cors`, `same-origin`), `credentials` (`omit`, `same-origin`, or `include`), and `extraHeaders` (merged into every request).
- For local development, set `apiBaseUrl` to your tunnel or LAN PHP host. If the API needs a token, place it in `authToken` so it never lives in version control. If the API uses cookies, set `credentials: 'include'`.
- For deployments, you can generate `js/runtime-config.js` from the example using environment variables (e.g., `envsubst < js/runtime-config.example.js > js/runtime-config.js`) so the static files ship with the correct base URL and tokens. Ensure your PHP host allows the frontend origin and headers (`Content-Type`, `Authorization` plus any `extraHeaders`) in its CORS policy.

## Running the frontend
No build step is required. Serve the `index.html` file from any static server (or open it directly) to interact with the onit.lt backend. Example using Python:

```
python -m http.server 8000
# open http://localhost:8000
```
