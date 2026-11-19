// backend/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');

// Export a factory function that takes the pool object
module.exports = (pool) => {

    // Middleware to check if the user is authenticated (runs first)
    const protect = async (req, res, next) => {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            try {
                // 1. Get token from header (Bearer <token>)
                token = req.headers.authorization.split(' ')[1];

                // 2. Verify token and extract user ID
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userId = decoded.id;

                // 3. CRITICAL: Fetch the user's current role from the DB
                const userResult = await pool.query(
                    'SELECT id, is_admin FROM users WHERE id = $1', 
                    [userId]
                );

                if (userResult.rows.length === 0) {
                    return res.status(401).json({ message: 'User not found' });
                }

                // 4. Attach the full, up-to-date user object to the request
                req.user = userResult.rows[0]; // Attaches { id: ..., is_admin: ... }
                next();

            } catch (error) {
                console.error('Not authorized, token failed:', error.message);
                res.status(401).json({ message: 'Not authorized, token failed' });
            }
        } else {
            res.status(401).json({ message: 'Not authorized, no token' });
        }
    };

    // Middleware to check if the authenticated user is an Admin (runs second)
    const admin = (req, res, next) => {
        // Relies on req.user being populated by the 'protect' middleware
        // This check is the final gate for all admin routes.
        if (req.user && req.user.is_admin === true) {
            next();
        } else {
            // User is authenticated but is not an admin (403 Forbidden)
            res.status(403).json({ message: 'Not authorized as an admin' });
        }
    };

    return { protect, admin };
};
