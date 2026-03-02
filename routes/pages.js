const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Login page (no auth required)
router.get('/login', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/');
  res.render('login', { error: req.query.error });
});

// All other pages require auth
router.use(requireAuth);

// Dashboard
router.get('/', (req, res) => {
  const statusCounts = db.prepare(`
    SELECT status, COUNT(*) as count FROM batches
    WHERE status != 'done' GROUP BY status ORDER BY
    CASE status
      WHEN 'planned' THEN 1 WHEN 'seeded' THEN 2 WHEN 'germinating' THEN 3
      WHEN 'growing' THEN 4 WHEN 'transplanted' THEN 5 WHEN 'budding' THEN 6
      WHEN 'blooming' THEN 7 WHEN 'harvesting' THEN 8
    END
  `).all();

  const recentBatches = db.prepare(`
    SELECT b.*, v.name as variety_name, l.name as location_name
    FROM batches b
    LEFT JOIN varieties v ON b.variety_id = v.id
    LEFT JOIN locations l ON b.location_id = l.id
    ORDER BY b.updated_at DESC LIMIT 10
  `).all();

  const upcomingMilestones = db.prepare(`
    SELECT b.id, b.batch_code, b.status, b.actual_seed_date, b.germination_date,
           v.name as variety_name, v.days_to_germination, v.days_to_bloom, v.days_to_transplant
    FROM batches b
    JOIN varieties v ON b.variety_id = v.id
    WHERE b.status NOT IN ('done', 'harvesting')
    AND b.actual_seed_date IS NOT NULL
    ORDER BY b.actual_seed_date DESC
    LIMIT 10
  `).all();

  const totalVarieties = db.prepare('SELECT COUNT(*) as count FROM varieties').get().count;
  const totalLocations = db.prepare('SELECT COUNT(*) as count FROM locations').get().count;

  res.render('dashboard', { statusCounts, recentBatches, upcomingMilestones, totalVarieties, totalLocations });
});

// Varieties pages
router.get('/varieties', (req, res) => {
  const varieties = db.prepare('SELECT * FROM varieties ORDER BY name').all();
  res.render('varieties/index', { varieties });
});

router.get('/varieties/new', (req, res) => {
  res.render('varieties/form', { variety: null });
});

router.get('/varieties/:id/edit', (req, res) => {
  const variety = db.prepare('SELECT * FROM varieties WHERE id = ?').get(req.params.id);
  if (!variety) return res.redirect('/varieties');
  res.render('varieties/form', { variety });
});

// Locations pages
router.get('/locations', (req, res) => {
  const locations = db.prepare('SELECT * FROM locations ORDER BY name').all();
  res.render('locations/index', { locations });
});

router.get('/locations/new', (req, res) => {
  res.render('locations/form', { location: null });
});

router.get('/locations/:id/edit', (req, res) => {
  const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
  if (!location) return res.redirect('/locations');
  res.render('locations/form', { location });
});

