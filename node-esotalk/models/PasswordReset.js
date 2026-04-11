const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const PasswordReset = sequelize.define('PasswordReset', {
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

module.exports = PasswordReset;
