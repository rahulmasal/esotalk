const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Channel = require('./Channel');

const Conversation = sequelize.define('Conversation', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  countPosts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isClosed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  tags: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

Conversation.belongsTo(User, { as: 'startUser', foreignKey: 'startUserId' });
Conversation.belongsTo(Channel, { foreignKey: 'channelId' });

module.exports = Conversation;
