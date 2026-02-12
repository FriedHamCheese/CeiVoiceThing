import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import ticketRouter from './routes/ticket_router.js';
import ticketRouterAdmin from './routes/ticket_router_admin.js';
import authRouter from './routes/auth_router.js';
import reportRouter from './routes/report_router.js';
import initializeDatabase from './utils/dbInitialize.js';

// Note: Ensure backend/utils/passport.js is converted to ESM or imported correctly
import configurePassport from './utils/passport.js'; 

const app = express();
const PORT = process.env.SERVER_PORT;

app.use(cors({
    origin: `http://localhost:${process.env.FRONTEND_PORT}`,
    credentials: true
}));

app.use(express.json());

// Session configuration (required for Passport)
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret_placeholder',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());

// Initialize passport strategies
configurePassport(passport);

app.use('/auth', authRouter);
app.use('/tickets', ticketRouter);
app.use('/admin/tickets', ticketRouterAdmin);
app.use('/reports', reportRouter);

// Initialize database schema on startup
await initializeDatabase();

app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
});