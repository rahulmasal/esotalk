const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Channel = sequelize.define('Channel', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
});

module.exports = Channel;
