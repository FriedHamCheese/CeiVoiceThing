import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import mysqlConnection from '../utils/mysqlConnection.js';
import { draftTicketFromUserRequest as ollama } from '../utils/ticketOllama.js';
import { draftTicketFromUserRequest as openai } from '../utils/ticketOpenAI.js';
import { draftTicketFromUserRequest as oracle } from '../utils/ticketOracle.js';
import { sendConfirmationEmail, sendCommentNotificationEmail } from '../utils/email.js';

const router = express.Router();

// Get Ticket Details
// Mounted at /public/tickets -> GET /ticket/:id
router.get('/ticket/:id', async (request, response) => {
    const HTTP_STATUS_FOR_BAD_REQUEST = 400;
    const ticketID = parseInt(request.params.id);
    if (Number.isNaN(ticketID))
        return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({ error: "Received .ticketID attribute is not a number." });

    const [tickets, _] = await mysqlConnection.execute("SELECT * FROM Ticket WHERE id = ?", [ticketID]);
    if (tickets.length === 0)
        return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({ error: "Received .ticketID attribute corresponds to non-existing ticket." });

    let ticket = tickets[0];

    const [ticketCategories, _2] = await mysqlConnection.execute("SELECT category FROM TicketCategory WHERE ticketID = ?", [
        ticketID
    ]);
    const categories = [];
    for (const ticketCategory of ticketCategories)
        categories.push(ticketCategory.category);

    ticket.categories = categories;
    response.json(ticket);
});

// Track Ticket
router.get('/track/:token', async (request, response) => {
    const { token } = request.params;
    const { email } = request.query;

    if (!token || !email) {
        return response.status(400).json({ error: "Missing token or email." });
    }

    try {
        // Find the user request by token and email for security
        const [requests] = await mysqlConnection.execute(
            "SELECT * FROM UserRequest WHERE tracking_token = ? AND userEmail = ?",
            [token, email]
        );

        if (requests.length === 0) {
            return response.status(404).json({ error: "Ticket not found or email mismatch." });
        }

        const userRequest = requests[0];

        // Fetch Ticket linked to this request
        const [tickets] = await mysqlConnection.execute(
            `SELECT t.* FROM Ticket t 
             JOIN TicketUserRequest tur ON t.id = tur.ticketID 
             WHERE tur.userRequestID = ?`,
            [userRequest.id]
        );

        if (tickets.length === 0) {
            return response.json({
                status: "Pending",
                message: "Your request has been received and is waiting for initial processing.",
                details: userRequest.requestContents
            });
        }

        const ticket = tickets[0];

        if (ticket.status === 'draft') {
            return response.json({
                status: "Draft",
                title: ticket.title,
                message: "Your request is currently being reviewed by our administrators.",
                details: ticket.requestContents
            });
        }

        // Fetch public comments
        const [comments] = await mysqlConnection.execute(
            "SELECT text, authorEmail, createdAt FROM TicketComments WHERE ticketID = ? AND isInternal = FALSE ORDER BY createdAt ASC",
            [ticket.id]
        );

        // Fetch assignees
        const [assignees] = await mysqlConnection.execute(
            "SELECT u.name, u.email FROM Users u JOIN TicketAssignee ta ON u.email = ta.assigneeEmail WHERE ta.ticketID = ?",
            [ticket.id]
        );

        return response.json({
            id: ticket.id,
            status: ticket.status || "New",
            title: ticket.title,
            details: ticket.requestContents,
            message: "Your request has been accepted and is currently in our active workflow.",
            comments: comments,
            assignees: assignees
        });

    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "Internal server error." });
    }
});

// User Comment (Public/Tracking)
router.post('/track/:token/comment', async (request, response) => {
    const { token } = request.params;
    const { email, text } = request.body;

    if (!text) return response.status(400).json({ error: "Comment text required" });

    try {
        const [requests] = await mysqlConnection.execute(
            `SELECT ur.id, tur.ticketID FROM UserRequest ur 
             LEFT JOIN TicketUserRequest tur ON ur.id = tur.userRequestID 
             WHERE ur.tracking_token = ? AND ur.userEmail = ?`,
            [token, email]
        );

        if (requests.length === 0 || !requests[0].ticketID) {
            return response.status(403).json({ error: "Cannot comment on this ticket yet." });
        }

        const ticketID = requests[0].ticketID;

        await mysqlConnection.execute(
            "INSERT INTO TicketComments (ticketID, authorEmail, text, isInternal) VALUES (?, ?, ?, FALSE)",
            [ticketID, email, text]
        );

        // Fetch ticket details for email
        const [ticketRows] = await mysqlConnection.execute("SELECT title FROM Ticket WHERE id = ?", [ticketID]);
        const ticketTitle = ticketRows[0]?.title || "Support Ticket";

        // Fetch assignees to notify
        const [assignees] = await mysqlConnection.execute(
            "SELECT assigneeEmail FROM TicketAssignee WHERE ticketID = ?",
            [ticketID]
        );

        // Send email to all assignees
        // Link for assignees (Admin Dashboard)
        const dashboardLink = `http://localhost:${process.env.FRONTEND_PORT}/admin/tickets/${ticketID}`;

        for (const assignee of assignees) {
            sendCommentNotificationEmail(
                assignee.assigneeEmail,
                ticketTitle,
                email, // User's email
                text,
                dashboardLink,
                false // User comments are never internal
            ).catch(console.error);
        }

        response.json({ message: "Comment added successfully." });
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "Failed to add comment." });
    }
});

export default router;
