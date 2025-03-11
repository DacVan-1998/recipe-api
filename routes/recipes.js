const express = require('express');
const router = express.Router();
const { Recipe, Ingredient, Instruction, Category, InstructionImage } = require('../models');
const { Op } = require('sequelize');
const upload = require('../config/multer');
const path = require('path');
const fs = require('fs').promises;

// Multer fields configuration
const uploadFields = [
  { name: 'recipe_image', maxCount: 1 },
  { name: /^instruction_images_\d+$/, maxCount: 10 } // Match any instruction images field
];

/**
 * @swagger
 * /api/recipes:
 *   get:
 *     summary: List all recipes
 *     description: Retrieve a list of recipes with optional search and category filters
 *     tags: [Recipes]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for recipe title or description
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter recipes by category name
 *     responses:
 *       200:
 *         description: A list of recipes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Recipe'
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const { search, category } = req.query;
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
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/recipes/{id}:
 *   get:
 *     summary: Get a recipe by ID
 *     description: Retrieve detailed information about a specific recipe
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Recipe ID
 *     responses:
 *       200:
 *         description: Recipe details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Recipe'
 *       404:
 *         description: Recipe not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id, {
      include: [
        {
          model: Ingredient,
          as: 'ingredients'
        },
        {
          model: Instruction,
          as: 'instructions',
          include: [
            {
              model: InstructionImage,
              as: 'images'
            }
          ],
          order: [['step_number', 'ASC']]
        },
        {
          model: Category,
          as: 'categories',
          through: { attributes: [] }
        }
      ]
    });
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/recipes:
 *   post:
 *     summary: Create a new recipe
 *     description: Create a new recipe with ingredients, instructions, and optional images
 *     tags: [Recipes]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               prep_time:
 *                 type: integer
 *               cook_time:
 *                 type: integer
 *               servings:
 *                 type: integer
 *               recipe_image:
 *                 type: string
 *                 format: binary
 *               ingredients:
 *                 type: string
 *                 description: JSON string of ingredients array
 *               instructions:
 *                 type: string
 *                 description: JSON string of instructions array
 *               categoryIds:
 *                 type: string
 *                 description: JSON string of category IDs array
 *     responses:
 *       201:
 *         description: Recipe created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Recipe'
 *       400:
 *         description: Invalid request data
 */
