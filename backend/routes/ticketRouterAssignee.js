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
    const userEmail = request.user.email;
    const includeResolved = request.query.includeResolved === 'true';

    try {
        let query = `
            SELECT t.id, t.summary, t.solution, t.title, t.status, t.deadline, t.createdAt, t.updatedAt,
            (SELECT COUNT(*) FROM TicketUserRequest WHERE ticketID = t.id) as requestCount,
            GROUP_CONCAT(DISTINCT ta.assigneeEmail SEPARATOR ', ') AS assignees,
            GROUP_CONCAT(DISTINCT tc.category SEPARATOR ', ') AS categories,
            GROUP_CONCAT(DISTINCT tf.userEmail SEPARATOR ', ') AS followers
            FROM Ticket t
            JOIN TicketAssignee ta ON t.id = ta.ticketID
            LEFT JOIN TicketCategory tc ON t.id = tc.ticketID
            LEFT JOIN TicketFollower tf ON t.id = tf.ticketID
            WHERE ta.assigneeEmail = ?
        `;

        const params = [userEmail];

        if (!includeResolved) {
            query += " AND t.status NOT IN ('Solved', 'Failed')";
        }

        query += " GROUP BY t.id ORDER BY t.createdAt DESC";

        const [rows] = await mysqlConnection.execute(query, params);

        // Standardize output format
        const formattedTickets = rows.map(t => ({
            ...t,
            assignees: t.assignees ? t.assignees.split(', ') : [],
            categories: t.categories ? t.categories.split(', ') : [],
            followers: t.followers ? t.followers.split(', ') : []
        }));

        response.status(200).json({ tickets: formattedTickets });
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

        // Only proceed if status or assignees are provided and different from the current
        const { assigneeEmail } = request.body;

        if ((status !== undefined && status !== old.status) || assigneeEmail !== undefined) {
            const { resolutionComment } = request.body;

            // Validation: Require resolution comment for Solved or Failed
            if (status !== undefined && (status === 'Solved' || status === 'Failed') && (!resolutionComment || resolutionComment.trim() === "")) {
                return response.status(400).json({ error: `Resolution comment is required when setting status to ${status}.` });
            }

            // 1. Update status and resolution if provided
            if (status !== undefined || resolutionComment !== undefined) {
                const updateFields = [];
                const updateValues = [];
                if (status !== undefined) {
                    updateFields.push("status = ?");
                    updateValues.push(status);
                }
                if (resolutionComment !== undefined) {
                    updateFields.push("resolutionComment = ?");
                    updateValues.push(resolutionComment);
                }
                updateValues.push(ticketID);
                await connection.execute(`UPDATE Ticket SET ${updateFields.join(", ")} WHERE id = ?`, updateValues);

                if (status !== undefined && status !== old.status) {
                    let historyDetails = `Status changed from ${old.status} to ${status}`;
                    if (resolutionComment) {
                        historyDetails += `. Resolution: ${resolutionComment}`;
                    }
                    await logHistory(connection, ticketID, "Update", adminEmail, historyDetails);
                }
            }

            // 2. Update assignees if provided
            if (assigneeEmail !== undefined) {
                const newAssignees = Array.isArray(assigneeEmail) ? assigneeEmail : [assigneeEmail];
                const [oldAssigneeRows] = await connection.execute("SELECT assigneeEmail FROM TicketAssignee WHERE ticketID = ?", [ticketID]);
                const oldAssignees = oldAssigneeRows.map(r => r.assigneeEmail);

                // Check for differences
                const added = newAssignees.filter(email => !oldAssignees.includes(email));
                const removed = oldAssignees.filter(email => !newAssignees.includes(email));

                if (added.length > 0 || removed.length > 0) {
                    await connection.execute("DELETE FROM TicketAssignee WHERE ticketID = ?", [ticketID]);
                    for (const email of newAssignees) {
                        await connection.execute("INSERT INTO TicketAssignee (ticketID, assigneeEmail) VALUES (?, ?)", [ticketID, email]);
                    }

                    const historyDetails = `Assignees changed. Added: [${added.join(', ') || 'none'}], Removed: [${removed.join(', ') || 'none'}]`;
                    await logHistory(connection, ticketID, "Reassign", adminEmail, historyDetails);
                }
            }
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
