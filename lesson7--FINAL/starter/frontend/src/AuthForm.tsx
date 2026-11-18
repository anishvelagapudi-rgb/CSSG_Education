import { useState } from 'react'
import { supabase } from './supabase'

// Log in / sign up form. The password goes straight to Supabase, never to your backend.
export default function AuthForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    // On success AuthGate notices the new session by itself; nothing else to do here.
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <main className="app">
      <h1>{mode === 'login' ? 'Log in' : 'Create an account'}</h1>
      <form onSubmit={handleSubmit} className="example-form" style={{ flexDirection: 'column' }}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (6+ characters)" minLength={6} required />
        <button type="submit" disabled={busy}>{mode === 'login' ? 'Log in' : 'Sign up'}</button>
      </form>
      {error && <p className="error">{error}</p>}
      <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}
      </button>
    </main>
  )
}
