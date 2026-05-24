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

// Time ago helper
function timeAgo(date) {
  if (!date) return '';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// Home route (Topic list) — with pinned first
router.get('/', async (req, res) => {
  try {
    const conversations = await Conversation.findAll({
      include: [{ model: User, as: 'startUser', attributes: ['username', 'avatarUrl'] }],
      order: [['isPinned', 'DESC'], ['createdAt', 'DESC']],
      limit: 20
    });
    res.render('index', { title: 'esoTalk Plus', conversations, user: req.user, timeAgo });
  } catch (err) {
    console.error(err);
    res.render('index', { title: 'esoTalk Plus', conversations: [], user: req.user, timeAgo });
  }
});

// View single conversation
router.get('/conversation/:slug', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      where: { slug: req.params.slug },
      include: [{ model: User, as: 'startUser', attributes: ['id', 'username', 'avatarUrl'] }]
    });
    if (!conversation) return res.status(404).send('Conversation not found');

    const posts = await Post.findAll({
      where: { conversationId: conversation.id },
      include: [{ model: User, attributes: ['id', 'username', 'avatarUrl', 'reputation'] }],
      order: [['createdAt', 'ASC']]
    });

    const poll = await Poll.findOne({ where: { conversationId: conversation.id } });

    res.render('conversation', {
      title: conversation.title,
      conversation,
      posts,
      poll,
      user: req.user
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading conversation');
  }
});

// Start new conversation page
router.get('/conversation/start', requireAuth, async (req, res) => {
  try {
    const channels = await Channel.findAll({ order: [['title', 'ASC']] });
    res.render('start-conversation', { title: 'New Conversation', channels });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading form');
  }
});

// Create new conversation
router.post('/conversation/start', requireAuth, async (req, res) => {
  try {
    const { title, content, channelId } = req.body;
    if (!title || !content) {
      return res.status(400).send('Title and content are required');
    }
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
    const conversation = await Conversation.create({
      title: title.trim(),
      slug,
      memberId: req.user.id,
      channelId: channelId || null,
      lastActive: new Date()
    });
    await Post.create({
      content: content.trim(),
      memberId: req.user.id,
      conversationId: conversation.id
    });
    res.redirect(`/conversation/${conversation.slug}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating conversation');
  }
});

// Reply to conversation
router.post('/conversation/:slug/reply', requireAuth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ where: { slug: req.params.slug } });
    if (!conversation) return res.status(404).send('Conversation not found');
    const { content } = req.body;
    if (!content || !content.trim()) return res.redirect('back');
    await Post.create({
      content: content.trim(),
      memberId: req.user.id,
      conversationId: conversation.id
    });
    conversation.lastActive = new Date();
    await conversation.save();
    res.redirect(`/conversation/${conversation.slug}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error posting reply');
  }
});

// Channels page
router.get('/channels', async (req, res) => {
  try {
    const channels = await Channel.findAll({ order: [['title', 'ASC']] });
    const channelData = await Promise.all(channels.map(async (ch) => {
      const count = await Conversation.count({ where: { channelId: ch.id } });
      return { ...ch.toJSON(), conversationCount: count };
    }));
    res.render('channels', { title: 'Channels', channels: channelData });
  } catch (err) {
    console.error(err);
    res.render('channels', { title: 'Channels', channels: [] });
  }
});

// Full-Text Search
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q.trim()) return res.render('search', { title: 'Search', results: [], query: '' });

    // Escape LIKE wildcards to prevent wildcard injection
    const escaped = q.replace(/[%_]/g, '\\$&');

    const conversations = await Conversation.findAll({
      where: { title: { [Op.iLike]: `%${escaped}%` } },
      include: [{ model: User, as: 'startUser', attributes: ['username'] }],
      order: [['createdAt', 'DESC']],
      limit: 30
    });

    const posts = await Post.findAll({
      where: { content: { [Op.iLike]: `%${escaped}%` } },
      include: [
        { model: User, attributes: ['username'] },
        { model: Conversation, attributes: ['title', 'slug'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 30
    });

    const safeTitle = `Search: ${q.replace(/[<>&"']/g, '')}`;
    res.render('search', { title: safeTitle, results: { conversations, posts }, query: q });
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

    // Bounds check
    if (isNaN(optionIndex) || optionIndex < 0 || optionIndex >= options.length) {
      return res.status(400).json({ success: false, error: 'Invalid option' });
    }

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

// ──────────────────────────────────────
// POST EDITING WITH HISTORY
// ──────────────────────────────────────
const PostEdit = require('../models/PostEdit');

router.post('/post/:id/edit', requireAuth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const isOwner = post.memberId === req.user.id;
    const isModerator = ['admin', 'moderator'].includes(req.user.role);
    if (!isOwner && !isModerator) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Save edit history
    await PostEdit.create({
      postId: post.id,
      previousContent: post.content,
      editorId: req.user.id
    });

    post.content = req.body.content;
    await post.save();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// View edit history
router.get('/post/:id/history', async (req, res) => {
  try {
    const edits = await PostEdit.findAll({
      where: { postId: req.params.id },
      include: [{ model: User, as: 'editor', attributes: ['username'] }],
      order: [['editedAt', 'DESC']]
    });
    res.json({ edits });
  } catch (err) {
    res.json({ edits: [] });
  }
});

// ──────────────────────────────────────
// POST DELETION (Own Posts)
// ──────────────────────────────────────
router.delete('/post/:id', requireAuth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const isOwner = post.memberId === req.user.id;
    const isModerator = ['admin', 'moderator'].includes(req.user.role);
    if (!isOwner && !isModerator) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await post.destroy();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────
// THREAD SUBSCRIPTIONS (Follow)
// ──────────────────────────────────────
const Subscription = require('../models/Subscription');
const Notification = require('../models/Notification');

router.post('/subscribe/:conversationId', requireAuth, async (req, res) => {
  try {
    const exists = await Subscription.findOne({
      where: { userId: req.user.id, conversationId: req.params.conversationId }
    });
    if (exists) {
      await exists.destroy();
      res.json({ success: true, subscribed: false });
    } else {
      await Subscription.create({ userId: req.user.id, conversationId: req.params.conversationId });
      res.json({ success: true, subscribed: true });
    }
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Check subscription status
router.get('/subscribe/:conversationId/status', requireAuth, async (req, res) => {
  try {
    const sub = await Subscription.findOne({
      where: { userId: req.user.id, conversationId: req.params.conversationId }
    });
    res.json({ subscribed: !!sub });
  } catch (err) {
    res.json({ subscribed: false });
  }
});

// ──────────────────────────────────────
// USER RANK CALCULATOR
// ──────────────────────────────────────
function getUserRank(postCount) {
  if (postCount >= 500) return '🏆 Legend';
  if (postCount >= 200) return '⭐ Elder';
  if (postCount >= 100) return '🔥 Veteran';
  if (postCount >= 50) return '💎 Regular';
  if (postCount >= 10) return '🌱 Active';
  return '👋 Newbie';
}

// API: Get user rank
router.get('/api/user/:id/rank', async (req, res) => {
  try {
    const postCount = await Post.count({ where: { memberId: req.params.id } });
    res.json({ rank: getUserRank(postCount), postCount });
  } catch (err) {
    res.json({ rank: '👋 Newbie', postCount: 0 });
  }
});

module.exports = router;
