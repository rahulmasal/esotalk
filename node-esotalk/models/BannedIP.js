const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BannedIP = sequelize.define('BannedIP', {
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bannedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

module.exports = BannedIP;
