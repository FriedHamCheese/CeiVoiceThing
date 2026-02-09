import { loginLocal, register } from '../utils/auth.js'
import express from 'express';
import passport from 'passport';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();


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


export default router;