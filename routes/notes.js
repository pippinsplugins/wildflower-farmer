const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

// POST /api/batches/:id/notes
router.post('/:id/notes', (req, res) => {
  const { note_text, note_date, category } = req.body;

  if (!note_text || !note_text.trim()) {
    return res.status(400).json({ error: 'Note text is required' });
  }

  const batch = db.prepare('SELECT id FROM batches WHERE id = ?').get(req.params.id);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });

  const today = new Date().toISOString().split('T')[0];

  const result = db.prepare(
    'INSERT INTO batch_notes (batch_id, note_text, note_date, category) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, note_text.trim(), note_date || today, category || 'observation');

  // Touch the batch updated_at
  db.prepare('UPDATE batches SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);

  res.status(201).json({ id: result.lastInsertRowid });
});

// DELETE /api/batches/:batchId/notes/:noteId
router.delete('/:batchId/notes/:noteId', (req, res) => {
  const result = db.prepare(
    'DELETE FROM batch_notes WHERE id = ? AND batch_id = ?'
  ).run(req.params.noteId, req.params.batchId);

  if (result.changes === 0) return res.status(404).json({ error: 'Note not found' });
  res.json({ success: true });
});

module.exports = router;
