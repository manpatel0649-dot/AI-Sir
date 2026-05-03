// Import the express library
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Initialize the express application
const app = express();

// Enable CORS
const allowedOrigins = [
    'http://localhost:3000',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// Enable JSON parsing for request bodies
app.use(express.json());


// Define the port number
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("Successfully connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));


// A simple test route to check if the server is working
app.get('/api/test', (req, res) => {
    res.json({ message: "Hello from the Study Assistant Backend!" });
});

// Use the Auth routes
app.use('/api/auth', require('./routes/auth'));

// Use the File routes
app.use('/api/files', require('./routes/files'));

// Use the AI routes
app.use('/api/ai', require('./routes/ai'));




// Start the server and listen for incoming requests
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

// Export the app for Vercel Serverless Functions
module.exports = app;
