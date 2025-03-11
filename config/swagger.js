const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Cooking Recipe API',
      version: '1.0.0',
      description: 'API documentation for the Cooking Recipe application',
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://recipe.dummy.asia'
          : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      schemas: {
        Recipe: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            description: { type: 'string' },
            prep_time: { type: 'integer' },
            cook_time: { type: 'integer' },
            servings: { type: 'integer' },
            image_url: { type: 'string' },
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  quantity: { type: 'number' },
                  unit: { type: 'string' },
                },
              },
            },
            instructions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  step_number: { type: 'integer' },
                  description: { type: 'string' },
                  images: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        path: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
            categories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js'], // Path to the API routes
};

module.exports = swaggerJsdoc(options);