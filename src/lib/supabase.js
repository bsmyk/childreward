'use strict';

const { createClient } = require('@supabase/supabase-js');

/**
 * Singleton Supabase server client.
 *
 * Built from SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. The service-role key
 * bypasses Row Level Security, so this client must only ever run server-side.
 * Missing env throws a clear startup error rather than failing lazily on the
 * first query.
 */

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  const missing = [
    !url && 'SUPABASE_URL',
    !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
  ]
    .filter(Boolean)
    .join(', ');
  throw new Error(
    `Supabase server client cannot start: missing env var(s) ${missing}. ` +
      'Set them (see .env.example) before booting the server.'
  );
}

// The server only uses Postgres (REST) + Auth — never Realtime. On Node < 22
// there is no global WebSocket, and supabase-js eagerly constructs a Realtime
// client whose factory throws without one. Pass a no-op transport so the
// client constructs cleanly; it is never instantiated because we never open a
// realtime channel.
class NoopWebSocket {}

// Server-side: no session persistence, no token auto-refresh, no realtime.
const supabase = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    transport: NoopWebSocket,
  },
});

module.exports = supabase;
module.exports.supabase = supabase;
