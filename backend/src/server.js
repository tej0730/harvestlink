// Load environment variables FIRST — before any other imports that need them
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const passport = require('./config/passport');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true  // needed for cookies
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Rate limiting — only in production (dev gets blocked too easily during testing)
if (process.env.NODE_ENV === 'production') {
  const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
  const authLimiter   = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
  app.use(globalLimiter);
  app.use('/api/auth', authLimiter);
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth.routes'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
