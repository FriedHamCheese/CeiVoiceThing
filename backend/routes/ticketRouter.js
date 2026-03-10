import mysqlConnection from '../utils/mysqlConnection.js';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { draftTicketFromUserRequest } from '../utils/ticketOpenAI.js';
import { sendConfirmationEmail, sendCommentNotificationEmail } from '../utils/email.js';
import { COMMA_SEPARATED_TAGS, PREDEFINED_TAGS } from '../constants/categories.js';
import { validateRequest } from '../middleware/validate.js';
import { createRequestSchema, getCommentsSchema, addCommentSchema, toggleFollowSchema, userRequestsSchema, creatorSchema } from '../schemas/ticketRouter.schema.js';
const router = express.Router();


// Create User Request
// for all authenticated user.
router.post('/request', isAuthenticated, validateRequest(createRequestSchema), async (request, response) => {
    const HTTP_STATUS_OK = 200;
    const HTTP_STATUS_SERVER_ERROR = 500;

    const { requestText, fromEmail } = request.body;
    const trackingToken = uuidv4();
    let connection;
    try {
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();

        //Optimize database interaction by parallelizing the requests.
        const userFlowPromise = (async () => {
            await connection.execute(
                'INSERT IGNORE INTO Users (email, name, perm) VALUES (?, ?, ?)',
                [fromEmail, fromEmail.split('@')[0], 1]
            );

            const [userRequestRes] = await connection.execute(
                'INSERT INTO UserRequest (userEmail, requestContents, tracking_token) VALUES (?, ?, ?)',
                [fromEmail, requestText, trackingToken]
            );

            return userRequestRes.insertId;
        })();

        // 2. Define the "Assignee Fetching" flow (Independent)
        const assigneePromise = (async () => {
            const [assigneesRows] = await connection.execute(`
                SELECT u.email, GROUP_CONCAT(ss.scopeTag SEPARATOR ', ') as scopes
                FROM Users u
                LEFT JOIN AssigneeScope ss ON u.email = ss.userEmail
                WHERE u.perm = 2
                GROUP BY u.email
            `);
            return assigneesRows.map(row => `${row.email}: [${row.scopes || ''}]`).join('\n');
        })();

        const [insertedUserRequestID, commaSeparatedAssignees] = await Promise.all([
            userFlowPromise,
            assigneePromise
        ]);

        const draftTicketSuggestions = await draftTicketFromUserRequest(requestText);

        // Fast Fail
        if (typeof draftTicketSuggestions === "string") {
            console.error("AI Summary Error Body:", draftTicketSuggestions);
            throw new Error(`AI Summary failed: ${draftTicketSuggestions}`);
        }

        // Get ID by inserting
        const [draftRes] = await connection.execute(
            'INSERT INTO Ticket (userRequestID, title, summary, solution, status) VALUES (?, ?, ?, ?, ?)',
            [insertedUserRequestID, draftTicketSuggestions.title, draftTicketSuggestions.summary, draftTicketSuggestions.suggestedSolutions, 'draft']
        );
        const insertedTicketID = draftRes.insertId;

        // 3. Prepare Data for Parallel Execution
        // Database Task, Category, Assignee, Follower
        const dbTasks = [];
        const uniqueCategories = new Set(
            draftTicketSuggestions.categories.map(c => c.trim().substring(0, 32))
        );
        //Using x.push(sql_queries) does not wait for sql to finish.        
        dbTasks.push(connection.execute(
            'INSERT INTO TicketUserRequest (userRequestID, ticketID) VALUES (?, ?)',
            [insertedUserRequestID, insertedTicketID]
        ));
        dbTasks.push(connection.execute(
            "INSERT INTO TicketFollower (ticketID, userEmail) VALUES (?, ?)",
            [insertedTicketID, fromEmail]
        ));
        if (draftTicketSuggestions.suggestedAssignee) {
            dbTasks.push(connection.execute(
                "INSERT INTO TicketAssignee (ticketID, assigneeEmail) VALUES (?, ?)",
                [insertedTicketID, draftTicketSuggestions.suggestedAssignee]
            ));
        }

        if (uniqueCategories.size > 0) {
            // Create placeholders: (?, ?), (?, ?)
            const placeholders = Array.from(uniqueCategories).map(() => '(?, ?)').join(', ');
            const values = [];
            uniqueCategories.forEach(cat => values.push(insertedTicketID, cat));

            dbTasks.push(connection.execute(
                `INSERT INTO TicketCategory (ticketID, category) VALUES ${placeholders}`,
                values
            ));
        }

        //wait for all tasks to complete
        await Promise.all(dbTasks);
        await connection.commit();

        //Then send email.
        sendConfirmationEmail(fromEmail, trackingToken)
            .catch(err => console.error("Email send failed:", err));

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
            SELECT u.email, u.name, GROUP_CONCAT(ss.scopeTag) as scope
            FROM Users u
            LEFT JOIN AssigneeScope ss ON u.email = ss.userEmail
            WHERE u.perm = 2
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
    response.json(PREDEFINED_TAGS);
});

// GET Comments (Generic - all authenticated users)
// Mounted at /tickets/:id/comments
router.get('/:id/comments', isAuthenticated, validateRequest(getCommentsSchema), async (request, response) => {
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
router.get('/:id/is_following', isAuthenticated, validateRequest(toggleFollowSchema), async (request, response) => {
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
router.post('/:id/follow', isAuthenticated, validateRequest(toggleFollowSchema), async (request, response) => {
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
router.post('/:id/comment', isAuthenticated, validateRequest(addCommentSchema), async (request, response) => {
    const { text, isInternal } = request.body;
    const ticketID = request.params.id;
    const userEmail = request.user.email;
    const userPerm = request.user.perm || 1;

    // Force internal to false if user is not specialist/admin
    const finalIsInternal = (userPerm >= 2) ? (isInternal || false) : false;

    try {
        await mysqlConnection.execute(
            "INSERT INTO TicketComments (ticketID, authorEmail, text, isInternal) VALUES (?, ?, ?, ?)",
            [ticketID, userEmail, text, finalIsInternal]
        );

        // --- Notification Logic ---
        // Added !finalIsInternal to ensure emails do not trigger for internal notes
        if (!finalIsInternal && (userPerm === 2 || userPerm === 4)) {
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
            const dashboardLink = `https://app.shoveitin.me/admin/tickets/${ticketID}`;

            for (const assignee of assignees) {
                if (!processedEmails.has(assignee.assigneeEmail)) {
                    processedEmails.add(assignee.assigneeEmail);
                    sendCommentNotificationEmail(
                        assignee.assigneeEmail,
                        ticketTitle,
                        userEmail,
                        text,
                        dashboardLink,
                        finalIsInternal // Will always be false here now, but safe to pass
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
                // Ensure we don't send duplicates to followers either
                if (!processedEmails.has(follower.userEmail)) {
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
        response.json({ message: "Comment added" });
    }
    catch (error) {
        console.error(error);
        response.status(500).json({ error: "Failed to add comment" });
    }
});

// GET User Requests (Generic - authenticated users fetching their own)
// Mounted at /tickets/requests
router.get('/requests', isAuthenticated, validateRequest(userRequestsSchema), async (request, response) => {
    const { email } = request.query;

    try {
        // Fetch All Tickets for this user
        const [rows] = await mysqlConnection.execute(
            `SELECT t.id, t.title, t.status, ur.tracking_token, t.createdAt 
             FROM UserRequest ur
             JOIN TicketUserRequest tur ON ur.id = tur.userRequestID
             JOIN Ticket t ON tur.ticketID = t.id
             WHERE ur.userEmail = ? AND t.status != 'merged'
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

router.get('/creator/:ticketID', validateRequest(creatorSchema), async (request, response) => {
    const { ticketID } = request.params;

    try {
        const [rows] = await mysqlConnection.execute(
            `SELECT u.email, u.name FROM Users u WHERE u.email = (SELECT ur.userEmail FROM UserRequest ur WHERE ur.id = (SELECT t.userRequestID FROM Ticket t WHERE t.id = ?))`,
            [ticketID]
        );
        if (rows.length === 0) {
            try {
                const [rows2] = await mysqlConnection.execute(
                    `SELECT u.email, u.name 
                     FROM Users u 
                     WHERE u.email IN (SELECT userEmail FROM UserRequest WHERE id IN (SELECT userRequestID FROM Ticket WHERE mergedTo = ?))`,
                    [ticketID]
                );
                response.json([rows2]);
            } catch (error) {
                console.error(error);
                response.status(500).json({ error: "Failed to fetch creator." });
            }
        } else {
            response.json([rows]);
        }
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "Failed to fetch creator." });
    }
});

export default router;