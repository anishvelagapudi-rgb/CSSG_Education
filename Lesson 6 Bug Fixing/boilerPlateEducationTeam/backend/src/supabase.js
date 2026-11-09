import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Copy .env.example to .env and fill them in.'
  );
}

// Secret key (sb_secret_...) bypasses Row Level Security.
// It must ONLY live on the backend - never put it in the frontend.
export const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);
