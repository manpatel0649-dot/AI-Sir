const mongoose = require('mongoose');

// Define the shape of a user in our database
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "Username is required"],
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: 6
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create the model based on the schema
const User = mongoose.model('User', userSchema);

module.exports = User;
