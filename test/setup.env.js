'use strict';

// Provide placeholder Supabase env so the server client singleton can be
// constructed during tests without real credentials. createClient does not
// open a network connection at construction time, and every test that touches
// the network mocks the Supabase client. This keeps supabase.js's real
// "missing env throws" startup guard intact for production boots.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
