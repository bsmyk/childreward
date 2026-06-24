'use strict';

/**
 * An HTTP-aware error. Carries the status code, a machine-readable `code`, and
 * a human-readable `message`. Routes throw these (or pass to `next`) and the
 * centralized error-handling middleware renders them into the shared shape:
 *   { error: { code, message } }
 */
class HttpError extends Error {
  /**
   * @param {number} status HTTP status code (e.g. 400, 404)
   * @param {string} code machine-readable error code (e.g. "invalid_title")
   * @param {string} message human-readable description
   */
  constructor(status, code, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Build a 400 Bad Request error.
 *
 * @param {string} code machine-readable error code
 * @param {string} message human-readable description
 * @returns {HttpError}
 */
function badRequest(code, message) {
  return new HttpError(400, code, message);
}

/**
 * Build a 404 Not Found error.
 *
 * @param {string} [message='Resource not found'] human-readable description
 * @returns {HttpError}
 */
function notFound(message = 'Resource not found') {
  return new HttpError(404, 'not_found', message);
}

module.exports = { HttpError, badRequest, notFound };
