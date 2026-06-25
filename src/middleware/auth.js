'use strict';

const supabase = require('../lib/supabase');

/**
 * Express auth middleware backed by Supabase Auth.
 *
 * `requireAuth` verifies the bearer JWT and attaches the caller's profile to
 * `req.user`. `requireParent` builds on it to gate parent-only routes.
 */

/**
 * Pull a bearer token out of the Authorization header.
 *
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function bearerToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }
  return token.trim();
}

/**
 * Verify the bearer JWT via Supabase and attach `req.user = { id, role,
 * family_id }`. Responds 401 JSON `{ error }` on any failure.
 *
 * @type {import('express').RequestHandler}
 */
async function requireAuth(req, res, next) {
  const token = bearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, family_id')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'No profile for this user' });
    }

    req.user = {
      id: profile.id,
      role: profile.role,
      family_id: profile.family_id,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Gate a route to parents. Must run after `requireAuth`. Responds 403 JSON
 * `{ error }` when the caller's role is not 'parent'.
 *
 * @type {import('express').RequestHandler}
 */
function requireParent(req, res, next) {
  if (!req.user || req.user.role !== 'parent') {
    return res.status(403).json({ error: 'Parent role required' });
  }
  return next();
}

module.exports = { requireAuth, requireParent };
