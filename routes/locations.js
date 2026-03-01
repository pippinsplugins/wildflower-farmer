const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

// GET /api/locations
router.get('/', (req, res) => {
  const locations = db.prepare('SELECT * FROM locations ORDER BY name').all();
  res.json(locations);
});

// GET /api/locations/:id
router.get('/:id', (req, res) => {
  const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
  if (!location) return res.status(404).json({ error: 'Location not found' });
  res.json(location);
});

// POST /api/locations
router.post('/', (req, res) => {
  const { name, description, zone, sun_exposure, notes } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const result = db.prepare(
    'INSERT INTO locations (name, description, zone, sun_exposure, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(name.trim(), description || null, zone || null, sun_exposure || null, notes || null);

  res.status(201).json({ id: result.lastInsertRowid });
});

// PUT /api/locations/:id
router.put('/:id', (req, res) => {
  const { name, description, zone, sun_exposure, notes } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const existing = db.prepare('SELECT id FROM locations WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Location not found' });

  db.prepare(`
    UPDATE locations SET name = ?, description = ?, zone = ?, sun_exposure = ?,
      notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(name.trim(), description || null, zone || null, sun_exposure || null, notes || null, req.params.id);

  res.json({ success: true });
});

// DELETE /api/locations/:id
router.delete('/:id', (req, res) => {
  const batches = db.prepare('SELECT COUNT(*) as count FROM batches WHERE location_id = ?').get(req.params.id);
  if (batches.count > 0) {
    return res.status(400).json({ error: 'Cannot delete location with existing batches' });
  }

  const result = db.prepare('DELETE FROM locations WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Location not found' });
  res.json({ success: true });
});

module.exports = router;
