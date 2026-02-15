import { draftTicketFromUserRequest as ollama } from '../utils/ticketollama.js';
import { draftTicketFromUserRequest as openai } from '../utils/ticketopenai.js';
import mysqlConnection from '../utils/mysqlConnection.js';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sendConfirmationEmail } from '../utils/emailService.js';

const router = express.Router();

router.post('/userRequest', async (request, response) => {
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
        const draftTicketSuggestions = process.env.USE_OPENAI === 'TRUE'
            ? await openai(requestTextForInsertion)
            : await ollama(requestTextForInsertion);

        if (typeof draftTicketSuggestions === "string") {
            console.error("AI Summary Error Body:", draftTicketSuggestions);
            throw new Error(`AI Summary failed: ${draftTicketSuggestions}`);
        }

        // 3. Insert Draft Ticket
        const [draftRes] = await connection.execute(
            'INSERT INTO DraftTicket (title, summary, suggestedSolutions, suggestedAssignee) VALUES (?, ?, ?, ?)',
            [draftTicketSuggestions.title, draftTicketSuggestions.summary, draftTicketSuggestions.suggestedSolutions, draftTicketSuggestions.suggestedAssignee]
        );
        const insertedDraftTicketID = draftRes.insertId;

        // 4. Link Request and Categories
        await connection.execute(
            'INSERT INTO DraftTicketUserRequest (userRequestID, draftTicketID) VALUES (?, ?)',
            [insertedUserRequestID, insertedDraftTicketID]
        );

        for (const category of draftTicketSuggestions.categories) {
            await connection.execute(
                "INSERT INTO DraftTicketCategory (draftTicketID, category) VALUES (?, ?)",
                [insertedDraftTicketID, category]
            );
        }

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


router.get('/getDraftTicket/:draftTicketID', async (request, response) => {
    /*
    Returns:
    - HTTP status 200 with {
        .id: int,
        .summary: str,
        .title: str,
        .suggestedSolutions: str,
        .categories: Array(str),
    }
    - HTTP status 400 with .error if .draftTicketID is invalid
    - HTTP status 500 for undocumented errors
	
    Todo:
    - Add .userRequestIDs: Array(int)
    - Add .assigneeIDs: Array(int)
    */
    const HTTP_STATUS_FOR_BAD_REQUEST = 400;
    const draftTicketID = parseInt(request.params.draftTicketID);
    if (Number.isNaN(draftTicketID))
        return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({ error: "Received .draftTicketID attribute is not a number." });

    const [draftTickets, _] = await mysqlConnection.execute("SELECT * FROM DraftTicket WHERE id = ?", [draftTicketID]);
    if (draftTickets.length === 0)
        return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({ error: "Received .draftTicketID attribute corresponds to non-existing ticket." });

    let draftTicket = draftTickets[0];

    const [draftTicketCategories, _2] = await mysqlConnection.execute("SELECT category FROM DraftTicketCategory WHERE draftTicketID = ?", [
        draftTicketID
    ]);
    const categories = [];
    for (const draftTicketCategory of draftTicketCategories)
        categories.push(draftTicketCategory.category);

    draftTicket.categories = categories;
    response.json(draftTicket);
});

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

        // Check if it's still a draft
        const [draftLinks] = await mysqlConnection.execute(
            "SELECT dt.* FROM DraftTicket dt JOIN DraftTicketUserRequest dtur ON dt.id = dtur.draftTicketID WHERE dtur.userRequestID = ?",
            [userRequest.id]
        );

        if (draftLinks.length > 0) {
            return response.json({
                status: "Draft",
                title: draftLinks[0].title,
                message: "Your request is currently being reviewed by our administrators.",
                details: draftLinks[0].summary
            });
        }

        // Check if it has been promoted to a NewTicket
        const [newTickets] = await mysqlConnection.execute(
            `SELECT nt.* FROM NewTicket nt 
             JOIN NewTicketUserRequest ntur ON nt.id = ntur.newTicketID 
             WHERE ntur.userRequestID = ?`,
            [userRequest.id]
        );

        if (newTickets.length > 0) {
            const ticket = newTickets[0];

            // Fetch public comments
            const [comments] = await mysqlConnection.execute(
                "SELECT text, authorEmail, createdAt FROM TicketComments WHERE ticketID = ? AND isInternal = FALSE ORDER BY createdAt ASC",
                [ticket.id]
            );

            // Fetch assignees
            const [assignees] = await mysqlConnection.execute(
                "SELECT u.name, u.email FROM Users u JOIN NewTicketAssignee nta ON u.email = nta.assigneeEmail WHERE nta.newTicketID = ?",
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
        }

        return response.json({
            status: "Pending",
            message: "Your request has been received and is waiting for initial processing.",
            details: userRequest.requestContents
        });

    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "Internal server error." });
    }
});

// User Comment Route
router.post('/track/:token/comment', async (request, response) => {
    const { token } = request.params;
    const { email, text } = request.body;

    if (!text) return response.status(400).json({ error: "Comment text required" });

    try {
        const [requests] = await mysqlConnection.execute(
            `SELECT ur.id, ntur.newTicketID FROM UserRequest ur 
             LEFT JOIN NewTicketUserRequest ntur ON ur.id = ntur.userRequestID 
             WHERE ur.tracking_token = ? AND ur.userEmail = ?`,
            [token, email]
        );

        if (requests.length === 0 || !requests[0].newTicketID) {
            return response.status(403).json({ error: "Cannot comment on this ticket yet." });
        }

        const ticketID = requests[0].newTicketID;

        await mysqlConnection.execute(
            "INSERT INTO TicketComments (ticketID, authorEmail, text, isInternal) VALUES (?, ?, ?, FALSE)",
            [ticketID, email, text]
        );

        response.json({ message: "Comment added successfully." });
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "Failed to add comment." });
    }
    response.status(500).json({ error: "Failed to add comment." });
});

// Get all requests for a user
router.get('/user/:email/requests', async (request, response) => {
    const { email } = request.params;

    try {
        // Fetch Drafts
        const [drafts] = await mysqlConnection.execute(
            `SELECT dt.id, dt.title, 'Draft' as status, ur.tracking_token, ur.createdAt 
             FROM UserRequest ur
             JOIN DraftTicketUserRequest dtur ON ur.id = dtur.userRequestID
             JOIN DraftTicket dt ON dtur.draftTicketID = dt.id
             WHERE ur.userEmail = ?`,
            [email]
        );

        // Fetch Active Tickets
        const [active] = await mysqlConnection.execute(
            `SELECT nt.id, nt.title, nt.status, ur.tracking_token, nt.createdAt 
             FROM UserRequest ur
             JOIN NewTicketUserRequest ntur ON ur.id = ntur.userRequestID
             JOIN NewTicket nt ON ntur.newTicketID = nt.id
             WHERE ur.userEmail = ?`,
            [email]
        );

        // Combine and sort by date (newest first)
        const all = [...drafts, ...active].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        response.json(all);
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "Failed to fetch user requests." });
    }
});


export default router;