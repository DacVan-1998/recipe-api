const express = require('express');
const router = express.Router();
const { Recipe, Ingredient, Instruction, Category, InstructionImage } = require('../models');
const { Op } = require('sequelize');
const createError = require('http-errors');

/* GET home page with search and filters */
router.get('/', async function(req, res, next) {
  try {
    const { search, category } = req.query;
    
    // Always get categories first
    const categories = await Category.findAll({
      order: [['name', 'ASC']]
    });

    const where = {};
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const include = [
      {
        model: Category,
        as: 'categories',
        through: { attributes: [] }
      }
    ];

    if (category) {
      include[0].where = { name: category };
    }

    const recipes = await Recipe.findAll({
      where,
      include,
      order: [['created_at', 'DESC']]
    });

    res.render('index', { 
      title: 'Cooking Recipes',
      recipes: recipes || [],
      categories: categories || [],
      search: search || '',
      category: category || ''
    });
  } catch (error) {
    console.error('Error in index route:', error);
    // Render the page with empty data in case of error
    res.render('index', {
      title: 'Cooking Recipes',
      recipes: [],
      categories: [],
      search: '',
      category: '',
      error: 'Failed to load recipes'
    });
  }
});

/* GET new recipe form */
router.get('/recipe/new', async function(req, res, next) {
  try {
    const categories = await Category.findAll({
      order: [['name', 'ASC']]
    });
    
    res.render('recipe-form', { 
      title: 'Create New Recipe',
      recipe: null,
      categories: categories || []
    });
  } catch (error) {
    next(error);
  }
});

/* GET edit recipe form */
router.get('/recipe/:id/edit', async function(req, res, next) {
  try {
    const [recipe, categories] = await Promise.all([
      Recipe.findByPk(req.params.id, {
        include: [
          { model: Ingredient, as: 'ingredients' },
          { 
            model: Instruction,
            as: 'instructions',
            include: [{ model: InstructionImage, as: 'images' }],
            order: [['step_number', 'ASC']]
          },
          { model: Category, as: 'categories' }
        ]
      }),
      Category.findAll({
        order: [['name', 'ASC']]
      })
    ]);

    if (!recipe) {
      return next(createError(404));
    }

    res.render('recipe-form', { 
      title: 'Edit Recipe',
      recipe,
      categories: categories || []
    });
  } catch (error) {
    next(error);
  }
});

/* GET recipe detail page */
router.get('/recipe/:id', async function(req, res, next) {
  try {
    const recipe = await Recipe.findByPk(req.params.id, {
      include: [
        { model: Ingredient, as: 'ingredients' },
        { 
          model: Instruction,
          as: 'instructions',
          include: [{ model: InstructionImage, as: 'images' }],
          order: [['step_number', 'ASC']]
        },
        { model: Category, as: 'categories' }
      ]
    });

    if (!recipe) {
      return next(createError(404));
    }

    res.render('recipe', { 
      title: recipe.title,
      recipe
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
