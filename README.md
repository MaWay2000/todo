# Todo Frontend with onit.lt API client

This repository provides a minimal static frontend and a reusable JavaScript API wrapper for communicating with the onit.lt PHP endpoints that handle TODO CRUD operations. The client centralizes endpoint URLs, schemas, authentication headers, and error handling, and the frontend wires the calls into list/add/update/delete flows.

## Project structure
- `index.html` – Static UI for viewing and managing todos.
- `js/apiClient.js` – Client-side API wrapper around the onit.lt PHP endpoints.
- `js/app.js` – Frontend behavior that connects UI events to API calls and renders results.

## Endpoints
The client is configured to call the following PHP endpoints, assuming they live under the `https://onit.lt/php/todos` base. Adjust the `BASE_URL` constant in `js/apiClient.js` if the deployment path differs.

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
- If the API requires an authentication token or session cookie, set the `API_AUTH_TOKEN` environment variable before building/deploying, or edit `AUTH_TOKEN` in `js/apiClient.js`. Tokens are sent as `Authorization: Bearer <token>`.
- All requests opt into CORS; ensure the onit.lt host allows the frontend origin and headers (`Content-Type`, `Authorization`). Error messages expose CORS failures to make debugging easier.

## Running the frontend
No build step is required. Serve the `index.html` file from any static server (or open it directly) to interact with the onit.lt backend. Example using Python:

```
python -m http.server 8000
# open http://localhost:8000
```
