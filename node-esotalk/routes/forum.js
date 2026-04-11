const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Conversation = require('../models/Conversation');
const Post = require('../models/Post');
const User = require('../models/User');
const Channel = require('../models/Channel');
const Poll = require('../models/Poll');
const Bookmark = require('../models/Bookmark');
const Draft = require('../models/Draft');
const Report = require('../models/Report');
const { requireAuth } = require('../middleware/rbac');

// Home route (Topic list) — with pinned first
router.get('/', async (req, res) => {
  try {
    const conversations = await Conversation.findAll({ 
      include: [{ model: User, as: 'startUser', attributes: ['username', 'avatarUrl'] }],
      order: [['isPinned', 'DESC'], ['createdAt', 'DESC']], 
      limit: 20 
    });
    res.render('index', { title: 'esoTalk Plus - Forum', conversations });
  } catch (err) {
    console.error(err);
    res.render('index', { title: 'esoTalk Plus - Forum', conversations: [] });
  }
});

// Full-Text Search
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q.trim()) return res.render('search', { title: 'Search', results: [], query: '' });

    const conversations = await Conversation.findAll({
      where: { title: { [Op.iLike]: `%${q}%` } },
      include: [{ model: User, as: 'startUser', attributes: ['username'] }],
      order: [['createdAt', 'DESC']],
      limit: 30
    });

    const posts = await Post.findAll({
      where: { content: { [Op.iLike]: `%${q}%` } },
      include: [
        { model: User, attributes: ['username'] },
        { model: Conversation, attributes: ['title', 'slug'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 30
    });

    res.render('search', { title: `Search: ${q}`, results: { conversations, posts }, query: q });
  } catch (err) {
    console.error(err);
    res.render('search', { title: 'Search', results: { conversations: [], posts: [] }, query: '' });
  }
});

// Filter by Tag
router.get('/tag/:tag', async (req, res) => {
  try {
    const tag = req.params.tag;
    const conversations = await Conversation.findAll({
      where: { tags: { [Op.contains]: [tag] } },
      include: [{ model: User, as: 'startUser', attributes: ['username'] }],
      order: [['createdAt', 'DESC']]
    });
    res.render('index', { title: `Tag: #${tag}`, conversations });
  } catch (err) {
    console.error(err);
    res.render('index', { title: 'Tag', conversations: [] });
  }
});

// Bookmark a conversation
router.post('/bookmark/:conversationId', requireAuth, async (req, res) => {
  try {
    await Bookmark.create({ userId: req.user.id, conversationId: req.params.conversationId });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Remove bookmark
router.delete('/bookmark/:conversationId', requireAuth, async (req, res) => {
  try {
    await Bookmark.destroy({ where: { userId: req.user.id, conversationId: req.params.conversationId } });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Report a post
router.post('/report/:postId', requireAuth, async (req, res) => {
  try {
    await Report.create({
      reporterId: req.user.id,
      postId: req.params.postId,
      reason: req.body.reason || 'Inappropriate content',
      details: req.body.details || ''
    });
    res.json({ success: true, message: 'Report submitted' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Create Poll
router.post('/poll', requireAuth, async (req, res) => {
  try {
    const { question, options, conversationId, isMultiChoice } = req.body;
    const optionsArray = (typeof options === 'string' ? options.split(',') : options)
      .map(o => ({ text: o.trim(), votes: [] }));

    await Poll.create({
      question,
      options: optionsArray,
      conversationId: parseInt(conversationId),
      creatorId: req.user.id,
      isMultiChoice: isMultiChoice === 'true'
    });
    res.redirect('back');
  } catch (err) {
    console.error(err);
    res.redirect('back');
  }
});

// Vote on Poll
router.post('/poll/:id/vote', requireAuth, async (req, res) => {
  try {
    const poll = await Poll.findByPk(req.params.id);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    const optionIndex = parseInt(req.body.optionIndex);
    const options = [...poll.options];
    
    // Prevent double voting
    const alreadyVoted = options.some(opt => opt.votes.includes(req.user.id));
    if (alreadyVoted && !poll.isMultiChoice) {
      return res.json({ success: false, error: 'Already voted' });
    }

    options[optionIndex].votes.push(req.user.id);
    poll.options = options;
    poll.changed('options', true);
    await poll.save();

    res.json({ success: true, options: poll.options });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Auto-save Draft API
router.post('/draft', requireAuth, async (req, res) => {
  try {
    const { title, content, conversationId } = req.body;
    const [draft] = await Draft.findOrCreate({
      where: { userId: req.user.id, conversationId: conversationId || null },
      defaults: { title, content }
    });
    draft.title = title || draft.title;
    draft.content = content || draft.content;
    await draft.save();
    res.json({ success: true, draftId: draft.id });
  } catch (err) {
    res.json({ success: false });
  }
});

// API: Get posts with pagination (for infinite scroll)
router.get('/api/posts', async (req, res) => {
  try {
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 20;
    const posts = await Post.findAll({
      include: [{ model: User, attributes: ['username', 'avatarUrl'] }],
      order: [['createdAt', 'DESC']],
      offset,
      limit
    });
    res.json({ posts });
  } catch (err) {
    res.json({ posts: [] });
  }
});

module.exports = router;

