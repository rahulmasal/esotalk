const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
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

    // 1.5. Validate password strength
    if (!password || password.length < 8) {
      return res.render('signup', { title: 'Sign Up', error: 'Password must be at least 8 characters.' });
    }

    // 2. Check if user already exists
    let existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.render('signup', { title: 'Sign Up', error: 'An account with that email already exists.' });
    }
    let existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res.render('signup', { title: 'Sign Up', error: 'That username is already taken.' });
    }

    // 3. Generate 6-digit OTP using cryptographically secure PRNG
    const otp = crypto.randomInt(100000, 999999).toString();
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
    
    const newOtp = crypto.randomInt(100000, 999999).toString();
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
        
        if (code.length !== stagedUser.otp.length || !crypto.timingSafeEqual(Buffer.from(code), Buffer.from(stagedUser.otp))) {
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

    const error = req.query.error === 'invalid' ? 'Invalid Code. Please try again.' : null;
    res.render('setup-2fa', { title: 'Setup 2FA', qrImage, secret, error });
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
        // Auto-promote the very first user to admin
        const adminExists = await User.findOne({ where: { role: 'admin' } });
        
        await User.create({ 
            username: stagedUser.username, 
            email: stagedUser.email, 
            password: stagedUser.hashedPassword,
            twoFactorSecret: stagedUser.twoFactorSecret,
            isTwoFactorEnabled: true,
            role: adminExists ? 'member' : 'admin'
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
        
        if (!user) {
             return res.render('login', { title: 'Log In', error: 'Invalid credentials.' });
        }

        if (user.isBanned) {
             return res.render('login', { title: 'Log In', error: 'Your account has been suspended.' });
        }

        if (!user.isTwoFactorEnabled) {
             return res.render('login', { title: 'Log In', error: 'Please complete 2FA setup first.' });
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
                    hashedPassword: 'oauth-only-' + crypto.randomBytes(32).toString('hex'), // Not a real password
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

// ──────────────────────────────────────
// FORGOT PASSWORD FLOW
// ──────────────────────────────────────
const PasswordReset = require('../models/PasswordReset');

router.get('/forgot-password', (req, res) => {
    res.render('forgot-password', { title: 'Forgot Password' });
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ where: { email } });
        
        if (!user) {
            return res.render('forgot-password', { title: 'Forgot Password', error: 'No account found with that email.' });
        }

        // Generate secure random token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        await PasswordReset.create({ email, token, expiresAt });

        const resetLink = `${req.protocol}://${req.get('host')}/auth/reset-password/${token}`;
        
        console.log(`\n\n=== PASSWORD RESET LINK: ${resetLink} ===\n\n`);
        
        if (process.env.SMTP_USER) {
            await transporter.sendMail({
                from: '"esoTalk Plus" <noreply@esotalkplus.com>',
                to: email,
                subject: 'Reset your esoTalk Plus Password',
                html: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetLink}">${resetLink}</a></p>`
            });
        }

        res.render('forgot-password', { title: 'Forgot Password', success: 'If that email exists, a reset link has been sent.' });
    } catch (err) {
        console.error(err);
        res.render('forgot-password', { title: 'Forgot Password', error: 'Something went wrong. Try again.' });
    }
});

router.get('/reset-password/:token', async (req, res) => {
    try {
        const reset = await PasswordReset.findOne({ 
            where: { token: req.params.token, used: false } 
        });
        
        if (!reset || new Date() > reset.expiresAt) {
            return res.render('forgot-password', { title: 'Forgot Password', error: 'Invalid or expired reset link.' });
        }

        res.render('reset-password', { title: 'Reset Password', token: req.params.token });
    } catch (err) {
        console.error(err);
        res.redirect('/auth/forgot-password');
    }
});

router.post('/reset-password/:token', async (req, res) => {
    try {
        const reset = await PasswordReset.findOne({ 
            where: { token: req.params.token, used: false } 
        });
        
        if (!reset || new Date() > reset.expiresAt) {
            return res.render('forgot-password', { title: 'Forgot Password', error: 'Invalid or expired reset link.' });
        }

        const { password, confirmPassword } = req.body;
        if (password !== confirmPassword) {
            return res.render('reset-password', { title: 'Reset Password', token: req.params.token, error: 'Passwords do not match.' });
        }
        if (!password || password.length < 8) {
            return res.render('reset-password', { title: 'Reset Password', token: req.params.token, error: 'Password must be at least 8 characters.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await User.update({ password: hashedPassword }, { where: { email: reset.email } });

        reset.used = true;
        await reset.save();

        res.redirect('/auth/login');
    } catch (err) {
        console.error(err);
        res.redirect('/auth/forgot-password');
    }
});

// ──────────────────────────────────────
// ACCOUNT DELETION (GDPR)
// ──────────────────────────────────────
router.get('/delete-account', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/auth/login');
    res.render('delete-account', { title: 'Delete Account' });
});

router.post('/delete-account', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/auth/login');
    try {
        const { confirmation } = req.body;
        if (confirmation !== 'DELETE') {
            return res.render('delete-account', { title: 'Delete Account', error: 'You must type DELETE to confirm.' });
        }

        const userId = req.user.id;

        // Cascade delete user data in a transaction
        const Post = require('../models/Post');
        const Message = require('../models/Message');
        const Notification = require('../models/Notification');
        const Bookmark = require('../models/Bookmark');
        const Draft = require('../models/Draft');
        const sequelize = require('../config/database');

        await sequelize.transaction(async (t) => {
            await Post.destroy({ where: { memberId: userId }, transaction: t });
            await Message.destroy({ where: { senderId: userId }, transaction: t });
            await Message.destroy({ where: { receiverId: userId }, transaction: t });
            await Notification.destroy({ where: { recipientId: userId }, transaction: t });
            await Bookmark.destroy({ where: { userId }, transaction: t });
            await Draft.destroy({ where: { userId }, transaction: t });
            await User.destroy({ where: { id: userId }, transaction: t });
        });

        req.logout((err) => {
            req.session.destroy();
            res.redirect('/');
        });
    } catch (err) {
        console.error(err);
        res.render('delete-account', { title: 'Delete Account', error: 'Deletion failed. Contact support.' });
    }
});

// Logout
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
});

module.exports = router;

