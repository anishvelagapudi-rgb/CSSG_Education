import { Router } from 'express';
import { requireUser } from '../auth.js';
import { supabaseAs } from '../supabase.js';

const router = Router();

// Every route below needs a logged-in user. No token -> 401, the database is never touched.
router.use(requireUser);

// GET /api/notes -> the notes this user may see. RLS decides which; no .eq('user_id') needed.
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAs(req.token)
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/notes -> create a note. Body: { "body": "...", "is_public": false }
router.post('/', async (req, res) => {
  const { body, is_public = false } = req.body ?? {};

  if (typeof body !== 'string' || body.trim() === '') {
    return res.status(400).json({ error: 'body is required' });
  }

  // No user_id here on purpose: the column defaults to auth.uid() (the id in the token).
  const { data, error } = await supabaseAs(req.token)
    .from('notes')
    .insert({ body: body.trim(), is_public: Boolean(is_public) })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE /api/notes/:id
router.delete('/:id', async (req, res) => {
  const { data, error } = await supabaseAs(req.token)
    .from('notes')
    .delete()
    .eq('id', req.params.id)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  // RLS doesn't throw an error: deleting someone else's note just matches 0 rows.
  if (data.length === 0) return res.status(404).json({ error: 'Note not found (or not yours)' });
  res.json({ ok: true });
});

export default router;
