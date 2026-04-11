const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Post = require('./Post');

const Report = sequelize.define('Report', {
  reason: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'reviewed', 'dismissed'),
    defaultValue: 'pending'
  },
  details: {
    type: DataTypes.TEXT
  }
});

Report.belongsTo(User, { as: 'reporter', foreignKey: 'reporterId' });
Report.belongsTo(Post, { foreignKey: 'postId' });

module.exports = Report;
