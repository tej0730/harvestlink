const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} = require('../utils/jwt.util');

const prisma = new PrismaClient();

// ── helper: send refresh token as HTTP-only cookie ──────────────────────────
function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

// ── REGISTER ────────────────────────────────────────────────────────────────
async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;

    // Validate role
    if (!['grower', 'buyer'].includes(role)) {
      return res.status(400).json({ message: 'Role must be grower or buyer' });
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role },
      select: { id: true, name: true, email: true, role: true }
    });

    // If grower, create empty farm profile
    if (role === 'grower') {
      await prisma.farm.create({
        data: {
          growerId: user.id,
          farmName: `${name}'s Farm`,
        }
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    setRefreshCookie(res, refreshToken);

    return res.status(201).json({ user, accessToken });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// ── LOGIN ────────────────────────────────────────────────────────────────────
async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, name: true, email: true,
        role: true, passwordHash: true,
        profilePhotoUrl: true, area: true
      }
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const { passwordHash, ...safeUser } = user;

    const accessToken = generateAccessToken(safeUser);
    const refreshToken = generateRefreshToken(safeUser);

    setRefreshCookie(res, refreshToken);

    return res.json({ user: safeUser, accessToken });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// ── REFRESH TOKEN ────────────────────────────────────────────────────────────
async function refresh(req, res) {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ message: 'No refresh token' });
    }

    const decoded = verifyRefreshToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, role: true, profilePhotoUrl: true }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    setRefreshCookie(res, newRefreshToken);

    return res.json({ user, accessToken });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
}

// ── LOGOUT ───────────────────────────────────────────────────────────────────
function logout(req, res) {
  res.clearCookie('refreshToken');
  return res.json({ message: 'Logged out' });
}

// ── GOOGLE OAUTH CALLBACK ────────────────────────────────────────────────────
async function googleCallback(req, res) {
  try {
    const user = req.user; // set by Passport
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    setRefreshCookie(res, refreshToken);

    // Redirect to frontend with token in URL param
    // Frontend reads it once, stores in memory, then discards from URL
    res.redirect(
      `${process.env.CLIENT_URL}/auth/callback?token=${accessToken}`
    );
  } catch (err) {
    res.redirect(`${process.env.CLIENT_URL}/auth/login?error=oauth_failed`);
  }
}

module.exports = { register, login, refresh, logout, googleCallback };
