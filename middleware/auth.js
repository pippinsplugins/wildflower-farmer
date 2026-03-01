const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../db/database');

function configurePassport() {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    done(null, user || false);
  });

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  }, (accessToken, refreshToken, profile, done) => {
    const email = profile.emails && profile.emails[0] && profile.emails[0].value;
    if (!email) {
      return done(null, false, { message: 'No email found in Google profile' });
    }

    const domain = email.split('@')[1];
    const allowedDomains = (process.env.ALLOWED_DOMAINS || '')
      .split(',')
      .map(d => d.trim().toLowerCase())
      .filter(Boolean);

    if (allowedDomains.length > 0 && !allowedDomains.includes(domain.toLowerCase())) {
      return done(null, false, { message: 'Email domain not allowed' });
    }

    const existing = db.prepare('SELECT * FROM users WHERE google_id = ?').get(profile.id);

    if (existing) {
      db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP, name = ?, avatar_url = ?, email = ? WHERE id = ?')
        .run(profile.displayName, profile.photos?.[0]?.value, email, existing.id);
      const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id);
      return done(null, updated);
    }

    const result = db.prepare(
      'INSERT INTO users (google_id, email, name, avatar_url) VALUES (?, ?, ?, ?)'
    ).run(profile.id, email, profile.displayName, profile.photos?.[0]?.value);

    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    done(null, newUser);
  }));
}

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

module.exports = { configurePassport, requireAuth };
