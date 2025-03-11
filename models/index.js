const Recipe = require('./Recipe');
const Ingredient = require('./Ingredient');
const Instruction = require('./Instruction');
const Category = require('./Category');
const RecipeCategory = require('./RecipeCategory');
const InstructionImage = require('./InstructionImage');

// Recipe - Ingredient relationship (one-to-many)
Recipe.hasMany(Ingredient, {
  foreignKey: 'recipe_id',
  as: 'ingredients'
});
Ingredient.belongsTo(Recipe, {
  foreignKey: 'recipe_id'
});

// Recipe - Instruction relationship (one-to-many)
Recipe.hasMany(Instruction, {
  foreignKey: 'recipe_id',
  as: 'instructions'
});
Instruction.belongsTo(Recipe, {
  foreignKey: 'recipe_id'
});

// Recipe - Category relationship (many-to-many)
Recipe.belongsToMany(Category, {
  through: RecipeCategory,
  foreignKey: 'recipe_id',
  as: 'categories'
});
Category.belongsToMany(Recipe, {
  through: RecipeCategory,
  foreignKey: 'category_id',
  as: 'recipes'
});

// Instruction - InstructionImage relationship (one-to-many)
Instruction.hasMany(InstructionImage, {
  foreignKey: 'instruction_id',
  as: 'images'
});
InstructionImage.belongsTo(Instruction, {
  foreignKey: 'instruction_id'
});

module.exports = {
  Recipe,
  Ingredient,
  Instruction,
  Category,
  RecipeCategory,
  InstructionImage
};