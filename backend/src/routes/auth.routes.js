const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const {
  register,
  login,
  refresh,
  logout,
  googleCallback
} = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Email + password
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);

// Google OAuth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login', session: false }),
  googleCallback
);

// Test protected route — delete later
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
