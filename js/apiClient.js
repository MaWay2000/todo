const BASE_URL = 'https://onit.lt/php/todos';
const AUTH_TOKEN = typeof API_AUTH_TOKEN !== 'undefined' ? API_AUTH_TOKEN : '';

const defaultHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  };
  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }
  return headers;
};

const parseJson = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Unexpected response format (${response.status}): ${text || 'non-JSON payload'}`);
  }
  return response.json();
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
  }
  const body = await parseJson(response);
  if (!body || body.status !== 'ok' || typeof body.data === 'undefined') {
    throw new Error(body && body.error ? body.error : 'API returned an unexpected shape');
  }
  return body.data;
};

const methodOverride = (method) => ({
  'X-HTTP-Method-Override': method
});

export class TodoApiClient {
  constructor({ baseUrl = BASE_URL } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async listTodos() {
    const response = await fetch(`${this.baseUrl}/list.php`, {
      method: 'GET',
      mode: 'cors',
      headers: defaultHeaders()
    });
    return handleResponse(response);
  }

  async createTodo(todo) {
    const response = await fetch(`${this.baseUrl}/create.php`, {
      method: 'POST',
      mode: 'cors',
      headers: defaultHeaders(),
      body: JSON.stringify(todo)
    });
    return handleResponse(response);
  }

  async updateTodo(id, updates) {
    const response = await fetch(`${this.baseUrl}/update.php?id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      mode: 'cors',
      headers: { ...defaultHeaders(), ...methodOverride('PUT') },
      body: JSON.stringify(updates)
    });
    return handleResponse(response);
  }

  async deleteTodo(id) {
    const response = await fetch(`${this.baseUrl}/delete.php?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      mode: 'cors',
      headers: { ...defaultHeaders(), ...methodOverride('DELETE') }
    });
    return handleResponse(response);
  }
}
