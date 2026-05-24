const express = require('express');
const router = express.Router();
const { requireAdmin, requireModerator } = require('../middleware/rbac');
const User = require('../models/User');
const Post = require('../models/Post');
const Report = require('../models/Report');
const AuditLog = require('../models/AuditLog');
const BannedIP = require('../models/BannedIP');
const Conversation = require('../models/Conversation');

// Admin Dashboard
router.get('/', requireAdmin, async (req, res) => {
    try {
        const totalUsers = await User.count();
        const totalPosts = await Post.count();
        const totalConversations = await Conversation.count();
        const pendingReports = await Report.count({ where: { status: 'pending' } });
        const recentUsers = await User.findAll({ order: [['createdAt', 'DESC']], limit: 10 });
        const recentLogs = await AuditLog.findAll({ 
            order: [['createdAt', 'DESC']], 
            limit: 20,
            include: [{ model: User, as: 'actor', attributes: ['username'] }]
        });
        const bannedIPs = await BannedIP.findAll({ order: [['bannedAt', 'DESC']] });

        res.render('admin', { 
            title: 'Admin Panel',
            totalUsers, totalPosts, totalConversations, pendingReports,
            recentUsers, recentLogs, bannedIPs
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Admin Dashboard Error');
    }
});

// View Reports Queue
router.get('/reports', requireModerator, async (req, res) => {
    try {
        const reports = await Report.findAll({
            include: [
                { model: User, as: 'reporter', attributes: ['username'] },
                { model: Post }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.render('admin-reports', { title: 'Reports Queue', reports });
    } catch (err) {
        console.error(err);
        res.status(500).send('Reports Error');
    }
});

// Update Report Status
router.post('/reports/:id/status', requireModerator, async (req, res) => {
    try {
        const report = await Report.findByPk(req.params.id);
        if (!report) return res.status(404).send('Report not found');
        const allowedStatuses = ['pending', 'reviewed', 'dismissed'];
        if (!allowedStatuses.includes(req.body.status)) {
            return res.status(400).send('Invalid status');
        }
        report.status = req.body.status;
        await report.save();

        await AuditLog.create({
            action: `report_${req.body.status}`,
            targetType: 'report',
            targetId: report.id,
            actorId: req.user.id,
            ipAddress: req.ip
        });

        res.redirect('/admin/reports');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/reports');
    }
});

// Ban User
router.post('/users/:id/ban', requireAdmin, async (req, res) => {
    try {
        const targetUser = await User.findByPk(req.params.id);
        if (!targetUser) return res.status(404).send('User not found');
        targetUser.isBanned = true;
        await targetUser.save();

        await AuditLog.create({
            action: 'user_banned',
            targetType: 'user',
            targetId: targetUser.id,
            actorId: req.user.id,
            details: { username: targetUser.username },
            ipAddress: req.ip
        });

        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.redirect('/admin');
    }
});

// Unban User
router.post('/users/:id/unban', requireAdmin, async (req, res) => {
    try {
        const targetUser = await User.findByPk(req.params.id);
        if (!targetUser) return res.status(404).send('User not found');
        targetUser.isBanned = false;
        await targetUser.save();

        await AuditLog.create({
            action: 'user_unbanned',
            targetType: 'user',
            targetId: targetUser.id,
            actorId: req.user.id,
            details: { username: targetUser.username },
            ipAddress: req.ip
        });

        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.redirect('/admin');
    }
});

// Change User Role
router.post('/users/:id/role', requireAdmin, async (req, res) => {
    try {
        const targetUser = await User.findByPk(req.params.id);
        if (!targetUser) return res.status(404).send('User not found');
        const oldRole = targetUser.role;
        targetUser.role = req.body.role;
        await targetUser.save();

        await AuditLog.create({
            action: 'role_changed',
            targetType: 'user',
            targetId: targetUser.id,
            actorId: req.user.id,
            details: { username: targetUser.username, from: oldRole, to: req.body.role },
            ipAddress: req.ip
        });

        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.redirect('/admin');
    }
});

// Ban IP
router.post('/ban-ip', requireAdmin, async (req, res) => {
    try {
        await BannedIP.create({ ipAddress: req.body.ip, reason: req.body.reason || 'Manual ban' });
        await AuditLog.create({
            action: 'ip_banned',
            targetType: 'ip',
            actorId: req.user.id,
            details: { ip: req.body.ip },
            ipAddress: req.ip
        });
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.redirect('/admin');
    }
});

// Delete Post (Moderator)
router.post('/posts/:id/delete', requireModerator, async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id);
        if (!post) return res.status(404).send('Post not found');

        await AuditLog.create({
            action: 'post_deleted',
            targetType: 'post',
            targetId: post.id,
            actorId: req.user.id,
            details: { content: post.content.substring(0, 100) },
            ipAddress: req.ip
        });

        await post.destroy();
        res.redirect('back');
    } catch (err) {
        console.error(err);
        res.redirect('/admin');
    }
});

// ──────────────────────────────────────
// SECRET ADMIN SETUP (No login required)
// POST /admin/setup with JSON body { token, username }
// Requires ADMIN_SETUP_TOKEN in .env
// ──────────────────────────────────────
router.post('/setup', async (req, res) => {
    try {
        const setupToken = process.env.ADMIN_SETUP_TOKEN;
        if (!setupToken) {
            return res.status(403).send('Admin setup is disabled. Set ADMIN_SETUP_TOKEN in your .env file.');
        }

        const { token, username } = req.body;
        if (!token || !username) {
            return res.status(400).send('POST body must include token and username.');
        }

        if (token !== setupToken) {
            return res.status(403).send('Invalid setup token.');
        }

        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(404).send(`User "${username}" not found.`);
        }

        user.role = 'admin';
        await user.save();

        res.send(`User "${username}" has been promoted to admin! Remove ADMIN_SETUP_TOKEN from .env for security.`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Setup failed.');
    }
});

module.exports = router;
