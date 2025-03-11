const { Sequelize } = require('sequelize');
const path = require('path');

// In production (Render.com), use the persistent disk storage
const dbPath = process.env.NODE_ENV === 'production'
  ? '/data/database.sqlite'
  : path.join(__dirname, '../database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false
});

module.exports = sequelize;