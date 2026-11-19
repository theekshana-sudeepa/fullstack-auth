// backend/routes/auth.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = (pool) => {
    const router = express.Router();

    // --- Utility function to generate JWT ---
    const generateToken = (id) => {
        return jwt.sign({ id }, process.env.JWT_SECRET, {
            expiresIn: '1h', 
        });
    };

    // --- 1. SIGNUP Route ---
    router.post('/signup', async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Please enter all fields' });
        }

        try {
            // Check if user already exists
            const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            if (existingUser.rows.length > 0) {
                return res.status(400).json({ message: 'User already exists' });
            }

            // Hash the password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Insert new user; relies on is_admin DEFAULT FALSE constraint
            const newUser = await pool.query(
                // CRITICAL: Ensure RETURNING includes is_admin
                'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, is_admin',
                [email, hashedPassword]
            );

            const user = newUser.rows[0];
            const token = generateToken(user.id);

            res.status(201).json({
                message: 'User registered successfully',
                token,
                // Send is_admin flag to frontend
                user: { id: user.id, email: user.email, is_admin: user.is_admin }
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error during signup' });
        }
    });

    // --- 2. LOGIN Route ---
    router.post('/login', async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Please enter all fields' });
        }

        try {
            // CRITICAL: Ensure SELECT includes id, email, password, and is_admin
            const userResult = await pool.query('SELECT id, email, password, is_admin FROM users WHERE email = $1', [email]);
            if (userResult.rows.length === 0) {
                return res.status(400).json({ message: 'Invalid Credentials' });
            }

            const user = userResult.rows[0];

            // Compare passwords
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid Credentials' });
            }

            // Generate and return token
            const token = generateToken(user.id);

            res.status(200).json({
                message: 'Logged in successfully',
                token,
                // Send is_admin flag to frontend
                user: { id: user.id, email: user.email, is_admin: user.is_admin }
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error during login' });
        }
    });
    
    // Logout is handled client-side (token deletion)
    router.post('/logout', (req, res) => {
        res.status(200).json({ message: 'Logged out successfully' });
    });

    return router;
};
