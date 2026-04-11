const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Conversation = require('./Conversation');

const Poll = sequelize.define('Poll', {
  question: {
    type: DataTypes.STRING,
    allowNull: false
  },
  options: {
    type: DataTypes.JSONB, // [{ text: 'Option A', votes: [userId1, userId2] }, ...]
    defaultValue: []
  },
  expiresAt: {
    type: DataTypes.DATE
  },
  isMultiChoice: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

Poll.belongsTo(User, { foreignKey: 'creatorId' });
Poll.belongsTo(Conversation, { foreignKey: 'conversationId' });

module.exports = Poll;
