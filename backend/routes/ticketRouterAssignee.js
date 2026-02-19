import express from 'express';
import mysqlConnection from '../utils/mysqlConnection.js';

const router = express.Router();
const logHistory = async (connection, ticketID, action, performedBy, details) => {
    try {
        await connection.execute(
            "INSERT INTO TicketHistory (ticketID, action, performer, details) VALUES (?, ?, ?, ?)",
            [ticketID, action, performedBy, details]
        );
    } catch (error) {
        console.error("Failed to log history:", error);
    }
};
// Fetch Active Tickets for Specialists
// Mounted at /specialist/tickets
router.get('/', async (request, response) => {
    try {
        const [rows] = await mysqlConnection.execute(`
            SELECT t.*, 
            (SELECT COUNT(*) FROM TicketUserRequest WHERE ticketID = t.id) as requestCount,
            ta.assigneeEmail
            FROM Ticket t
            LEFT JOIN TicketAssignee ta ON t.id = ta.ticketID
        `);
        // Add 'type' for compatibility with frontend if it expects 'draft' or 'new'
        const tickets = rows.map(t => ({
            ...t,
            type: t.status === 'draft' ? 'draft' : 'new'
        }));
        response.status(200).json({ tickets });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: "Failed to fetch tickets." });
    }
});

router.patch('/:id', async (request, response) => {
    const ticketID = request.params.id;
    // Only extract status from the body
    const { status } = request.body;
    const adminEmail = request.user.email;

    let connection;
    try {
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();

        // Check if ticket exists and get current status
        const [current] = await connection.execute("SELECT * FROM Ticket WHERE id = ?", [ticketID]);
        if (current.length === 0) return response.status(404).json({ error: "Ticket not found" });

        const old = current[0];

        // Security check: Only the assignee can update the ticket status
        // (Admins usually use the ticketRouterAdmin, but we check here just in case)
        const [assignees] = await connection.execute("SELECT assigneeEmail FROM TicketAssignee WHERE ticketID = ?", [ticketID]);
        const isAssignee = assignees.some(a => a.assigneeEmail === adminEmail);

        // Allow if user is admin (perm >= 4) or if they are the assignee
        if (request.user.perm < 4 && !isAssignee) {
            return response.status(403).json({ message: "You are not authorized to update this ticket." });
        }

        // Only proceed if status is provided and different from the current status
        if (status !== undefined && status !== old.status) {
            // 1. Update the Ticket table
            await connection.execute("UPDATE Ticket SET status = ? WHERE id = ?", [status, ticketID]);

            // 2. Log the history
            await logHistory(
                connection,
                ticketID,
                "Update",
                adminEmail,
                `Status changed from ${old.status} to ${status}`
            );
        }

        await connection.commit();
        response.json({ message: "Ticket status updated successfully" });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        response.status(500).json({ error: "Failed to update ticket status" });
    } finally {
        if (connection) connection.release();
    }
});

router.get('/:id/history', async (request, response) => {
    try {
        const [rows] = await mysqlConnection.execute("SELECT * FROM TicketHistory WHERE ticketID = ? ORDER BY timestamp DESC", [request.params.id]);
        response.json(rows);
    } catch (error) {
        response.status(500).json({ error: "Failed to fetch history" });
    }
});
export default router;
