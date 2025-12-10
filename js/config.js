const runtimeConfig = (typeof window !== 'undefined' && window.__TODO_CONFIG) || {};

const readConfig = (key, fallback) => {
  if (typeof runtimeConfig[key] !== 'undefined' && runtimeConfig[key] !== '') {
    return runtimeConfig[key];
  }
  if (typeof API_ENV !== 'undefined' && typeof API_ENV[key] !== 'undefined') {
    return API_ENV[key];
  }
  return fallback;
};

export const CONFIG = {
  apiBaseUrl: readConfig('apiBaseUrl', 'https://onit.lt/php/todos'),
  authToken: readConfig('authToken', typeof API_AUTH_TOKEN !== 'undefined' ? API_AUTH_TOKEN : ''),
  fetchMode: readConfig('fetchMode', 'cors'),
  credentials: readConfig('credentials', 'omit'),
  extraHeaders: readConfig('extraHeaders', {})
};
