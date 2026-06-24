// The single shared API client. Every component talks to the backend through
// these helpers — no `fetch` calls live anywhere else in the UI.
//
// Base URL is RELATIVE by default (empty string) so requests hit the same
// origin that serves the SPA. In production Express serves client/dist/ and the
// API on one origin; in dev the Vite proxy forwards the same relative paths to
// the Express backend. Override with VITE_API_BASE only for unusual setups
// (e.g. pointing a local SPA at a remote backend).
const BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || '';

/**
 * Thrown for non-2xx responses so callers can branch on failure.
 */
export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  const init = { method, headers };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, init);

  // Parse JSON when present; tolerate empty/non-JSON bodies.
  const text = await res.text();
  let data;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(`Request to ${path} failed with ${res.status}`, {
      status: res.status,
      body: data,
    });
  }

  return data;
}

export function get(path) {
  return request(path, { method: 'GET' });
}

export function post(path, body) {
  return request(path, { method: 'POST', body });
}

export function patch(path, body) {
  return request(path, { method: 'PATCH', body });
}

export function del(path) {
  return request(path, { method: 'DELETE' });
}

/**
 * Convenience: fetch the backend health probe.
 * @returns {Promise<{ status: string }>}
 */
export function health() {
  return get('/health');
}

export default { get, post, patch, del, health, ApiError };
