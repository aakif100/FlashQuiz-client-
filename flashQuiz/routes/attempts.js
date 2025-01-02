const router = require('express').Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Attempt = require('../models/Attempt');
const Quiz = require('../models/Quiz');
const User = require('../models/User');

// View results (for teachers) - MOVED UP
router.get('/results', ensureAuthenticated, async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'teacher') {
            req.flash('error_msg', 'Access denied. Teachers only.');
            return res.redirect('/dashboard');
        }

        const attempts = await Attempt.find()
            .populate('user', 'username')
            .populate('quiz', 'title')
            .sort('-createdAt');

        res.render('attempts/results', {
            attempts,
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        });
    } catch (err) {
        console.error('Error in results route:', err);
        req.flash('error_msg', 'Error fetching results');
        res.redirect('/dashboard');
    }
});

// Get Leaderboard
router.get('/leaderboard', ensureAuthenticated, async (req, res) => {
    try {
        const leaderboardData = await Attempt.aggregate([
            {
                $lookup: {
                    from: 'users',  // Your users collection name
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            {
                $group: {
                    _id: '$user',
                    username: { $first: '$username' },
                    totalScore: { 
                        $sum: '$score'  // This will add up all scores
                    },
                    quizzesCompleted: { $sum: 1 },
                    userInfo: { $first: '$userInfo' }
                }
            },
            {
                $project: {
                    _id: 1,
                    username: { 
                        $ifNull: [
                            { $arrayElemAt: ['$userInfo.username', 0] },
                            'Unknown User'
                        ]
                    },
                    totalScore: { 
                        $round: ['$totalScore', 0]  // Round to 0 decimal places
                    },
                    quizzesCompleted: 1
                }
            },
            {
                $sort: { 
                    totalScore: -1,
                    quizzesCompleted: -1
                }
            }
        ]);

        res.render('leaderboard', { 
            leaderboardData,
            user: req.user
        });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).send('Error fetching leaderboard data');
    }
});

// Get specific attempt - MOVED DOWN
router.get('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const attempt = await Attempt.findById(req.params.id);
        if (!attempt) {
            req.flash('error_msg', 'Attempt not found');
            return res.redirect('/dashboard');
        }

        const quiz = await Quiz.findById(attempt.quiz);
        if (!quiz) {
            req.flash('error_msg', 'Quiz not found');
            return res.redirect('/dashboard');
        }

        res.render('attempts/result', { 
            attempt,
            quiz,
            success_msg: req.flash('success_msg')
        });
    } catch (err) {
        console.error('Error fetching attempt:', err);
        req.flash('error_msg', 'Error loading results');
        res.redirect('/dashboard');
    }
});

// Submit quiz attempt (for students)
router.post('/submit/:quizId', ensureAuthenticated, async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.quizId);
        if (!quiz) {
            return res.json({ success: false, error: 'Quiz not found' });
        }

        // Ensure we have the user's information
        if (!req.session.user || !req.session.user.username) {
            return res.json({ success: false, error: 'User session not found' });
        }

        const answers = req.body.answers;
        let score = 0;
        
        answers.forEach(answer => {
            if (quiz.questions[answer.questionIndex].correctAnswer === parseInt(answer.selectedAnswer)) {
                score++;
            }
        });

        const percentageScore = (score / quiz.questions.length) * 100;

        // Create attempt with proper user information
        const attempt = new Attempt({
            quiz: quiz._id,
            user: req.session.user._id,
            username: req.session.user.username, // Make sure this is set
            quizTitle: quiz.title,
            score: percentageScore,
            answers: answers
        });

        const savedAttempt = await attempt.save();
        
        // Return JSON response with success and attemptId
        res.json({ 
            success: true, 
            attemptId: savedAttempt._id 
        });
    } catch (err) {
        console.error('Quiz submission error:', err);
        res.json({ 
            success: false, 
            error: err.message || 'Error submitting quiz' 
        });
    }
});

// Add a new route for viewing results
router.get('/:quizId/result', ensureAuthenticated, async (req, res) => {
    try {
        const [attempt, quiz] = await Promise.all([
            Attempt.findOne({
                quiz: req.params.quizId,
                user: req.session.user._id
            }).sort('-createdAt'),
            Quiz.findById(req.params.quizId)
        ]);

        if (!attempt || !quiz) {
            req.flash('error_msg', 'Result not found');
            return res.redirect('/quizzes');
        }

        res.render('attempts/result', { 
            attempt,
            quiz,
            success_msg: 'Quiz submitted successfully'
        });
    } catch (err) {
        console.error('Error loading results:', err);
        req.flash('error_msg', 'Error loading results');
        res.redirect('/quizzes');
    }
});

module.exports = router;
