// =============================================================================
// supabase.js — Supabase client singleton
// Lazy-loaded: only initializes if env vars are present
// =============================================================================

let _client = null
let _initialized = false

export async function getSupabase() {
  if (_initialized) return _client
  _initialized = true

  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    _client = null
    return null
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    _client = createClient(url, key, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 10 } },
    })
    return _client
  } catch (err) {
    console.warn('Supabase init failed:', err.message)
    _client = null
    return null
  }
}

export function isSupabaseConfigured() {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}
