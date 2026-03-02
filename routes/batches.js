const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

const STATUSES = ['planned','seeded','germinating','growing','transplanted','budding','blooming','harvesting','done'];

const STATUS_DATE_MAP = {
  seeded: 'actual_seed_date',
  germinating: 'germination_date',
  transplanted: 'transplant_date',
  budding: 'first_bud_date',
  blooming: 'first_bloom_date',
  harvesting: 'harvest_start_date',
  done: 'harvest_end_date'
};

function generateBatchCode(varietyId, year) {
  const variety = db.prepare('SELECT name FROM varieties WHERE id = ?').get(varietyId);
  if (!variety) return null;

  // Take first 3 letters of the first significant word, uppercase
  const words = variety.name.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/);
  const abbr = (words[0] || 'XXX').substring(0, 3).toUpperCase();

  // Find the next number for this year+abbr
  const existing = db.prepare(
    "SELECT batch_code FROM batches WHERE batch_code LIKE ? ORDER BY batch_code DESC LIMIT 1"
  ).get(`${year}-${abbr}-%`);

  let num = 1;
  if (existing) {
    const parts = existing.batch_code.split('-');
    num = parseInt(parts[2]) + 1;
  }

  return `${year}-${abbr}-${String(num).padStart(3, '0')}`;
}

// GET /api/batches
router.get('/', (req, res) => {
  const { status, variety_id, location_id, season, year, date_from, date_to } = req.query;
  let where = [];
  let params = [];

  if (status) { where.push('b.status = ?'); params.push(status); }
  if (variety_id) { where.push('b.variety_id = ?'); params.push(variety_id); }
  if (location_id) { where.push('b.location_id = ?'); params.push(location_id); }
  if (season) { where.push('b.season = ?'); params.push(season); }
  if (year) { where.push('b.year = ?'); params.push(year); }
  if (date_from) { where.push('b.planned_seed_date >= ?'); params.push(date_from); }
  if (date_to) { where.push('b.planned_seed_date <= ?'); params.push(date_to); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const batches = db.prepare(`
    SELECT b.*, v.name as variety_name, l.name as location_name
    FROM batches b
    LEFT JOIN varieties v ON b.variety_id = v.id
    LEFT JOIN locations l ON b.location_id = l.id
    ${whereClause}
    ORDER BY b.updated_at DESC
  `).all(...params);

  res.json(batches);
});

// GET /api/batches/:id
router.get('/:id', (req, res) => {
  const batch = db.prepare(`
    SELECT b.*, v.name as variety_name, l.name as location_name
    FROM batches b
    LEFT JOIN varieties v ON b.variety_id = v.id
    LEFT JOIN locations l ON b.location_id = l.id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  res.json(batch);
});

// POST /api/batches
router.post('/', (req, res) => {
  const { variety_id, location_id, quantity, seed_source, season, year,
          planned_seed_date, notes } = req.body;

  if (!variety_id) return res.status(400).json({ error: 'Variety is required' });

  const batchYear = year || new Date().getFullYear();
  const batchCode = generateBatchCode(variety_id, batchYear);
  if (!batchCode) return res.status(400).json({ error: 'Invalid variety' });

  const result = db.prepare(`
    INSERT INTO batches (variety_id, location_id, batch_code, quantity, seed_source,
      season, year, status, planned_seed_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'planned', ?, ?)
  `).run(
    variety_id, location_id || null, batchCode, quantity || null,
    seed_source || null, season || null, batchYear, planned_seed_date || null, notes || null
  );

  res.status(201).json({ id: result.lastInsertRowid, batch_code: batchCode });
});

// PUT /api/batches/:id
router.put('/:id', (req, res) => {
  const { variety_id, location_id, quantity, seed_source, season, year,
          planned_seed_date, actual_seed_date, germination_date, transplant_date,
          first_bud_date, first_bloom_date, harvest_start_date, harvest_end_date, notes } = req.body;

  const existing = db.prepare('SELECT id FROM batches WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Batch not found' });

  db.prepare(`
    UPDATE batches SET variety_id = ?, location_id = ?, quantity = ?, seed_source = ?,
      season = ?, year = ?, planned_seed_date = ?, actual_seed_date = ?,
      germination_date = ?, transplant_date = ?, first_bud_date = ?,
      first_bloom_date = ?, harvest_start_date = ?, harvest_end_date = ?,
      notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    variety_id, location_id || null, quantity || null, seed_source || null,
    season || null, year || null, planned_seed_date || null, actual_seed_date || null,
    germination_date || null, transplant_date || null, first_bud_date || null,
    first_bloom_date || null, harvest_start_date || null, harvest_end_date || null,
    notes || null, req.params.id
  );

  res.json({ success: true });
});

// POST /api/batches/:id/status - advance status
router.post('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });

  const today = new Date().toISOString().split('T')[0];
  const dateField = STATUS_DATE_MAP[status];

  if (dateField) {
    // Only set the date if it's not already set
    if (!batch[dateField]) {
      db.prepare(`UPDATE batches SET ${dateField} = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(today, status, req.params.id);
    } else {
      db.prepare('UPDATE batches SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(status, req.params.id);
    }
  } else {
    db.prepare('UPDATE batches SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, req.params.id);
  }

  res.json({ success: true, status });
});

// DELETE /api/batches/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM batch_notes WHERE batch_id = ?').run(req.params.id);
  const result = db.prepare('DELETE FROM batches WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Batch not found' });
  res.json({ success: true });
});

module.exports = router;
