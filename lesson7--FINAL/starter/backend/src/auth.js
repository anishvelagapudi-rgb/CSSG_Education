import { createRemoteJWKSet, jwtVerify } from 'jose';

const { SUPABASE_JWKS_URL } = process.env;
if (!SUPABASE_JWKS_URL) {
  throw new Error('Missing SUPABASE_JWKS_URL. Copy it from Supabase -> Project Settings -> API Keys into backend/.env.');
}

// Supabase's PUBLIC signing keys. jose downloads them once and caches them.
// Public keys can check a signature but can't make one, so they're safe to fetch.
const JWKS = createRemoteJWKSet(new URL(SUPABASE_JWKS_URL));

// Middleware: only lets a request through if it carries a valid Supabase login token.
// Afterwards: req.user.id = the logged-in user's id, req.token = their token.
export async function requireUser(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not logged in' });

  try {
    // Checks the signature (was it really made by Supabase?) and exp (has it expired?).
    const { payload } = await jwtVerify(token, JWKS, { audience: 'authenticated' });
    req.user = { id: payload.sub, email: payload.email };
    req.token = token;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token. Log in again.' });
  }
}
