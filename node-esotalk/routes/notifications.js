const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/rbac');
const Notification = require('../models/Notification');
const User = require('../models/User');

// Notification Center
router.get('/', requireAuth, async (req, res) => {
    try {
        const notifications = await Notification.findAll({
            where: { recipientId: req.user.id },
            include: [{ model: User, as: 'actor', attributes: ['username', 'avatarUrl'] }],
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        // Mark all as read
        await Notification.update({ isRead: true }, {
            where: { recipientId: req.user.id, isRead: false }
        });

        res.render('notifications', { title: 'Notifications', notifications });
    } catch (err) {
        console.error(err);
        res.render('notifications', { title: 'Notifications', notifications: [] });
    }
});

// API: Get unread count (for navbar badge)
router.get('/unread-count', requireAuth, async (req, res) => {
    try {
        const count = await Notification.count({
            where: { recipientId: req.user.id, isRead: false }
        });
        res.json({ count });
    } catch (err) {
        res.json({ count: 0 });
    }
});

// Clear all notifications
router.post('/clear', requireAuth, async (req, res) => {
    try {
        await Notification.destroy({ where: { recipientId: req.user.id } });
        res.redirect('/notifications');
    } catch (err) {
        res.redirect('/notifications');
    }
});

module.exports = router;
