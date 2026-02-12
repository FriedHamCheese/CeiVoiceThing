import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import mysqlConnection from './mysqlConnection.js';
import { googleCallback } from './auth.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

export default function (passport) {

    // Serialize User
    passport.serializeUser((user, done) => {
        // Store primary key (email) in session
        done(null, user.email);
    });

    // Deserialize User
    passport.deserializeUser(async (email, done) => {
        try {
            const [rows] = await mysqlConnection.query(
                'SELECT * FROM Users WHERE email = ?',
                [email]
            );

            if (rows.length === 0) {
                return done(null, false);
            }

            return done(null, rows[0]);

        } catch (error) {
            return done(error, null);
        }
    });

    // Local Strategy
    passport.use(new LocalStrategy(
        {
            usernameField: 'email',
            passwordField: 'password'
        },
        async (email, password, done) => {
            try {
                const [rows] = await mysqlConnection.query(
                    'SELECT * FROM Users WHERE email = ?',
                    [email]
                );

                if (rows.length === 0) {
                    return done(null, false, { message: 'Incorrect email.' });
                }

                const user = rows[0];

                // If user registered with Google only
                if (!user.password_hash) {
                    return done(null, false, {
                        message: 'Please log in with Google.'
                    });
                }

                const match = await bcrypt.compare(password, user.password_hash);

                if (!match) {
                    return done(null, false, { message: 'Incorrect password.' });
                }

                return done(null, user);

            } catch (error) {
                return done(error);
            }
        }
    ));

    // Google Strategy
    passport.use(new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/auth/google/callback"
        },
        googleCallback
    ));
}