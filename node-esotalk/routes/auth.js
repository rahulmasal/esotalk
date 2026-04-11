const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// GET routes
router.get('/login', (req, res) => res.render('login', { title: 'Log In' }));
router.get('/signup', (req, res) => res.render('signup', { title: 'Sign Up' }));

// POST routes for Local Auth
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    let user = await User.findOne({ where: { email } });
    if (user) {
      return res.render('signup', { title: 'Sign Up', error: 'Email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ username, email, password: hashedPassword });
    res.redirect('/auth/login');
  } catch (error) {
    console.error(error);
    res.redirect('/auth/signup');
  }
});

router.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/auth/login',
  failureFlash: false // Add connect-flash later if needed
}));

// OAuth Google Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/auth/login' }), (req, res) => {
  res.redirect('/');
});

// OAuth Github Routes
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback', passport.authenticate('github', { failureRedirect: '/auth/login' }), (req, res) => {
  res.redirect('/');
});

// Logout
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
});

module.exports = router;
