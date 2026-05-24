const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Conversation = require('./Conversation');

const Subscription = sequelize.define('Subscription', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: 'subscription_unique'
  },
  conversationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: 'subscription_unique'
  }
});

Subscription.belongsTo(User, { foreignKey: 'userId' });
Subscription.belongsTo(Conversation, { foreignKey: 'conversationId' });

module.exports = Subscription;
