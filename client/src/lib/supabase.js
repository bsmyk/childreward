import { createClient } from '@supabase/supabase-js'

// Browser Supabase client. Built from the public anon key — safe to ship to the
// browser because Row Level Security guards the data. The URL/key come from
// Vite env (VITE_*), which is the only env exposed to client code.
const url = import.meta.env?.VITE_SUPABASE_URL
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Fail loudly during dev so a misconfigured env is obvious, rather than
  // silently producing a client that 401s every call.
  // eslint-disable-next-line no-console
  console.error(
    'Supabase client misconfigured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example).'
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '')

export default supabase
