const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('esotalk', 'postgres', 'password', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false,
});

module.exports = sequelize;