// Calendar view
router.get('/calendar', (req, res) => {
  const now = new Date();
  let year = parseInt(req.query.year) || now.getFullYear();
  let month = parseInt(req.query.month) || (now.getMonth() + 1);

  // Clamp month and adjust year
  if (month < 1) { month = 12; year--; }
  if (month > 12) { month = 1; year++; }

  // Calendar grid boundaries
  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDayOfWeek = firstOfMonth.getDay(); // 0=Sun

  // Visible window: include prev/next month overflow days
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - startDayOfWeek);
  const totalCells = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridEnd.getDate() + totalCells - 1);

  const fmt = (d) => d.toISOString().slice(0, 10);
  const gridStartStr = fmt(gridStart);
  const gridEndStr = fmt(gridEnd);

  // Query batches that overlap the visible window
  const dateFields = [
    'planned_seed_date', 'actual_seed_date', 'germination_date',
    'transplant_date', 'first_bud_date', 'first_bloom_date',
    'harvest_start_date', 'harvest_end_date'
  ];

  // Query all batches that have at least one date, then compute spans in JS
  // (SQLite's multi-arg MIN/MAX returns NULL if any arg is NULL, so we can't use it)
  const allBatches = db.prepare(`
    SELECT b.*, v.name as variety_name, v.color as variety_color,
           l.name as location_name
    FROM batches b
    LEFT JOIN varieties v ON b.variety_id = v.id
    LEFT JOIN locations l ON b.location_id = l.id
    WHERE (${dateFields.map(f => `b.${f} IS NOT NULL AND b.${f} != ''`).join(' OR ')})
    ORDER BY v.name
  `).all();

  // Compute earliest/latest dates and filter to visible window
  const batches = allBatches.map(b => {
    const dates = dateFields.map(f => b[f]).filter(d => d && d !== '');
    if (dates.length === 0) return null;
    dates.sort();
    b.earliest_date = dates[0];
    b.latest_date = dates[dates.length - 1];
    return b;
  }).filter(b => b && b.earliest_date <= gridEndStr && b.latest_date >= gridStartStr);

  batches.sort((a, b) => a.earliest_date.localeCompare(b.earliest_date) || (a.variety_name || '').localeCompare(b.variety_name || ''));

  // Prev/next month params
  let prevMonth = month - 1, prevYear = year;
  if (prevMonth < 1) { prevMonth = 12; prevYear--; }
  let nextMonth = month + 1, nextYear = year;
  if (nextMonth > 12) { nextMonth = 1; nextYear++; }

  const monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];

  res.render('calendar', {
    batches, year, month,
    monthName: monthNames[month - 1],
    daysInMonth, startDayOfWeek, totalCells,
    gridStartStr, gridEndStr,
    prevMonth, prevYear, nextMonth, nextYear,
    today: fmt(now)
  });
});

// Batches pages
router.get('/batches', (req, res) => {
  const { status, variety_id, location_id, season, year } = req.query;
  let where = [];
  let params = [];

  if (status) { where.push('b.status = ?'); params.push(status); }
  if (variety_id) { where.push('b.variety_id = ?'); params.push(variety_id); }
  if (location_id) { where.push('b.location_id = ?'); params.push(location_id); }
  if (season) { where.push('b.season = ?'); params.push(season); }
  if (year) { where.push('b.year = ?'); params.push(year); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const batches = db.prepare(`
    SELECT b.*, v.name as variety_name, l.name as location_name
    FROM batches b
    LEFT JOIN varieties v ON b.variety_id = v.id
    LEFT JOIN locations l ON b.location_id = l.id
    ${whereClause}
    ORDER BY b.updated_at DESC
  `).all(...params);

  const varieties = db.prepare('SELECT id, name FROM varieties ORDER BY name').all();
  const locations = db.prepare('SELECT id, name FROM locations ORDER BY name').all();
  const statuses = ['planned','seeded','germinating','growing','transplanted','budding','blooming','harvesting','done'];

  res.render('batches/index', {
    batches, varieties, locations, statuses,
    filters: { status, variety_id, location_id, season, year }
  });
});

router.get('/batches/new', (req, res) => {
  const varieties = db.prepare('SELECT id, name FROM varieties ORDER BY name').all();
  const locations = db.prepare('SELECT id, name FROM locations ORDER BY name').all();
  res.render('batches/form', { batch: null, varieties, locations });
});

router.get('/batches/:id', (req, res) => {
  const batch = db.prepare(`
    SELECT b.*, v.name as variety_name, v.days_to_germination, v.days_to_transplant,
           v.days_to_bloom, v.type as variety_type, v.color as variety_color,
           l.name as location_name
    FROM batches b
    LEFT JOIN varieties v ON b.variety_id = v.id
    LEFT JOIN locations l ON b.location_id = l.id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!batch) return res.redirect('/batches');

  const notes = db.prepare(
    'SELECT * FROM batch_notes WHERE batch_id = ? ORDER BY note_date DESC, created_at DESC'
  ).all(req.params.id);

  const statuses = ['planned','seeded','germinating','growing','transplanted','budding','blooming','harvesting','done'];

  res.render('batches/detail', { batch, notes, statuses });
});

router.get('/batches/:id/edit', (req, res) => {
  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id);
  if (!batch) return res.redirect('/batches');
  const varieties = db.prepare('SELECT id, name FROM varieties ORDER BY name').all();
  const locations = db.prepare('SELECT id, name FROM locations ORDER BY name').all();
  res.render('batches/form', { batch, varieties, locations });
});

module.exports = router;