router.post('/', upload.any(), async (req, res) => {
  try {
    const { title, description, prep_time, cook_time, servings } = req.body;
    const ingredients = JSON.parse(req.body.ingredients || '[]');
    const instructions = JSON.parse(req.body.instructions || '[]');
    const categoryIds = JSON.parse(req.body.categoryIds || '[]');
    
    // Handle recipe main image
    let image_url = null;
    if (req.files && req.files.recipe_image) {
      const file = req.files.recipe_image[0];
      image_url = '/uploads/' + path.relative('public/uploads', file.path);
    }

    const recipe = await Recipe.create({
      title,
      description,
      image_url,
      prep_time,
      cook_time,
      servings
    });

    // Create ingredients
    if (ingredients.length > 0) {
      await Ingredient.bulkCreate(
        ingredients.map(ing => ({ ...ing, recipe_id: recipe.id }))
      );
    }

    // Create instructions and their images
    for (let [index, inst] of instructions.entries()) {
      const instruction = await Instruction.create({
        ...inst,
        recipe_id: recipe.id,
        step_number: index + 1
      });

      // Handle instruction images
      const imageFieldName = `instruction_images_${index + 1}`;
      const imageFiles = req.files[imageFieldName] || [];
      if (imageFiles.length > 0) {
        await InstructionImage.bulkCreate(
          imageFiles.map(file => ({
            instruction_id: instruction.id,
            filename: path.basename(file.path),
            original_name: file.originalname,
            mimetype: file.mimetype,
            path: '/uploads/' + path.relative('public/uploads', file.path),
            size: file.size
          }))
        );
      }
    }

    // Set categories
    if (categoryIds.length > 0) {
      await recipe.setCategories(categoryIds);
    }

    const createdRecipe = await Recipe.findByPk(recipe.id, {
      include: [
        { model: Ingredient, as: 'ingredients' },
        { 
          model: Instruction,
          as: 'instructions',
          include: [{ model: InstructionImage, as: 'images' }],
          order: [['step_number', 'ASC']]
        },
        { model: Category, as: 'categories', through: { attributes: [] } }
      ]
    });

    res.status(201).json(createdRecipe);
  } catch (error) {
    // Clean up uploaded files if there's an error
    if (req.files) {
      Object.values(req.files).flat().forEach(async file => {
        try {
          await fs.unlink(file.path);
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      });
    }
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/recipes/{id}:
 *   put:
 *     summary: Update a recipe
 *     description: Update an existing recipe with new data, images, ingredients and instructions
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Recipe ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               prep_time:
 *                 type: integer
 *               cook_time:
 *                 type: integer
 *               servings:
 *                 type: integer
 *               recipe_image:
 *                 type: string
 *                 format: binary
 *               ingredients:
 *                 type: string
 *                 description: JSON string of ingredients array
 *               instructions:
 *                 type: string
 *                 description: JSON string of instructions array
 *               categoryIds:
 *                 type: string
 *                 description: JSON string of category IDs array
 *               deleted_images:
 *                 type: string
 *                 description: Comma-separated list of image IDs to delete
 *     responses:
 *       200:
 *         description: Recipe updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Recipe'
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Recipe not found
 */
router.put('/:id', upload.any(), async (req, res) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const { title, description, prep_time, cook_time, servings } = req.body;
    const ingredients = JSON.parse(req.body.ingredients || '[]');
    const instructions = JSON.parse(req.body.instructions || '[]');
    const categoryIds = JSON.parse(req.body.categoryIds || '[]');
    const deletedImages = req.body.deleted_images ? req.body.deleted_images.split(',') : [];

    // Handle recipe main image
    let image_url = recipe.image_url;
    if (req.files && req.files.recipe_image) {
      const file = req.files.recipe_image[0];
      // Delete old image if exists
      if (recipe.image_url) {
        const oldPath = path.join(__dirname, '../public', recipe.image_url);
        try {
          await fs.unlink(oldPath);
        } catch (err) {
          console.error('Error deleting old image:', err);
        }
      }
      image_url = '/uploads/' + path.relative('public/uploads', file.path);
    }

    // Update recipe basic info
    await recipe.update({
      title,
      description,
      image_url,
      prep_time,
      cook_time,
      servings
    });

    // Update ingredients
    await Ingredient.destroy({ where: { recipe_id: recipe.id } });
    if (ingredients.length > 0) {
      await Ingredient.bulkCreate(
        ingredients.map(ing => ({ ...ing, recipe_id: recipe.id }))
      );
    }

    // Delete removed images
    if (deletedImages.length > 0) {
      const imagesToDelete = await InstructionImage.findAll({
        where: { id: deletedImages }
      });
      
      for (const image of imagesToDelete) {
        const imagePath = path.join(__dirname, '../public', image.path);
        try {
          await fs.unlink(imagePath);
        } catch (err) {
          console.error('Error deleting image:', err);
        }
      }
      
      await InstructionImage.destroy({
        where: { id: deletedImages }
      });
    }

    // Update instructions and their images
    await Instruction.destroy({ where: { recipe_id: recipe.id } });
    for (let [index, inst] of instructions.entries()) {
      const instruction = await Instruction.create({
        ...inst,
        recipe_id: recipe.id,
        step_number: index + 1
      });

      // Handle instruction images
      const imageFieldName = `instruction_images_${index + 1}`;
      const imageFiles = req.files[imageFieldName] || [];
      if (imageFiles.length > 0) {
        await InstructionImage.bulkCreate(
          imageFiles.map(file => ({
            instruction_id: instruction.id,
            filename: path.basename(file.path),
            original_name: file.originalname,
            mimetype: file.mimetype,
            path: '/uploads/' + path.relative('public/uploads', file.path),
            size: file.size
          }))
        );
      }
    }

    // Update categories
    await recipe.setCategories(categoryIds);

    const updatedRecipe = await Recipe.findByPk(recipe.id, {
      include: [
        { model: Ingredient, as: 'ingredients' },
        { 
          model: Instruction,
          as: 'instructions',
          include: [{ model: InstructionImage, as: 'images' }],
          order: [['step_number', 'ASC']]
        },
        { model: Category, as: 'categories', through: { attributes: [] } }
      ]
    });

    res.json(updatedRecipe);
  } catch (error) {
    // Clean up uploaded files if there's an error
    if (req.files) {
      Object.values(req.files).flat().forEach(async file => {
        try {
          await fs.unlink(file.path);
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      });
    }
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/recipes/{id}:
 *   delete:
 *     summary: Delete a recipe
 *     description: Delete a recipe and all associated data including images
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Recipe ID
 *     responses:
 *       204:
 *         description: Recipe successfully deleted
 *       404:
 *         description: Recipe not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id, {
      include: [
        {
          model: Instruction,
          as: 'instructions',
          include: [{ model: InstructionImage, as: 'images' }]
        }
      ]
    });
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Delete all associated images
    if (recipe.image_url) {
      const mainImagePath = path.join(__dirname, '../public', recipe.image_url);
      try {
        await fs.unlink(mainImagePath);
      } catch (err) {
        console.error('Error deleting main image:', err);
      }
    }

    // Delete instruction images
    for (const instruction of recipe.instructions) {
      for (const image of instruction.images) {
        const imagePath = path.join(__dirname, '../public', image.path);
        try {
          await fs.unlink(imagePath);
        } catch (err) {
          console.error('Error deleting instruction image:', err);
        }
      }
    }
    
    await recipe.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;