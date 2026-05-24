const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Conversation = require('./Conversation');

const Bookmark = sequelize.define('Bookmark', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: 'bookmark_unique'
  },
  conversationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: 'bookmark_unique'
  }
});

Bookmark.belongsTo(User, { foreignKey: 'userId' });
Bookmark.belongsTo(Conversation, { foreignKey: 'conversationId' });

// Prevent duplicate bookmarks
Bookmark.addHook('beforeCreate', async (bookmark) => {
  const existing = await Bookmark.findOne({
    where: { userId: bookmark.userId, conversationId: bookmark.conversationId }
  });
  if (existing) throw new Error('Already bookmarked');
});

module.exports = Bookmark;
