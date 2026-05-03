const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PDFParse } = require('pdf-parse');
const auth = require('../middleware/auth');
const File = require('../models/File');
const router = express.Router();



// 1. Configure how files are stored
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Create a unique filename: timestamp-originalName
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// 2. Filter for PDF files only
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed!'), false);
    }
};

// 3. Initialize Multer
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: fileFilter
});

// --- PROTECT ALL ROUTES BELOW ---
router.use(auth);

// 4. THE UPLOAD ROUTE
// 'file' is the name of the field in our form data
router.post('/upload', upload.single('file'), async (req, res) => {

    try {
        if (!req.file) {
            return res.status(400).json({ message: "Please upload a file" });
        }

        // 1. Read the file into a buffer
        const dataBuffer = fs.readFileSync(req.file.path);

        // 2. Parse the PDF
        const parser = new PDFParse({ data: dataBuffer });
        const pdfData = await parser.getText();
        const extractedText = pdfData.text;
        
        // Always destroy the parser to free resources
        await parser.destroy();

        // 3. Create a new file record in the database
        const newFile = new File({
            user: req.user.userId,
            originalname: req.file.originalname,
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size,
            extractedText: extractedText // Store the magic!
        });

        await newFile.save();

        res.status(200).json({
            message: "File uploaded and parsed successfully",
            file: {
                id: newFile._id,
                originalname: newFile.originalname,
                textPreview: extractedText.substring(0, 100) + "..." // Just a preview
            }
        });

    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ message: "Server error during upload" });
    }
});

// --- GET ALL FILES ---
router.get('/', async (req, res) => {

    try {
        // Find files belonging to the logged-in user
        const files = await File.find({ user: req.user.userId }).sort({ createdAt: -1 });
        res.json(files);
    } catch (err) {
        res.status(500).json({ message: "Error fetching files" });
    }
});

// --- GET EXTRACTED TEXT ---
router.get('/:id/text', async (req, res) => {

    try {
        const file = await File.findOne({ _id: req.params.id, user: req.user.userId });
        
        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }

        res.json({ text: file.extractedText });
    } catch (err) {
        res.status(500).json({ message: "Error fetching text" });
    }
});

// --- DELETE A FILE ---
router.delete('/:id', async (req, res) => {

    try {
        const file = await File.findOne({ _id: req.params.id, user: req.user.userId });

        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }

        // 1. Delete physical file from disk
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        // 2. Delete record from database
        await File.deleteOne({ _id: req.params.id });

        res.json({ message: "File deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting file" });
    }
});



module.exports = router;
