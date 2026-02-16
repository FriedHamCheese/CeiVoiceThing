import mysqlConnection from '../utils/mysqlConnection.js';
import express from 'express';
import { sendCommentNotificationEmail } from '../utils/email.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET Specialists (Generic - all authenticated active users/staff)
// Mounted at /tickets/specialists
router.get('/specialists', isAuthenticated, async (request, response) => {
    try {
        const [rows] = await mysqlConnection.execute(`
            SELECT u.email, u.name, sp.contact, GROUP_CONCAT(ss.scopeTag) as scope
            FROM Users u
            LEFT JOIN SpecialistProfile sp ON u.email = sp.userEmail
            LEFT JOIN SpecialistScope ss ON u.email = ss.userEmail
            WHERE u.perm >= 2
            GROUP BY u.email
            ORDER BY u.name ASC
        `);
        response.json(rows);
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "Failed to fetch specialists." });
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
        if (userPerm < 2) {
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