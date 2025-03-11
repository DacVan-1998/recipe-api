var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fs = require('fs');

const sequelize = require('./config/database');
const models = require('./models');

var indexRouter = require('./routes/index');
var recipesRouter = require('./routes/recipes');

var app = express();

// Set up uploads directory based on environment
const uploadDir = process.env.NODE_ENV === 'production'
  ? path.join('/data', 'uploads')
  : path.join(__dirname, 'public/uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded files from persistent storage in production
if (process.env.NODE_ENV === 'production') {
  app.use('/uploads', express.static(uploadDir));
}

// Database initialization with force sync to recreate all tables
sequelize.sync({ force: true })
  .then(() => {
    console.log('Database connected and tables recreated');
    
    // Create some default categories
    return models.Category.bulkCreate([
      { name: 'Italian' },
      { name: 'Chinese' },
      { name: 'Mexican' },
      { name: 'Indian' },
      { name: 'Vegetarian' },
      { name: 'Dessert' },
      { name: 'Việt Nam' }
    ]);
  })
  .then(() => {
    console.log('Default categories created');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

// view engine setupFcr
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/api/recipes', recipesRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
