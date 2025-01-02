const mongoose = require('mongoose');
                                            
const attemptSchema = new mongoose.Schema({
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    quizTitle: {
        type: String,
        required: true
    },
    answers: [{
        questionIndex: Number,
        selectedAnswer: Number
    }],
    score: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Attempt', attemptSchema);
