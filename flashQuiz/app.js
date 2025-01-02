const express = require('express');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');

const app = express();

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

// These should be at the top, before routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// Session settings
app.use(session({
    secret: 'your_secret_key',
    resave: true,
    saveUninitialized: true
}));
app.use(flash());

// Serve static files
app.use(express.static('public'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('view engine', 'ejs');

// Add this to debug static files
app.use((req, res, next) => {
    console.log('Request URL:', req.url);
    next();
});

// Routes
const indexRouter = require('./routes/index');
app.use('/', indexRouter);

// Register routes in correct order
app.use('/users', require('./routes/users'));
app.use('/attempts', require('./routes/attempts')); // Make sure this is here
app.use('/quizzes', require('./routes/quizzes'));

// ...existing code...

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});