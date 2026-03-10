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
    const { email, password, captchaToken } = req.body;

    // 2. Captcha Verification
    const isHuman = await verifyCaptcha(captchaToken);
    if (!isHuman) {
        return res.status(400).json({ message: 'Captcha verification failed' });
    }

    try {
        const [existing] = await mysqlConnection.query(
            'SELECT * FROM Users WHERE email = ?',
            [email]
        );

        if (existing.length > 0 && existing[0].password_hash != null) {
            return res.status(409).json({ message: 'Email already taken' });
        }

        let newUser;
        if (existing.length > 0 && existing[0].password_hash == null) {
            // 3. Extract Name from Email
            const name = email.split('@')[0];

            // 4. Hash Password
            const saltRounds = parseInt(process.env.SALT_ROUNDS) || 10;
            const hash = await bcrypt.hash(password, saltRounds);

            // 5. Insert into Database
            const [result] = await mysqlConnection.execute(
                `INSERT INTO Users (email, name, password_hash, perm) 
                VALUES (?, ?, ?, 1)
                ON DUPLICATE KEY UPDATE 
                    name = VALUES(name), 
                    password_hash = VALUES(password_hash),
                    perm = VALUES(perm)`,
                [email, name, hash]
            );

            newUser = { email: email, name: name, perm: 1 };
        }


        // 6. Log in the user after successful registration
        req.logIn(newUser, (err) => {
            if (err) {
                return res.status(500).json({
                    message: "Login failed after registration",
                    error: err.message
                });
            }
            return res.status(201).json({
                success: true,
                message: "Registration and login successful",
                user: newUser,
            });
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