const router = require('express').Router();
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/', (req, res) => {
    res.render('home', {
        title: 'Flash Quiz - Home',
        user: req.session.user || null
    });
});

router.get('/dashboard', ensureAuthenticated, (req, res) => {
    if (!req.session.user) {
        req.flash('error_msg', 'Session expired, please login again');
        return res.redirect('/users/login');
    }
    
    res.render('dashboard', {
        user: req.session.user,
        success_msg: req.flash('success_msg'),
        error_msg: req.flash('error_msg')
    });
});

module.exports = router;
