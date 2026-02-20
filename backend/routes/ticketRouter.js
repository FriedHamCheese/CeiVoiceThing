// backend/routes/ticketRouter.js
import mysqlConnection from '../utils/mysqlConnection.js';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { draftTicketFromUserRequest as ollama } from '../utils/ticketOllama.js';
import { draftTicketFromUserRequest as openai } from '../utils/ticketOpenAI.js';
import { draftTicketFromUserRequest as oracle } from '../utils/ticketOracle.js';
import { sendConfirmationEmail, sendCommentNotificationEmail } from '../utils/email.js';

const router = express.Router();


// Create User Request
// for all authenticated user.
router.post('/request', isAuthenticated, async (request, response) => {
    const FIRST_CHARACTER = 0;
    const HTTP_STATUS_OK = 200;
    const HTTP_STATUS_BAD_REQUEST = 400;
    const HTTP_STATUS_SERVER_ERROR = 500;

    const MAX_USER_EMAIL_CHARACTERS = 64;
    const MAX_REQUEST_TEXT_CHARACTERS = 2048;

    const { requestText, fromEmail } = request.body;

    // Validation
    if (typeof requestText !== 'string') {
        return response.status(HTTP_STATUS_BAD_REQUEST).json({ message: "Incorrect type for .requestText" });
    }
    if (typeof fromEmail !== 'string') {
        return response.status(HTTP_STATUS_BAD_REQUEST).json({ message: "Incorrect type for .fromEmail" });
    }

    const emailForInsertion = fromEmail.trim().substring(FIRST_CHARACTER, MAX_USER_EMAIL_CHARACTERS);
    const requestTextForInsertion = requestText.trim().substring(FIRST_CHARACTER, MAX_REQUEST_TEXT_CHARACTERS);

    let connection;
    try {
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();

        // 0. Ensure user exists (UserRequest has FK to Users)
        const [userCheck] = await connection.execute('SELECT email FROM Users WHERE email = ?', [emailForInsertion]);
        if (userCheck.length === 0) {
            await connection.execute(
                'INSERT INTO Users (email, name, perm) VALUES (?, ?, ?)',
                [emailForInsertion, emailForInsertion.split('@')[0], 1]
            );
        }

        // 1. Insert User Request
        const trackingToken = uuidv4();
        const [userRequestRes] = await connection.execute(
            'INSERT INTO UserRequest (userEmail, requestContents, tracking_token) VALUES (?, ?, ?)',
            [emailForInsertion, requestTextForInsertion, trackingToken]
        );
        const insertedUserRequestID = userRequestRes.insertId;

        // 2. Get AI Suggestions
        const [assigneeRows] = await connection.execute(`
            SELECT u.email, GROUP_CONCAT(ss.scopeTag) as scopes
            FROM Users u
            LEFT JOIN AssigneeScope ss ON u.email = ss.userEmail
            WHERE u.perm = 2
            GROUP BY u.email
        `);
        // Format as list of strings "email: [tag1, tag2]"
        const assigneeList = assigneeRows.map(row => `${row.email}: [${row.scopes || ''}]`).join('\n');

        let draftTicketSuggestions;

        switch (process.env.LLM_PROVIDER) {
            case 'OPENAI':
                draftTicketSuggestions = await openai(requestTextForInsertion, assigneeList);
                break;
            case 'ORACLE':
                draftTicketSuggestions = await oracle(requestTextForInsertion, assigneeList);
                break;
            case 'OLLAMA':
            default:
                draftTicketSuggestions = await ollama(requestTextForInsertion, assigneeList);
                break;
        }

        if (typeof draftTicketSuggestions === "string") {
            console.error("AI Summary Error Body:", draftTicketSuggestions);
            throw new Error(`AI Summary failed: ${draftTicketSuggestions}`);
        }

        // 3. Insert Draft Ticket
        const [draftRes] = await connection.execute(
            'INSERT INTO Ticket (title, summary, solution, status) VALUES (?, ?, ?, ?)',
            [draftTicketSuggestions.title, draftTicketSuggestions.summary, draftTicketSuggestions.suggestedSolutions, 'draft']
        );
        const insertedTicketID = draftRes.insertId;

        // 4. Link Request and Categories
        await connection.execute(
            'INSERT INTO TicketUserRequest (userRequestID, ticketID) VALUES (?, ?)',
            [insertedUserRequestID, insertedTicketID]
        );

        for (const category of draftTicketSuggestions.categories) {
            await connection.execute(
                "INSERT INTO TicketCategory (ticketID, category) VALUES (?, ?)",
                [insertedTicketID, category]
            );
        }
        // 5. Create Follower link
        await connection.execute(
            "INSERT INTO TicketFollower (ticketID, userEmail) VALUES (?, ?)",
            [insertedTicketID, emailForInsertion]
        );

        // 6. Create Assignee link
        // Add this right before your connection.execute(...) call
        await connection.execute(
            "INSERT INTO TicketAssignee (ticketID, assigneeEmail) VALUES (?, ?)",
            [insertedTicketID, draftTicketSuggestions.suggestedAssignee]
        );

        await connection.commit();

        // Trigger email asynchronously (don't block response)
        sendConfirmationEmail(emailForInsertion, trackingToken).catch(err => console.error("Email send failed:", err));

        response.status(HTTP_STATUS_OK).json({
            message: 'Draft ticket created successfully.',
            trackingToken: trackingToken
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        response.status(HTTP_STATUS_SERVER_ERROR).json({ message: "Internal server error." });
    } finally {
        if (connection) connection.release();
    }
});

// GET Assignees (Generic - all authenticated active users/staff)
// Mounted at /tickets/assignees
router.get('/assignees', isAuthenticated, async (request, response) => {
    try {
        const [rows] = await mysqlConnection.execute(`
            SELECT u.email, u.name, sp.contact, GROUP_CONCAT(ss.scopeTag) as scope
            FROM Users u
            LEFT JOIN AssigneeProfile sp ON u.email = sp.userEmail
            LEFT JOIN AssigneeScope ss ON u.email = ss.userEmail
            WHERE u.perm >= 2
            GROUP BY u.email
            ORDER BY u.name ASC
        `);
        response.json(rows);
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "Failed to fetch assignees." });
    }
});
// GET Categories (Generic - all authenticated users)
// Mounted at /tickets/scope
router.get('/scope', isAuthenticated, async (request, response) => {
    try {
        const [rows] = await mysqlConnection.execute(`
            SELECT name FROM Category ORDER BY name ASC
        `);
        response.json(rows.map(row => row.name));
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "Failed to fetch categories." });
    }
});

