const Category = require('../models/Category');

async function seedCategories() {
  try {
    const categories = [
      { name: 'Việt Nam' },
      // Add other categories here if needed
    ];

    for (const category of categories) {
      await Category.findOrCreate({
        where: { name: category.name },
        defaults: category
      });
    }

    console.log('Categories seeded successfully');
  } catch (error) {
    console.error('Error seeding categories:', error);
    throw error;
  }
}

module.exports = seedCategories;