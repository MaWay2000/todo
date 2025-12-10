// Copy this file to js/runtime-config.js and adjust values for your environment.
// It will be loaded at runtime before the ES modules run.
window.__TODO_CONFIG = {
  // Where the PHP endpoints live. Should not include trailing slash.
  apiBaseUrl: 'https://onit.lt/php/todos',
  // Optional bearer token to send as Authorization: Bearer <token>.
  authToken: '',
  // Fetch mode to satisfy your CORS policy. Common values: 'cors', 'same-origin'.
  fetchMode: 'cors',
  // Credential policy for fetch requests. Use 'include' if the API relies on cookies.
  credentials: 'omit',
  // Extra headers to merge into every request, e.g. { 'X-Requested-With': 'XMLHttpRequest' }.
  extraHeaders: {}
};
