// Polyfills for pdf-parse in serverless environments
if (typeof global.DOMMatrix === 'undefined') {
    global.DOMMatrix = class DOMMatrix {};
}
if (typeof global.Path2D === 'undefined') {
    global.Path2D = class Path2D {};
}

const serverless = require('serverless-http');
const app = require('../../server/index');

module.exports.handler = serverless(app);
