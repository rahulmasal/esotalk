const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const AuditLog = sequelize.define('AuditLog', {
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  targetType: {
    type: DataTypes.STRING // 'user', 'post', 'conversation', 'channel'
  },
  targetId: {
    type: DataTypes.INTEGER
  },
  details: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  ipAddress: {
    type: DataTypes.STRING
  }
});

AuditLog.belongsTo(User, { as: 'actor', foreignKey: 'actorId' });

module.exports = AuditLog;
