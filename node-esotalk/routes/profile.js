const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/rbac');
const User = require('../models/User');
const Post = require('../models/Post');
const Conversation = require('../models/Conversation');
const Bookmark = require('../models/Bookmark');
const Draft = require('../models/Draft');
const multer = require('multer');
const path = require('path');

// Avatar upload config
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
    filename: (req, file, cb) => cb(null, `avatar-${req.user.id}${path.extname(file.originalname)}`)
});
const avatarUpload = multer({ storage: avatarStorage, limits: { fileSize: 2 * 1024 * 1024 } });

// View own or another user's profile
router.get('/:username', async (req, res) => {
    try {
        const profileUser = await User.findOne({ where: { username: req.params.username } });
        if (!profileUser) return res.status(404).send('User not found');

        const postCount = await Post.count({ where: { memberId: profileUser.id } });
        const conversationCount = await Conversation.count({ where: { startUserId: profileUser.id } });

        const recentPosts = await Post.findAll({
            where: { memberId: profileUser.id },
            include: [{ model: Conversation, attributes: ['title', 'slug'] }],
            order: [['createdAt', 'DESC']],
            limit: 10
        });

        res.render('profile', {
            title: `${profileUser.username}'s Profile`,
            profileUser,
            postCount,
            conversationCount,
            recentPosts
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Profile Error');
    }
});

// Edit own profile
router.post('/edit', requireAuth, async (req, res) => {
    try {
        const { bio } = req.body;
        await User.update({ bio }, { where: { id: req.user.id } });
        res.redirect(`/profile/${req.user.username}`);
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

// Upload avatar
router.post('/avatar', requireAuth, avatarUpload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.redirect('back');
        const avatarUrl = `/uploads/${req.file.filename}`;
        await User.update({ avatarUrl }, { where: { id: req.user.id } });
        res.redirect(`/profile/${req.user.username}`);
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

// Bookmarks
router.get('/:username/bookmarks', requireAuth, async (req, res) => {
    try {
        const bookmarks = await Bookmark.findAll({
            where: { userId: req.user.id },
            include: [{ model: Conversation }],
            order: [['createdAt', 'DESC']]
        });
        res.render('bookmarks', { title: 'My Bookmarks', bookmarks });
    } catch (err) {
        console.error(err);
        res.status(500).send('Bookmarks Error');
    }
});

// Drafts
router.get('/:username/drafts', requireAuth, async (req, res) => {
    try {
        const drafts = await Draft.findAll({
            where: { userId: req.user.id },
            order: [['updatedAt', 'DESC']]
        });
        res.render('drafts', { title: 'My Drafts', drafts });
    } catch (err) {
        console.error(err);
        res.status(500).send('Drafts Error');
    }
});

module.exports = router;
