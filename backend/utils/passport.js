import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { googleCallback } from './auth.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();


export default function(passport) {
    passport.serializeUser((user, done) => {
        done(null, user.email);
    });

    // Retrieve user details from email in session
    passport.deserializeUser(async (email, done) => {
        try {
            // Using 'db' consistently as imported above
            const [rows] = await import('./mysqlConnection.js').then(module => module.default).then(db => db.query('SELECT * FROM Users WHERE email = ?', [email]));
            if (rows.length > 0) {
                done(null, rows[0]);
            } else {
                done(new Error('User not found'), null);
            }
        } catch (err) {
            done(err, null);
        }
    });

    passport.use(new LocalStrategy({ usernameField: 'email', passwordField: 'password' }, async (email, password, done) => {
        try {
            // Find user (Dynamically import db to avoid circular dependency if passport.js is imported before mysqlConnection is fully initialized)
            const [rows] = await import('./mysqlConnection.js').then(module => module.default).then(db => db.query('SELECT * FROM Users WHERE email = ?', [email]));
            
            if (rows.length === 0) {
                return done(null, false, { message: 'Incorrect email.' });
            }

            const user = rows[0];

            // If user exists but only has Google auth (no password set)
            if (!user.password_hash) {
                return done(null, false, { message: 'Please log in with Google.' });
            }

            // Compare password
            const match = await bcrypt.compare(password, user.password_hash);
            
            if (!match) {
                return done(null, false, { message: 'Incorrect password.' });
            }

            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }));

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback"
      },
      googleCallback
    ));
};