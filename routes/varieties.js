const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

// GET /api/varieties - list all
router.get('/', (req, res) => {
  const varieties = db.prepare('SELECT * FROM varieties ORDER BY name').all();
  res.json(varieties);
});

// GET /api/varieties/:id
router.get('/:id', (req, res) => {
  const variety = db.prepare('SELECT * FROM varieties WHERE id = ?').get(req.params.id);
  if (!variety) return res.status(404).json({ error: 'Variety not found' });
  res.json(variety);
});

// POST /api/varieties
router.post('/', (req, res) => {
  const { name, type, color, days_to_germination, days_to_transplant, days_to_bloom,
          spacing_inches, light_requirement, pinch, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const result = db.prepare(`
    INSERT INTO varieties (name, type, color, days_to_germination, days_to_transplant,
      days_to_bloom, spacing_inches, light_requirement, pinch, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(), type || null, color || null,
    days_to_germination || null, days_to_transplant || null, days_to_bloom || null,
    spacing_inches || null, light_requirement || null, pinch ? 1 : 0, notes || null
  );

  res.status(201).json({ id: result.lastInsertRowid });
});

// PUT /api/varieties/:id
router.put('/:id', (req, res) => {
  const { name, type, color, days_to_germination, days_to_transplant, days_to_bloom,
          spacing_inches, light_requirement, pinch, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const existing = db.prepare('SELECT id FROM varieties WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Variety not found' });

  db.prepare(`
    UPDATE varieties SET name = ?, type = ?, color = ?, days_to_germination = ?,
      days_to_transplant = ?, days_to_bloom = ?, spacing_inches = ?,
      light_requirement = ?, pinch = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name.trim(), type || null, color || null,
    days_to_germination || null, days_to_transplant || null, days_to_bloom || null,
    spacing_inches || null, light_requirement || null, pinch ? 1 : 0, notes || null,
    req.params.id
  );

  res.json({ success: true });
});

// DELETE /api/varieties/:id
router.delete('/:id', (req, res) => {
  const batches = db.prepare('SELECT COUNT(*) as count FROM batches WHERE variety_id = ?').get(req.params.id);
  if (batches.count > 0) {
    return res.status(400).json({ error: 'Cannot delete variety with existing batches' });
  }

  const result = db.prepare('DELETE FROM varieties WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Variety not found' });
  res.json({ success: true });
});

module.exports = router;
