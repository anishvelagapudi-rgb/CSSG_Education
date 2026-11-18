import { useEffect, useState } from 'react'
import { getNotes, createNote, deleteNote, type Note } from './api'
import './App.css'

// Only rendered once someone is logged in (see AuthGate), so every request has a token.
function App() {
  const [notes, setNotes] = useState<Note[]>([])
  const [body, setBody] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getNotes()
      .then(setNotes)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    try {
      const created = await createNote(body, isPublic)
      setNotes((prev) => [created, ...prev])
      setBody('')
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteNote(id)
      setNotes((prev) => prev.filter((n) => n.id !== id))
      setError(null)
    } catch (err) {
      // Try deleting someone else's public note: RLS makes this "not found".
      setError((err as Error).message)
    }
  }

  return (
    <main className="app">
      <h1>My notes</h1>

      <form onSubmit={handleSubmit} className="example-form">
        <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a note" />
        <label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> public
        </label>
        <button type="submit">Add</button>
      </form>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : notes.length === 0 ? (
        <p>No notes yet. Add one above!</p>
      ) : (
        <ul className="example-list">
          {notes.map((n) => (
            <li key={n.id}>
              {n.body} {n.is_public && <small>(public)</small>}{' '}
              <button onClick={() => handleDelete(n.id)}>delete</button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default App
