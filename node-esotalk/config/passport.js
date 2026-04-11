const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

module.exports = function(passport) {
  // 1. Local Strategy (Email/Password)
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        const user = await User.findOne({ where: { email } });
        if (!user) return done(null, false, { message: 'That email is not registered' });
        
        // OAuth users without password
        if (!user.password) return done(null, false, { message: 'Use OAuth to login' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
          return done(null, user);
        } else {
          return done(null, false, { message: 'Password incorrect' });
        }
      } catch (error) {
        return done(error);
      }
    })
  );

  // 2. Google OAuth Strategy
  passport.use(
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID || 'placeholder',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder',
        callbackURL: '/auth/google/callback'
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          let user = await User.findOne({ where: { email } });
          
          if (!user) {
             // Return false for user, but pass the cleanly synthesized profile object in 'info' so we can stage them for 2FA
             return done(null, false, { 
                profile: { 
                   username: profile.displayName || email.split('@')[0], 
                   email: email 
                } 
             });
          }
          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );

  // 3. GitHub OAuth Strategy
  passport.use(
    new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID || 'placeholder',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || 'placeholder',
        callbackURL: '/auth/github/callback'
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.username}@github.com`;
          let user = await User.findOne({ where: { email } });
          
          if (!user) {
             return done(null, false, { 
                profile: { 
                   username: profile.username, 
                   email: email 
                } 
             });
          }
          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findByPk(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};
