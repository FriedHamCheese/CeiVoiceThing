import express from 'express';
import mysqlConnection from '../utils/mysqlConnection.js';
import { validateRequest } from '../middleware/validate.js';
import { ticketRequestsSchema, ticketHistorySchema } from '../schemas/ticketRouter.internal.schema.js';

const router = express.Router();

// Fetch all tickets with status != draft, merged.
router.get('/', async (request, response) => {
    try {
        const [tickets] = await mysqlConnection.execute(`
            SELECT 
                t.id,
                t.title,
                t.summary,
                t.solution,
                t.status,
                t.deadline,
                t.createdAt,
                -- Count how many User Requests are linked to this ticket
                COUNT(DISTINCT tur.userRequestID) AS requestCount,
                -- List all assignees in one cell (e.g., "alice@x.com, bob@x.com")
                GROUP_CONCAT(DISTINCT ta.assigneeEmail SEPARATOR ', ') AS assignees,
                -- List all categories in one cell (e.g., "Bug, UI")
                GROUP_CONCAT(DISTINCT tc.category SEPARATOR ', ') AS categories,
                -- List all followers
                GROUP_CONCAT(DISTINCT tf.userEmail SEPARATOR ', ') AS followers
            FROM 
                Ticket t
                -- Use LEFT JOIN so we don't lose tickets that have 0 requests or 0 assignees
                LEFT JOIN TicketUserRequest tur ON t.id = tur.ticketID
                LEFT JOIN TicketAssignee ta ON t.id = ta.ticketID
                LEFT JOIN TicketCategory tc ON t.id = tc.ticketID
                LEFT JOIN TicketFollower tf ON t.id = tf.ticketID
            WHERE
                t.mergedTo IS NULL
                AND t.status != 'merged'
            GROUP BY 
                t.id, t.title, t.status, t.deadline, t.createdAt
            ORDER BY 
                t.createdAt DESC;
        `);

        // Convert comma-separated strings to arrays
        const formattedTickets = tickets.map(ticket => ({
            ...ticket,
            assignees: ticket.assignees ? ticket.assignees.split(', ') : [],
            categories: ticket.categories ? ticket.categories.split(', ') : [],
            followers: ticket.followers ? ticket.followers.split(', ') : []
        }));

        response.status(200).json({ tickets: formattedTickets });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: "Failed to fetch tickets." });
    }
});

// GET Requests linked to a ticket
router.get('/:id/requests', validateRequest(ticketRequestsSchema), async (request, response) => {
    const ticketID = request.params.id;
    try {
        const [rows] = await mysqlConnection.execute(
            `SELECT ur.* FROM UserRequest ur 
             JOIN TicketUserRequest tur ON ur.id = tur.userRequestID 
             WHERE tur.ticketID = ?`,
            [ticketID]
        );
        response.json(rows);
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "Failed to fetch linked requests" });
    }
});

router.get('/assignees', async (request, response) => {
    try {
        const [rows] = await mysqlConnection.execute(`
            SELECT 
                u.email, 
                u.name, 
                GROUP_CONCAT(ss.scopeTag) as scopeTags 
            FROM Users u 
            LEFT JOIN AssigneeScope ss ON u.email = ss.userEmail 
            WHERE u.perm = 2
            GROUP BY u.email, u.name;
        `);
        response.json(rows);
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "Failed to fetch assignees." });
    }
});

// GET History
router.get('/:id/history', validateRequest(ticketHistorySchema), async (request, response) => {
    try {
        const [rows] = await mysqlConnection.execute("SELECT * FROM TicketHistory WHERE ticketID = ? ORDER BY timestamp DESC", [request.params.id]);
        response.json(rows);
    } catch (error) {
        response.status(500).json({ error: "Failed to fetch history" });
    }
});

export default router;