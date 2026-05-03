const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

// Just a dummy check if we can initialize it
try {
    const parser = new PDFParse({ data: Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Test) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF') });
    console.log('PDFParse initialized successfully');
} catch (err) {
    console.error('Failed to initialize PDFParse:', err);
}
