import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import expressMysqlSession from 'express-mysql-session';
import session from 'express-session';
import passport from 'passport';
import pool from './utils/mysqlConnection.js'; // Import the pool
import ticketRouter from './routes/ticketRouter.js';
import ticketRouterAdmin from './routes/ticketRouterAdmin.js';
import ticketRouterSpecialist from './routes/ticketRouterSpecialist.js';

import ticketRouterPublic from './routes/ticketRouterPublic.js';
import authRouter from './routes/authRouter.js';
import reportRouter from './routes/reportRouterSpecialist.js';
import reportRouterAdmin from './routes/reportRouterAdmin.js';

// Note: Ensure backend/utils/passport.js is converted to ESM or imported correctly
import configurePassport from './utils/passport.js';
import { isAuthenticated, isSpecialist, isAdmin } from './middleware/authMiddleware.js';

const app = express();
const PORT = process.env.SERVER_PORT;

app.use(cors({
    origin: `http://localhost:${process.env.FRONTEND_PORT}`,
    credentials: true
}));

app.use(express.json());

// Session configuration (required for Passport)
// Session configuration (required for Passport)
const MySQLStore = expressMysqlSession(session);
const sessionStore = new MySQLStore({}, pool); // Reuse existing pool

app.use(session({
    key: 'session_cookie_name',
    secret: process.env.SESSION_SECRET || 'secret_placeholder',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Initialize passport strategies
configurePassport(passport);

app.use('/auth', authRouter);
app.use('/tickets', ticketRouter);
app.use('/public/tickets', ticketRouterPublic);

//Specialist
app.use('/specialist/reports', isSpecialist, reportRouter);
app.use('/specialist/tickets', isSpecialist, ticketRouterSpecialist);

//Admin
app.use('/admin/tickets', isAdmin, ticketRouterAdmin);
app.use('/admin/reports', isAdmin, reportRouterAdmin);


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});