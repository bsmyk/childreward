import { supabase } from './supabase'

// Thin wrapper over Supabase Auth. Email + password only (per spec). Parents
// and kids are both Supabase Auth users; their role lives in the profiles row
// read by the backend.

/**
 * Sign in with email + password. Resolves to the Supabase session on success;
 * throws the Supabase error otherwise so callers can show inline feedback.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('@supabase/supabase-js').Session>}
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    throw error
  }
  return data.session
}

/**
 * Sign the current user out.
 * @returns {Promise<void>}
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}

/**
 * Read the current session (or null when signed out).
 * @returns {Promise<import('@supabase/supabase-js').Session | null>}
 */
export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data?.session ?? null
}

/**
 * Read the current access token (JWT) for bearer auth, or null when signed out.
 * @returns {Promise<string | null>}
 */
export async function getAccessToken() {
  const session = await getSession()
  return session?.access_token ?? null
}
