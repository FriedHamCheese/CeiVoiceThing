import mysqlConnection from './mysqlConnection.js';
import axios from 'axios';
import passport from 'passport';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

async function verifyCaptcha(token) {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`;

    try {
        const response = await axios.post(verifyUrl);
        return response.data.success;
    } catch (error) {
        console.error('Captcha error:', error);
        return false;
    }
}


const googleCallback = async (accessToken, refreshToken, profile, done) => {
    const googleId = profile.id;
    const email = profile.emails[0].value;
    const name = profile.displayName;

    try {
        const [users] = await mysqlConnection.execute('SELECT * FROM Users WHERE google_id = ?', [googleId]);

        if (users.length > 0) {
            const user = users[0];
            return done(null, user);
        }

        const [emailUsers] = await mysqlConnection.execute('SELECT * FROM Users WHERE email = ?', [email]);

        if (emailUsers.length > 0) {
            const existingUser = emailUsers[0];
            await mysqlConnection.execute('UPDATE Users SET google_id = ?, name = ? WHERE email = ?',
                [googleId, name, existingUser.email]);
            return done(null, { ...existingUser, google_id: googleId, name: name });
        }
        const [result] = await mysqlConnection.execute(
            'INSERT INTO Users (google_id, email, name) VALUES (?, ?, ?)',
            [googleId, email, name]
        );
        const newUser = { google_id: googleId, email: email, name: name };
        return done(null, newUser);

    } catch (error) {
        return done(error, null);
    }
};

const loginLocal = async (req, res, next) => {
    const { email, password, captchaToken } = req.body;


    const isHuman = await verifyCaptcha(captchaToken);

    if (!isHuman) {
        return res.status(400).json({ message: 'Captcha verification failed' });
    }

    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.status(401).json({ message: info.message });

        req.logIn(user, (err) => {
            if (err) return next(err);
            // Remove sensitive data before sending to frontend
            const { password_hash, ...safeUser } = user;
            return res.json({ success: true, message: 'Login successful', user: safeUser });
        });
    })(req, res, next);
};

const register = async (req, res) => {
    const { email, password } = req.body;

    // 1. Basic Validation
    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password.' });
    }

    try {
        const [existing] = await mysqlConnection.query(
            'SELECT * FROM Users WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            return res.status(409).json({ message: 'Email already taken' });
        }

        // 2. Extract Name from Email
        // Splits "john.doe@example.com" into ["john.doe", "example.com"] and takes index 0
        const name = email.split('@')[0];

        // 3. Hash Password
        const saltRounds = parseInt(process.env.SALT_ROUNDS) || 10;
        const hash = await bcrypt.hash(password, saltRounds);

        // 4. Insert into Database with Name
        const [result] = await mysqlConnection.execute(
            'INSERT INTO Users (email, name, password_hash) VALUES (?, ?, ?)',
            [email, name, hash]
        );

        const newUser = { email: email, name: name };
        return res.status(201).json({
            success: true,
            message: "Registration successful",
            user: newUser,
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
        });
    }
};

export {
    googleCallback,
    loginLocal,
    register
};