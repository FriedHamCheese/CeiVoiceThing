import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import expressMysqlSession from 'express-mysql-session';
import session from 'express-session';
import passport from 'passport';
import pool from './utils/mysqlConnection.js'; // Import the pool
import ticketRouter from './routes/ticketRouter.js';
import ticketRouterAdmin from './routes/ticketRouterAdmin.js';
import ticketRouterAssignee from './routes/ticketRouterAssignee.js';
import ticketRouterPublic from './routes/ticketRouterPublic.js';
import ticketRouterAdminAssignee from './routes/ticketRouterAdminAssignee.js';
import authRouter from './routes/authRouter.js';
import reportRouter from './routes/reportRouterSpecialist.js';
import reportRouterAdmin from './routes/reportRouterAdmin.js';
import assigneeRouter from './routes/assigneeRouter.js';
import adminRouter from './routes/adminRouter.js';
import configurePassport from './utils/passport.js';
import userRouterAdmin from './routes/userRouterAdmin.js'

//Add isAssignee to prepare for renaming.
import { isAuthenticated, isAssignee, isSpecialist, isAdmin } from './middleware/authMiddleware.js';

const app = express();
const PORT = process.env.SERVER_PORT;
const FRONTEND_URL = process.env.FRONTEND_URL || `http://localhost:${process.env.FRONTEND_PORT}`;

app.use(helmet());
app.use(cors({
    origin: FRONTEND_URL,
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
        secure: process.env.NODE_ENV === 'production', // true for HTTPS in production
        httpOnly: true, // Prevents JS access to cookie
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        sameSite: 'lax' // CSRF protection
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Initialize passport strategies
configurePassport(passport);

app.use('/auth', authRouter);
app.use('/tickets', isAuthenticated, ticketRouter);
app.use('/public/tickets', ticketRouterPublic);

//Assignee
app.use('/assignee/reports', isAssignee, reportRouter);
app.use('/assignee/tickets', isAssignee, ticketRouterAssignee);
app.use('/assignee/tickets', isAssignee, ticketRouterAdminAssignee);
app.use('/assignee', isAssignee, assigneeRouter);

//Admin
app.use('/admin/tickets', isAdmin, ticketRouterAdmin);
app.use('/admin/tickets', isAdmin, ticketRouterAdminAssignee);
app.use('/admin/reports', isAdmin, reportRouterAdmin);
app.use('/admin/users', isAdmin, userRouterAdmin);
app.use('/admin', isAdmin, adminRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});