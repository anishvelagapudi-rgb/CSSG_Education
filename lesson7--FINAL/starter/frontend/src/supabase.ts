import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in frontend/.env')
}

// The browser only uses Supabase for LOGIN. Data still goes through your Express API.
// Publishable key: safe to ship to the browser because every table has RLS on.
export const supabase = createClient(url, key)
