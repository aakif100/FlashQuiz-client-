const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { ensureGuest } = require('../middleware/auth');

router.get('/login', ensureGuest, (req, res) => {
    res.render('auth/login');
});

router.get('/register', ensureGuest, (req, res) => {
    res.render('auth/register');
});

router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });

        if (existingUser) {
            req.flash('error_msg', 'Email or username already exists');
            return res.redirect('/auth/register');
        }

        // Create new user
        const user = new User({
            username,
            email,
            password,
            role: role || 'student'
        });

        await user.save();
        req.flash('success_msg', 'Registration successful! Please login.');
        res.redirect('/auth/login');
    } catch (error) {
        console.error('Registration error:', error);
        req.flash('error_msg', 'Registration failed. Please try again.');
        res.redirect('/auth/register');
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Store complete user object in session
        req.session.user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        };
        
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;
