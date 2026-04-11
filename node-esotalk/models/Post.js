const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Conversation = require('./Conversation');

const Post = sequelize.define('Post', {
  content: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  time: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  reactions: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  mentions: {
    type: DataTypes.JSONB,
    defaultValue: []
  }
});

Post.belongsTo(User, { foreignKey: 'memberId' });
Post.belongsTo(Conversation, { foreignKey: 'conversationId' });
Conversation.hasMany(Post, { foreignKey: 'conversationId' });

module.exports = Post;
