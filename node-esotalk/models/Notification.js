const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Notification = sequelize.define('Notification', {
  type: {
    type: DataTypes.STRING, // 'mention', 'reaction', 'reply', 'dm', 'badge', 'system'
    allowNull: false
  },
  message: {
    type: DataTypes.STRING,
    allowNull: false
  },
  link: {
    type: DataTypes.STRING // URL to navigate to when clicked
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

Notification.belongsTo(User, { as: 'recipient', foreignKey: 'recipientId' });
Notification.belongsTo(User, { as: 'actor', foreignKey: 'actorId' });

module.exports = Notification;
