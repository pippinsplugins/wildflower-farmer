require('dotenv').config();

const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const passport = require('passport');
const path = require('path');

const { configurePassport } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const pageRoutes = require('./routes/pages');
const varietyRoutes = require('./routes/varieties');
const locationRoutes = require('./routes/locations');
const batchRoutes = require('./routes/batches');
const noteRoutes = require('./routes/notes');

// Initialize database (runs schema on first launch)
require('./db/database');

const app = express();
const PORT = process.env.PORT || 3001;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Sessions
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: path.join(__dirname, 'data')
  }),
  secret: process.env.SESSION_SECRET || 'change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    secure: false // set true behind HTTPS proxy
  }
}));

// Passport
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// Make user available to all templates
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.currentPath = req.path;
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/', pageRoutes);
app.use('/api/varieties', varietyRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/batches', noteRoutes);

app.listen(PORT, () => {
  console.log(`Wildflower Farmer running on http://localhost:${PORT}`);
});
