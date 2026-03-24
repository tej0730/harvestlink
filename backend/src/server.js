const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const helmet     = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit  = require('express-rate-limit');
const passport   = require('./config/passport');
require('dotenv').config();

// ── Cron jobs ─────────────────────────────────────────────────────────────────
require('./jobs/releaseExpiredReservations');
require('./jobs/aggregateDemandStats');
require('./jobs/sendPickupReminders');

const app    = express();
const server = http.createServer(app);

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, credentials: true }
});

// Make io globally available for notification service
global.io = io;

const { verifyAccessToken } = require('./utils/jwt.util');

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('No token'));
  try {
    const decoded   = verifyAccessToken(token);
    socket.userId   = decoded.id;
    socket.userRole = decoded.role;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  // Join personal notification room
  socket.join(`user:${socket.userId}`);
  console.log(`User ${socket.userId} connected`);

  // Join order chat room
  socket.on('join:order', (orderId) => {
    socket.join(`order:${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
  });
});

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const authLimiter   = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
app.use(globalLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',          authLimiter, require('./routes/auth.routes'));
app.use('/api/listings',                   require('./routes/listings.routes'));
app.use('/api/orders',                     require('./routes/orders.routes'));
app.use('/api/requests',                   require('./routes/requests.routes'));
app.use('/api/pickup-slots',               require('./routes/pickupSlots.routes'));
app.use('/api/notifications',              require('./routes/notifications.routes'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong' });
});

// ── Start (use server not app for Socket.IO) ──────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
