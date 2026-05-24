const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  avatarFormat: {
    type: DataTypes.STRING,
  },
  preferences: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  reputation: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  badges: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  isBanned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  role: {
    type: DataTypes.ENUM('member', 'moderator', 'admin'),
    defaultValue: 'member'
  },
  bio: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  avatarUrl: {
    type: DataTypes.STRING,
    defaultValue: '/img/default-avatar.png'
  },
  twoFactorSecret: {
    type: DataTypes.STRING,
  },
  isTwoFactorEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

module.exports = User;
