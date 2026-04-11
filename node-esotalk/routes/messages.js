const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/rbac');
const Message = require('../models/Message');
const User = require('../models/User');
const { Op } = require('sequelize');

// Inbox: List conversations
router.get('/', requireAuth, async (req, res) => {
    try {
        const messages = await Message.findAll({
            where: {
                [Op.or]: [
                    { senderId: req.user.id },
                    { receiverId: req.user.id }
                ]
            },
            include: [
                { model: User, as: 'sender', attributes: ['id', 'username', 'avatarUrl'] },
                { model: User, as: 'receiver', attributes: ['id', 'username', 'avatarUrl'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        // Get unique conversation partners
        const partnersMap = new Map();
        messages.forEach(msg => {
            const partnerId = msg.senderId === req.user.id ? msg.receiverId : msg.senderId;
            const partner = msg.senderId === req.user.id ? msg.receiver : msg.sender;
            if (!partnersMap.has(partnerId)) {
                partnersMap.set(partnerId, { partner, lastMessage: msg, unread: 0 });
            }
            if (msg.receiverId === req.user.id && !msg.isRead) {
                const entry = partnersMap.get(partnerId);
                entry.unread++;
            }
        });

        res.render('messages', { 
            title: 'Messages', 
            conversations: Array.from(partnersMap.values())
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading messages');
    }
});

// Chat with specific user
router.get('/chat/:userId', requireAuth, async (req, res) => {
    try {
        const partner = await User.findByPk(req.params.userId, {
            attributes: ['id', 'username', 'avatarUrl']
        });
        if (!partner) return res.status(404).send('User not found');

        const messages = await Message.findAll({
            where: {
                [Op.or]: [
                    { senderId: req.user.id, receiverId: partner.id },
                    { senderId: partner.id, receiverId: req.user.id }
                ]
            },
            order: [['createdAt', 'ASC']],
            limit: 100
        });

        // Mark as read
        await Message.update({ isRead: true }, {
            where: { senderId: partner.id, receiverId: req.user.id, isRead: false }
        });

        res.render('chat', { title: `Chat with ${partner.username}`, partner, messages });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading chat');
    }
});

// Send message
router.post('/send', requireAuth, async (req, res) => {
    try {
        const { receiverId, content } = req.body;
        if (!content || !content.trim()) return res.redirect('back');

        const message = await Message.create({
            senderId: req.user.id,
            receiverId: parseInt(receiverId),
            content: content.trim()
        });

        // Real-time delivery via Socket.IO
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${receiverId}`).emit('newMessage', {
                id: message.id,
                senderId: req.user.id,
                senderName: req.user.username,
                content: message.content,
                createdAt: message.createdAt
            });
        }

        res.redirect(`/messages/chat/${receiverId}`);
    } catch (err) {
        console.error(err);
        res.redirect('/messages');
    }
});

module.exports = router;
