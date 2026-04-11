const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// GET routes
router.get('/login', (req, res) => res.render('login', { title: 'Log In' }));
router.get('/signup', (req, res) => res.render('signup', { title: 'Sign Up' }));

const disposableDomains = require('disposable-email-domains');
const nodemailer = require('nodemailer');

// Temporary Transporter - Uses a fake testing account unless configured
// Users should put real SMTP details in .env (e.g. SMTP_HOST, SMTP_PORT)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// POST routes for Local Auth
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // 1. Block Disposable Emails
    const domain = email.split('@')[1];
    if (disposableDomains.includes(domain)) {
      return res.render('signup', { title: 'Sign Up', error: 'Disposable email addresses are not permitted.' });
    }

    // 2. Check if user already exists
    let user = await User.findOne({ where: { email } });
    if (user) {
      return res.render('signup', { title: 'Sign Up', error: 'Email already exists' });
    }

    // 3. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Temporarily stage user in Redis-backed Session (Expires automatically on session timeout)
    req.session.stagedUser = { username, email, hashedPassword, otp };

    // 5. Dispatch email
    console.log(`\n\n=== DEVELOPMENT OTP: ${otp} ===\n\n`); // Log to console for easy testing
    if (process.env.SMTP_USER) {
        await transporter.sendMail({
            from: '"esoTalk Plus" <noreply@esotalkplus.com>',
            to: email,
            subject: 'Verify your esoTalk Plus Account',
            text: `Your One-Time Password (OTP) is: ${otp}`
        });
    }

    res.redirect('/auth/verify-otp');
  } catch (error) {
    console.error(error);
    res.redirect('/auth/signup');
  }
});

// OTP Input Page
router.get('/verify-otp', (req, res) => {
    if (!req.session.stagedUser) return res.redirect('/auth/signup');
    res.render('verify-otp', { title: 'Verify Email', email: req.session.stagedUser.email });
});

// Resend OTP Endpoint
router.post('/resend-otp', async (req, res) => {
    if (!req.session.stagedUser) return res.redirect('/auth/signup');
    
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    req.session.stagedUser.otp = newOtp;
    
    console.log(`\n\n=== RESENT DEVELOPMENT OTP: ${newOtp} ===\n\n`);
    res.redirect('/auth/verify-otp');
});

const { authenticator } = require('otplib');
const qrcode = require('qrcode');

// OTP Verification -> Redirect to 2FA Setup
router.post('/verify-otp', async (req, res) => {
    try {
        const stagedUser = req.session.stagedUser;
        if (!stagedUser) return res.redirect('/auth/signup');

        const { code } = req.body;
        
        if (code !== stagedUser.otp) {
            return res.render('verify-otp', { title: 'Verify Email', error: 'Invalid OTP Code. Please try again.', email: stagedUser.email });
        }

        // OTP matches - Stage for 2FA setup instead of creating user
        stagedUser.otpVerified = true;
        res.redirect('/auth/setup-2fa');
    } catch (error) {
        console.error(error);
        res.redirect('/auth/verify-otp');
    }
});

// Setup Compulsory 2FA
router.get('/setup-2fa', async (req, res) => {
    const stagedUser = req.session.stagedUser;
    if (!stagedUser || !stagedUser.otpVerified) return res.redirect('/auth/signup');

    const secret = authenticator.generateSecret();
    stagedUser.twoFactorSecret = secret; // Save temp secret locally

    const otpauthUrl = authenticator.keyuri(stagedUser.email, 'esoTalk Plus', secret);
    const qrImage = await qrcode.toDataURL(otpauthUrl);

    res.render('setup-2fa', { title: 'Setup 2FA', qrImage, secret });
});

// Verify 2FA and Finalize Registration
router.post('/setup-2fa', async (req, res) => {
    try {
        const stagedUser = req.session.stagedUser;
        if (!stagedUser || !stagedUser.otpVerified) return res.redirect('/auth/signup');

        const { token } = req.body;
        const isValid = authenticator.check(token, stagedUser.twoFactorSecret);

        if (!isValid) {
            // Need to regenerate QR if we just render view again, simpler to just redirect to the get logic
            return res.redirect('/auth/setup-2fa?error=invalid');
        }

        // Token matches - Officially create the user with 2FA bound
        await User.create({ 
            username: stagedUser.username, 
            email: stagedUser.email, 
            password: stagedUser.hashedPassword,
            twoFactorSecret: stagedUser.twoFactorSecret,
            isTwoFactorEnabled: true
        });

        // Clean up staged data
        delete req.session.stagedUser;

        res.redirect('/auth/login');
    } catch (error) {
        console.error(error);
        res.redirect('/auth/setup-2fa');
    }
});

// Modified Login Flow (Stage 1: Email/Password)
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        
        if (!user || !user.isTwoFactorEnabled) {
             return res.render('login', { title: 'Log In', error: 'Invalid credentials or missing 2FA.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('login', { title: 'Log In', error: 'Invalid credentials.' });
        }

        // Credentials match, stage for 2FA
        req.session.pending2FA = user.id;
        res.redirect('/auth/verify-login-2fa');
    } catch(err) {
        next(err);
    }
});

// Modified Login Flow (Stage 2: Check 2FA Pin)
router.get('/verify-login-2fa', (req, res) => {
    if (!req.session.pending2FA) return res.redirect('/auth/login');
    res.render('verify-login-2fa', { title: '2FA Verification' });
});

router.post('/verify-login-2fa', async (req, res, next) => {
    try {
        if (!req.session.pending2FA) return res.redirect('/auth/login');

        const user = await User.findByPk(req.session.pending2FA);
        if (!user) return res.redirect('/auth/login');

        const { token } = req.body;
        const isValid = authenticator.check(token, user.twoFactorSecret);

        if (!isValid) {
            return res.render('verify-login-2fa', { title: '2FA Verification', error: 'Invalid Authenticator Code.' });
        }

        // Clear staging and officially log the user in via Passport
        delete req.session.pending2FA;
        req.login(user, (err) => {
            if (err) return next(err);
            res.redirect('/');
        });
    } catch(err) {
        next(err);
    }
});

// OAuth Callback Interceptor Helper
const handleOAuthCallback = (strategy) => {
    return (req, res, next) => {
        passport.authenticate(strategy, async (err, user, info) => {
            if (err) return next(err);
            if (user) {
                // Existing user - stage for 2FA verification to login
                req.session.pending2FA = user.id;
                return res.redirect('/auth/verify-login-2fa');
            }
            if (info && info.profile) {
                // New user - stage them directly into 2FA Setup
                req.session.stagedUser = { 
                    username: info.profile.username, 
                    email: info.profile.email, 
                    hashedPassword: '', // OAuth users have no password
                    otpVerified: true,  // OAuth pre-verifies emails
                };
                return res.redirect('/auth/setup-2fa');
            }
            res.redirect('/auth/login');
        })(req, res, next);
    };
};

// OAuth Google Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', handleOAuthCallback('google'));

// OAuth Github Routes
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback', handleOAuthCallback('github'));

// Logout
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
});

module.exports = router;
