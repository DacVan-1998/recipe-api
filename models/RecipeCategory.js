const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RecipeCategory = sequelize.define('RecipeCategory', {
  recipe_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: 'Recipes',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  category_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: 'Categories',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  }
}, {
  timestamps: true,
  tableName: 'RecipeCategories'
});

module.exports = RecipeCategory;