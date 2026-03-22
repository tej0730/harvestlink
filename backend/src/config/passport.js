const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Only configure Google OAuth if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const name  = profile.displayName;
      const googleId = profile.id;
      const profilePhotoUrl = profile.photos?.[0]?.value;

      // Check if user exists
      let user = await prisma.user.findUnique({ where: { googleId } });

      if (!user) {
        // Check if email exists (user registered with email before)
        user = await prisma.user.findUnique({ where: { email } });

        if (user) {
          // Link Google ID to existing account
          user = await prisma.user.update({
            where: { email },
            data: { googleId, profilePhotoUrl: profilePhotoUrl || user.profilePhotoUrl }
          });
        } else {
          // Brand new user — default to buyer, they can change later
          user = await prisma.user.create({
            data: {
              email, name, googleId,
              role: 'buyer',
              profilePhotoUrl
            }
          });
        }
      }

      return done(null, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePhotoUrl: user.profilePhotoUrl
      });
    } catch (err) {
      return done(err, null);
    }
  }));
} else {
  console.log('⚠️  Google OAuth not configured — skipping. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable.');
}

module.exports = passport;
