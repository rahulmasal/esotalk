const { Sequelize } = require('sequelize');
require('dotenv').config();

if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASS) {
  console.error('FATAL: DB_NAME, DB_USER, and DB_PASS must be set in .env');
  process.exit(1);
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

module.exports = sequelize;
