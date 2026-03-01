import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import expressMysqlSession from 'express-mysql-session';
import helmet from 'helmet';
import passport from 'passport';
import session from 'express-session';

import https from 'https';
import nodefilesystem from 'node:fs';

import { ROLES } from './constants/roles.js';
import { isAuthenticated, restrictTo } from './middleware/authMiddleware.js';

import adminRoutes from './routes/adminRouter.admin.js';
import assigneeRoutes from './routes/assigneeRouter.assignee.js';
import authRoutes from './routes/authRouter.js';
import reportAdminRoutes from './routes/reportRouter.admin.js';
import reportAssigneeRoutes from './routes/reportRouter.assignee.js';
import ticketAdminRoutes from './routes/ticketRouter.admin.js';
import ticketAssigneeRoutes from './routes/ticketRouter.assignee.js';
import ticketInternalRoutes from './routes/ticketRouter.internal.js';
import ticketPublicRoutes from './routes/ticketRouter.public.js';
import ticketRoutes from './routes/ticketRouter.js';
import userAdminRoutes from './routes/userRouter.admin.js';

import pool from './utils/mysqlConnection.js';
import configurePassport from './utils/passport.js';

dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT;
const FRONTEND_URL = `https://localhost:${process.env.FRONTEND_PORT}`;

app.use(helmet());
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
}));

app.use(express.json());

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

app.use('/auth', authRoutes);
app.use('/tickets', isAuthenticated, ticketRoutes);
app.use('/public/tickets', ticketPublicRoutes);

//Assignee
app.use('/assignee/reports', [isAuthenticated, restrictTo(ROLES.ASSIGNEE)], reportAssigneeRoutes);
app.use('/assignee/tickets', [isAuthenticated, restrictTo(ROLES.ASSIGNEE)], ticketAssigneeRoutes);
app.use('/assignee/tickets', [isAuthenticated, restrictTo(ROLES.ASSIGNEE)], ticketInternalRoutes);
app.use('/assignee', [isAuthenticated, restrictTo(ROLES.ASSIGNEE)], assigneeRoutes);

//Admin
app.use('/admin/tickets', [isAuthenticated, restrictTo(ROLES.ADMIN)], ticketAdminRoutes);
app.use('/admin/tickets', [isAuthenticated, restrictTo(ROLES.ADMIN)], ticketInternalRoutes);
app.use('/admin/reports', [isAuthenticated, restrictTo(ROLES.ADMIN)], reportAdminRoutes);
app.use('/admin/users', [isAuthenticated, restrictTo(ROLES.ADMIN)], userAdminRoutes);
app.use('/admin', [isAuthenticated, restrictTo(ROLES.ADMIN)], adminRoutes);

if (process.env.USE_HTTPS){
  const httpsServer = https.createServer({
    cert: nodefilesystem.readFileSync('./localhost.crt'),
    key: nodefilesystem.readFileSync('./localhost.key'),
  }, app);
  
  httpsServer.listen(PORT, () => {
      console.log(`Server is running on https://localhost:${PORT}`);
  });
}else{
  app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
  });
}