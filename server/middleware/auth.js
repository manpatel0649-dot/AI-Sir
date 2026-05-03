const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // 1. Get the token from the header
    const authHeader = req.header('Authorization');
    
    // Check if no header or not starting with Bearer
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "No token, authorization denied" });
    }

    const token = authHeader.split(' ')[1];

    try {
        // 2. Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Add the user from the payload to the request object
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: "Token is not valid" });
    }
};
