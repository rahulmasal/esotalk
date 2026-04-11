const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Post = require('./Post');
const User = require('./User');

const PostEdit = sequelize.define('PostEdit', {
  previousContent: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  editedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

PostEdit.belongsTo(Post, { foreignKey: 'postId' });
PostEdit.belongsTo(User, { as: 'editor', foreignKey: 'editorId' });

module.exports = PostEdit;