// GET Comments (Generic - all authenticated users)
// Mounted at /tickets/:id/comments
router.get('/:id/comments', isAuthenticated, async (request, response) => {
    try {
        const ticketID = request.params.id;
        const userPerm = request.user.perm || 1;

        let query = "SELECT * FROM TicketComments WHERE ticketID = ? ";
        const params = [ticketID];

        // If user is basic (perm 1), do NOT show internal comments
        if (userPerm == 1) {
            query += "AND isInternal = FALSE ";
        }

        query += "ORDER BY createdAt DESC";

        const [rows] = await mysqlConnection.execute(query, params);
        response.json(rows);
    } catch (error) {
        response.status(500).json({ error: "Failed to fetch comments" });
    }
});

// ADD Comment (Generic - all authenticated users)
// Mounted at /tickets/:id/comment
// CHECK Follow Status
router.get('/:id/is_following', isAuthenticated, async (request, response) => {
    const ticketID = request.params.id;
    const userEmail = request.user.email;

    try {
        const [rows] = await mysqlConnection.execute(
            "SELECT 1 FROM TicketFollower WHERE ticketID = ? AND userEmail = ?",
            [ticketID, userEmail]
        );
        response.json({ isFollowing: rows.length > 0 });
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "Failed to check follower status" });
    }
});

// TOGGLE Follow Status
router.post('/:id/follow', isAuthenticated, async (request, response) => {
    const ticketID = request.params.id;
    const userEmail = request.user.email;

    try {
        const [rows] = await mysqlConnection.execute(
            "SELECT 1 FROM TicketFollower WHERE ticketID = ? AND userEmail = ?",
            [ticketID, userEmail]
        );

        const isFollowing = rows.length > 0;
        if (isFollowing) {
            await mysqlConnection.execute(
                "DELETE FROM TicketFollower WHERE ticketID = ? AND userEmail = ?",
                [ticketID, userEmail]
            );
        } else {
            await mysqlConnection.execute(
                "INSERT INTO TicketFollower (ticketID, userEmail) VALUES (?, ?)",
                [ticketID, userEmail]
            );
        }

        response.json({ isFollowing: !isFollowing });
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "Failed to toggle follower status" });
    }
});

