const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const auth = require('../middleware/auth');
const File = require('../models/File');
const router = express.Router();


// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// --- PROTECT ALL ROUTES BELOW ---
router.use(auth);

// --- AI TEST ROUTE ---
router.get('/test', async (req, res) => {

    try {
        const prompt = "Say a quick, motivating hello to a student who is using an AI Study Assistant.";
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ 
            message: "Gemini API is connected!",
            aiResponse: text 
        });
    } catch (err) {
        console.error("Gemini Error:", err);
        res.status(500).json({ message: "Failed to connect to Gemini API" });
    }
});

// --- SUMMARIZE DOCUMENT ---
router.post('/summarize', async (req, res) => {

    try {
        const { fileId } = req.body;

        // 1. Find the file
        const file = await File.findOne({ _id: fileId, user: req.user.userId });
        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }

        // 2. CHECK CACHE: If summary already exists, return it!
        if (file.summary) {
            return res.json({ summary: file.summary, cached: true });
        }

        // 3. Prepare the text (handle long docs)
        const textToProcess = file.extractedText.substring(0, 15000); // Take first ~15k chars
        
        if (!textToProcess || textToProcess.length < 50) {
            return res.status(400).json({ message: "Document text is too short to summarize." });
        }

        // 4. Build the prompt
        const prompt = `
            You are a professional study assistant. 
            Please provide a concise but comprehensive summary of the following text.
            Use bullet points for key takeaways and keep the tone academic but accessible.
            
            TEXT TO SUMMARIZE:
            ${textToProcess}
        `;

        // 5. Call Gemini
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const summary = response.text();

        // 6. SAVE TO CACHE
        file.summary = summary;
        await file.save();

        res.json({ summary, cached: false });

    } catch (err) {
        console.error("Summarization Error:", err);
        if (err.status === 429) {
            return res.status(429).json({ message: "AI is busy (Rate limit hit). Please try again in 1 minute." });
        }
        res.status(500).json({ message: "AI failed to generate summary" });
    }
});

// --- CHAT WITH DOCUMENT ---
router.post('/chat', async (req, res) => {

    try {
        const { fileId, message } = req.body;

        if (!message) {
            return res.status(400).json({ message: "Message is required" });
        }

        // 1. Find the file
        const file = await File.findOne({ _id: fileId, user: req.user.userId });
        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }

        // 2. Prepare the context (handle long docs)
        const context = file.extractedText.substring(0, 20000); // More context for chat

        // 3. Build the prompt
        const prompt = `
            You are a helpful study assistant. You have been provided with the following text from a document.
            Answer the user's question based ONLY on the provided text.
            If the answer is not in the text, politely say that you don't know based on the document.
            
            DOCUMENT TEXT:
            ${context}
            
            USER QUESTION:
            ${message}
        `;

        // 4. Call Gemini
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const reply = response.text();

        res.json({ reply });

    } catch (err) {
        console.error("Chat Error:", err);
        if (err.status === 429) {
            return res.status(429).json({ message: "AI is busy (Rate limit hit). Please try again in 1 minute." });
        }
        res.status(500).json({ message: "AI failed to respond" });
    }
});

// --- GENERATE QUIZ ---
router.post('/quiz', async (req, res) => {

    try {
        const { fileId } = req.body;

        // 1. Find the file
        const file = await File.findOne({ _id: fileId, user: req.user.userId });
        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }

        // 2. CHECK CACHE
        if (file.quiz && file.quiz.length > 0) {
            return res.json({ quiz: file.quiz, cached: true });
        }

        // 3. Prepare the context
        const context = file.extractedText.substring(0, 15000);

        // 4. Build the strict JSON prompt
        const prompt = `
            You are a professional examiner. Based on the document text provided below, generate 5 multiple-choice questions (MCQs).
            
            STRICT OUTPUT FORMAT:
            Return ONLY a valid JSON array of objects. Do not include any other text or markdown formatting like \`\`\`json.
            
            Each object must have:
            "question": string,
            "options": array of 4 strings,
            "correctAnswer": integer (index of the correct option, 0-3)

            DOCUMENT TEXT:
            ${context}
        `;

        // 5. Call Gemini
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Cleanup: AI sometimes adds markdown blocks even when told not to
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        // 6. Parse and Save
        try {
            const quiz = JSON.parse(text);
            file.quiz = quiz;
            await file.save();
            res.json({ quiz, cached: false });
        } catch (parseError) {
            console.error("JSON Parsing Error:", text);
            res.status(500).json({ message: "AI generated an invalid quiz format. Please try again." });
        }

    } catch (err) {
        console.error("Quiz Error:", err);
        res.status(500).json({ message: "AI failed to generate quiz" });
    }
});




module.exports = router;
