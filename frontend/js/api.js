/**
 * api.js — tiny fetch wrapper shared by login.html and index.html.
 * Change API_BASE here if you deploy the backend somewhere other than localhost.
 */

const API_BASE = 'https://job-application-tracker-1jou.onrender.com/api';

const auth = {
  getToken() {
    return localStorage.getItem('boarding_token');
  },
  getUser() {
    const raw = localStorage.getItem('boarding_user');
    return raw ? JSON.parse(raw) : null;
  },
  setSession(token, user) {
    localStorage.setItem('boarding_token', token);
    localStorage.setItem('boarding_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('boarding_token');
    localStorage.removeItem('boarding_user');
  },
  isLoggedIn() {
    return Boolean(this.getToken());
  }
};

/**
 * apiRequest — wraps fetch with JSON handling, auth header, and consistent errors.
 * Throws an Error with a human-readable message on failure so callers can
 * show it directly in the UI.
 */
async function apiRequest(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = auth.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (networkErr) {
    throw new Error('Could not reach the server. Is the backend running on port 5000?');
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    // empty body is fine for some responses
  }

  if (!response.ok) {
    if (response.status === 401) {
      auth.clearSession();
    }
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}
