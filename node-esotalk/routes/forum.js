const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');

// Home route (Topic list)
router.get('/', async (req, res) => {
  // Fetch some conversations (this is scaffold for now)
  const conversations = await Conversation.findAll({ order: [['createdAt', 'DESC']], limit: 20 });
  res.render('index', { title: 'esoTalk - Forum', conversations });
});

module.exports = router;
