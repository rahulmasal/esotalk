const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Conversation = require('./Conversation');

const Draft = sequelize.define('Draft', {
  content: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  title: {
    type: DataTypes.STRING,
    defaultValue: ''
  }
});

Draft.belongsTo(User, { foreignKey: 'userId' });
Draft.belongsTo(Conversation, { foreignKey: 'conversationId', allowNull: true }); // null = new thread draft

module.exports = Draft;
