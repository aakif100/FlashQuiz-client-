const router = require('express').Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Quiz = require('../models/Quiz');
const Attempt = require('../models/Attempt');

// Middleware to check if user is a teacher
const ensureTeacher = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'teacher') {
        return next();
    }
    req.flash('error_msg', 'Access denied. Teachers only.');
    res.redirect('/dashboard');
};

// Get all quizzes (accessible to all authenticated users)
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        // Fetch quizzes and populate creator information
        const quizzes = await Quiz.find()
            .populate({
                path: 'creator',
                select: 'username role'
            });

        // Debug log
        console.log('Fetched quizzes with creators:', quizzes.map(q => ({
            title: q.title,
            creatorName: q.creator?.username,
            creatorRole: q.creatorRole
        })));

        return res.render('quizzes/index', {
            quizzes,
            userRole: req.session.user.role,
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        });
    } catch (err) {
        console.error('Error fetching quizzes:', err);
        req.flash('error_msg', 'Error fetching quizzes');
        return res.redirect('/dashboard');
    }
});

// Update the new quiz route to allow both teachers and students
router.get('/new', ensureAuthenticated, (req, res) => {
    res.render('quizzes/new');
});

// Update post route for quiz creation
router.post('/', ensureAuthenticated, async (req, res) => {
    try {
        const { title, description, questions } = req.body;
        
        // Transform questions to match schema
        const formattedQuestions = questions.map(q => ({
            questionText: q.text, // Map text to questionText
            options: q.options,
            correctAnswer: parseInt(q.correctAnswer)
        }));

        const newQuiz = new Quiz({
            title,
            description,
            questions: formattedQuestions,
            creator: req.session.user._id,
            creatorRole: req.session.user.role
        });

        const savedQuiz = await newQuiz.save();
        
        // Redirect to take the quiz instead of quizzes list
        res.redirect(`/quizzes/${savedQuiz._id}`);
    } catch (err) {
        console.error('Quiz creation error:', err);
        req.flash('error_msg', 'Error creating quiz');
        res.redirect('/quizzes/new');
    }
});

// Remove or comment out the '/my-quizzes' routes since we don't need them anymore
// router.get('/my-quizzes', ensureAuthenticated, ensureTeacher, async (req, res) => {
//     try {
//         const quizzes = await Quiz.find({ creator: req.session.user._id });
//         res.render('quizzes/my-quizzes', { quizzes });
//     } catch (err) {
//         console.error(err);
//         req.flash('error_msg', 'Error fetching your quizzes');
//         res.redirect('/dashboard');
//     }
// });

// Get teacher's quizzes (remove duplicate route)
// router.get('/my-quizzes', ensureAuthenticated, async (req, res) => {
//     try {
//         const quizzes = await Quiz.find({ creator: req.session.user._id });
//         res.render('quizzes/my-quizzes', { quizzes });
//     } catch (err) {
//         console.error(err);
//         req.flash('error_msg', 'Error fetching quizzes');
//         res.redirect('/dashboard');
//     }
// });

// Get specific quiz
router.get('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        
        if (!quiz) {
            req.flash('error_msg', 'Quiz not found');
            return res.redirect('/quizzes');
        }

        // If user is teacher, check if they own the quiz
        if (req.session.user.role === 'teacher' && 
            quiz.creator.toString() !== req.session.user._id.toString()) {
            req.flash('error_msg', 'Not authorized to view this quiz');
            return res.redirect('/quizzes');
        }

        res.render('quizzes/take', { 
            quiz,
            userRole: req.session.user.role
        });
    } catch (err) {
        console.error('Error loading quiz:', err);
        req.flash('error_msg', 'Error loading quiz');
        res.redirect('/quizzes');
    }
});

// View quiz with answers (teachers only)
router.get('/:id/view', ensureAuthenticated, async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'teacher') {
            req.flash('error_msg', 'Access denied. Teachers only.');
            return res.redirect('/dashboard');
        }

        const quiz = await Quiz.findById(req.params.id).populate('creator', 'username');
        if (!quiz) {
            req.flash('error_msg', 'Quiz not found');
            return res.redirect('/quizzes');
        }

        res.render('quizzes/view', { quiz });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error fetching quiz details');
        res.redirect('/quizzes');
    }
});

// Delete quiz
router.delete('/:id', ensureAuthenticated, ensureTeacher, async (req, res) => {
    try {
        console.log('Delete route hit for quiz:', req.params.id); // Add this for debugging
        const quiz = await Quiz.findById(req.params.id);
        
        if (!quiz) {
            req.flash('error_msg', 'Quiz not found');
            return res.redirect('/quizzes');
        }

        await Quiz.findByIdAndDelete(req.params.id);
        await Attempt.deleteMany({ quiz: req.params.id });
        
        req.flash('success_msg', 'Quiz deleted successfully');
        res.redirect('/quizzes');
    } catch (err) {
        console.error('Delete error:', err);
        req.flash('error_msg', 'Error deleting quiz');
        res.redirect('/quizzes');
    }
});

router.post('/create', ensureAuthenticated, async (req, res) => {
    try {
        const { title, questions } = req.body;
        
        // Adjust the correctAnswer values to match the actual option numbers
        const adjustedQuestions = questions.map(question => ({
            ...question,
            correctAnswer: parseInt(question.correctAnswer) - 1 // Subtract 1 to convert from 1-based to 0-based indexing
        }));

        const quiz = new Quiz({
            title,
            questions: adjustedQuestions,
            creator: req.session.user._id
        });

        await quiz.save();
        req.flash('success_msg', 'Quiz created successfully');
        res.redirect('/quizzes');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error creating quiz');
        res.redirect('/quizzes');
    }
});

module.exports = router;
