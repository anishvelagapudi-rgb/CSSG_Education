import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import AuthForm from './AuthForm'

// Shows the login form until someone is logged in, then shows your app.
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Already logged in from last time? (supabase-js keeps the session in localStorage)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    // Re-render whenever someone logs in or out.
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession))
    return () => data.subscription.unsubscribe()
  }, [])

  if (loading) return <p>Loading...</p>
  if (!session) return <AuthForm />

  return (
    <>
      <header style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center', padding: '12px 16px' }}>
        <span>Logged in as <b>{session.user.email}</b></span>
        <button onClick={() => supabase.auth.signOut()}>Log out</button>
      </header>
      {children}
    </>
  )
}
