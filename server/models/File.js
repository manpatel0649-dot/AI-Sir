const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    originalname: {
        type: String,
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    extractedText: {
        type: String,
        default: ""
    },
    summary: {
        type: String,
        default: ""
    },
    quiz: {
        type: Array,
        default: []
    },
    createdAt: {


        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('File', fileSchema);