// ADD Comment (Generic - all authenticated users)
// Mounted at /tickets/:id/comment
router.post('/:id/comment', isAuthenticated, async (request, response) => {
    const { text, isInternal } = request.body;
    const ticketID = request.params.id;
    const userEmail = request.user.email;
    const userPerm = request.user.perm || 1;

    if (!text) return response.status(400).json({ error: "Comment text required" });

    // Force internal to false if user is not specialist/admin
    const finalIsInternal = (userPerm >= 2) ? (isInternal || false) : false;

    try {
        await mysqlConnection.execute(
            "INSERT INTO TicketComments (ticketID, authorEmail, text, isInternal) VALUES (?, ?, ?, ?)",
            [ticketID, userEmail, text, finalIsInternal]
        );

        // --- Notification Logic ---
        if (userPerm === 2) {
            // 1. Fetch Ticket Info (Title)
            const [ticketRows] = await mysqlConnection.execute("SELECT title FROM Ticket WHERE id = ?", [ticketID]);
            const ticketTitle = ticketRows[0]?.title || "Support Ticket";

            // Set to track who has been emailed to prevent duplicates
            const processedEmails = new Set();
            // Don't notify the author
            processedEmails.add(userEmail);

            // 2. Notify Assignees
            const [assignees] = await mysqlConnection.execute(
                "SELECT assigneeEmail FROM TicketAssignee WHERE ticketID = ?",
                [ticketID]
            );

            // Link for assignees (Admin/Specialist Dashboard)
            const dashboardLink = `http://localhost:${process.env.FRONTEND_PORT}/admin/tickets/${ticketID}`;

            for (const assignee of assignees) {
                if (!processedEmails.has(assignee.assigneeEmail)) {
                    processedEmails.add(assignee.assigneeEmail);
                    sendCommentNotificationEmail(
                        assignee.assigneeEmail,
                        ticketTitle,
                        userEmail,
                        text,
                        dashboardLink,
                        finalIsInternal
                    ).catch(console.error);
                }
            }

            // 3. Notify Followers
            // Fetch ALL followers
            const [followers] = await mysqlConnection.execute(
                "SELECT userEmail FROM TicketFollower WHERE ticketID = ?",
                [ticketID]
            );

            // Fetch Tokens for Creators (to distinguish staff vs creators)
            const [creatorTokens] = await mysqlConnection.execute(
                `SELECT ur.userEmail, ur.tracking_token 
                 FROM UserRequest ur
                 JOIN TicketUserRequest tur ON ur.id = tur.userRequestID
                 WHERE tur.ticketID = ?`,
                [ticketID]
            );

            const emailToTokenMap = {};
            for (const row of creatorTokens) {
                emailToTokenMap[row.userEmail] = row.tracking_token;
            }

            for (const follower of followers) {
                if (!processedEmails.has(follower.userEmail)) {
                    const isCreator = !!emailToTokenMap[follower.userEmail];

                    // If it's a creator, they ONLY get notified if it's NOT internal
                    if (isCreator) {
                        if (!finalIsInternal) {
                            processedEmails.add(follower.userEmail);
                            const publicLink = `http://localhost:${process.env.FRONTEND_PORT}/track/${emailToTokenMap[follower.userEmail]}`;
                            sendCommentNotificationEmail(
                                follower.userEmail,
                                ticketTitle,
                                userEmail,
                                text,
                                publicLink,
                                false
                            ).catch(console.error);
                        }
                    } else {
                        // It's a staff follower (or someone without a request link)
                        // They get notified regardless (assuming they have perm to view)
                        // We assume followers are authorized if they managed to follow.
                        processedEmails.add(follower.userEmail);
                        sendCommentNotificationEmail(
                            follower.userEmail,
                            ticketTitle,
                            userEmail,
                            text,
                            dashboardLink,
                            finalIsInternal
                        ).catch(console.error);
                    }
                }
            }
        }

        response.json({ message: "Comment added" });
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "Failed to add comment" });
    }
});

// GET User Requests (Generic - authenticated users fetching their own)
// Mounted at /tickets/:email/requests
router.get('/:email/requests', isAuthenticated, async (request, response) => {
    const { email } = request.params;

    try {
        // Fetch All Tickets for this user
        const [rows] = await mysqlConnection.execute(
            `SELECT t.id, t.title, t.status, ur.tracking_token, t.createdAt 
             FROM UserRequest ur
             JOIN TicketUserRequest tur ON ur.id = tur.userRequestID
             JOIN Ticket t ON tur.ticketID = t.id
             WHERE ur.userEmail = ?
             ORDER BY t.createdAt DESC`,
            [email]
        );

        // Map 'draft' status to 'Draft' for frontend consistency if needed, 
        // but the DB default 'draft' is already what we want or close to it.
        const mappedRows = rows.map(r => ({
            ...r,
            status: r.status.charAt(0).toUpperCase() + r.status.slice(1)
        }));

        response.json(mappedRows);
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "Failed to fetch user requests." });
    }
});

export default router;