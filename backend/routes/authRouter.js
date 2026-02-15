import { loginLocal, register } from '../utils/auth.js'
import express from 'express';
import passport from 'passport';
import dotenv from 'dotenv';
import mysqlConnection from '../utils/mysqlConnection.js';
dotenv.config();

const router = express.Router();

router.get('/test', (req, res) => res.json({ message: 'Auth router is working' }));


router.post('/login', loginLocal);
router.post('/register', register);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect(`http://localhost:${process.env.FRONTEND_PORT}/`);
    }
);

router.get('/session', (req, res) => {
    if (req.isAuthenticated()) {
        // req.user is populated by passport.deserializeUser
        // Ensure sensitive data is not sent
        const { password_hash, ...safeUser } = req.user;
        res.json({ success: true, user: safeUser });
    } else {
        // Use 401 Unauthorized for no active session
        res.status(401).json({ success: false, user: null, message: 'No active session' });
    }
});


router.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect(`http://localhost:${process.env.FRONTEND_PORT}/`);
    });
});

// TEMPORARY: Role assignment for testing
router.post('/role', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: 'Not authenticated' });
    const { role } = req.body;
    const email = req.user.email;

    try {
        await mysqlConnection.execute('UPDATE Users SET perm = ? WHERE email = ?', [role, email]);

        // Update the session user object
        req.user.perm = role;

        res.json({ success: true, message: `Role updated to ${role}`, user: req.user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


export default router;