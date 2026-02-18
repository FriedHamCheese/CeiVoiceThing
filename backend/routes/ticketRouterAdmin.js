import mysqlConnection from '../utils/mysqlConnection.js';
import express from 'express';
import { sendStatusUpdateEmail, sendCommentNotificationEmail } from '../utils/email.js';
import { findMergeRecommendations as ollamaRecommend } from '../utils/ticketOllama.js';
import { findMergeRecommendations as openaiRecommend } from '../utils/ticketOpenAI.js';
import { findMergeRecommendations as oracleRecommend } from '../utils/ticketOracle.js';

const router = express.Router();

// Helper to log ticket history
const logHistory = async (connection, ticketID, action, performedBy, details) => {
    try {
        await connection.execute(
            "INSERT INTO TicketHistory (ticketID, action, performedBy, details) VALUES (?, ?, ?, ?)",
            [ticketID, action, performedBy, details]
        );
    } catch (error) {
        console.error("Failed to log history:", error);
    }
};

// Fetch all tickets for Admin dashboard
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

// GET Requests linked to a ticket (formerly draft)
router.get('/:id/requests', async (request, response) => {
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
        response.status(500).json({ error: "Failed to fetch linked requests" });
    }
});

// Update Ticket (Flexible for both draft and active)
router.patch('/:id', async (request, response) => {
    const ticketID = request.params.id;
    const { title, summary, requestContents, suggestedSolutions, deadline, categories, assigneeEmail, status } = request.body;
    const adminEmail = request.user.email;

    let connection;
    try {
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();

        const [current] = await connection.execute("SELECT * FROM Ticket WHERE id = ?", [ticketID]);
        if (current.length === 0) return response.status(404).json({ error: "Ticket not found" });
        const old = current[0];

        const updates = [];
        const values = [];
        const historyDetails = [];

        if (title !== undefined && title !== old.title) { updates.push("title = ?"); values.push(title); historyDetails.push(`Title updated`); }
        if (requestContents !== undefined && requestContents !== old.requestContents) {
            updates.push("requestContents = ?");
            values.push(requestContents);
            historyDetails.push(`Content updated`);
        } else if (summary !== undefined && summary !== old.requestContents) {
            // Backward compatibility for frontend using 'summary'
            updates.push("requestContents = ?");
            values.push(summary);
            historyDetails.push(`Content updated`);
        }
        if (suggestedSolutions !== undefined && suggestedSolutions !== old.suggestedSolutions) { updates.push("suggestedSolutions = ?"); values.push(suggestedSolutions); historyDetails.push(`Solutions updated`); }
        if (deadline !== undefined) { updates.push("deadline = ?"); values.push(deadline === '' ? null : deadline); historyDetails.push(`Deadline updated`); }
        if (status !== undefined && status !== old.status) { updates.push("status = ?"); values.push(status); historyDetails.push(`Status changed from ${old.status} to ${status}`); }

        if (updates.length > 0) {
            values.push(ticketID);
            await connection.execute(`UPDATE Ticket SET ${updates.join(", ")} WHERE id = ?`, values);
        }

        if (categories !== undefined) {
            await connection.execute("DELETE FROM TicketCategory WHERE ticketID = ?", [ticketID]);
            for (const cat of categories) {
                await connection.execute("INSERT INTO TicketCategory (ticketID, category) VALUES (?, ?)", [ticketID, cat]);
            }
        }

        if (assigneeEmail !== undefined) {
            await connection.execute("DELETE FROM TicketAssignee WHERE ticketID = ?", [ticketID]);
            if (assigneeEmail) {
                await connection.execute("INSERT INTO TicketAssignee (ticketID, assigneeEmail) VALUES (?, ?)", [ticketID, assigneeEmail]);
                historyDetails.push(`Assignee updated to ${assigneeEmail}`);
            } else {
                historyDetails.push(`Assignee removed`);
            }
        }

        if (historyDetails.length > 0) {
            for (const detail of historyDetails) {
                await logHistory(connection, ticketID, "Update", adminEmail, detail);
            }
        }

        await connection.commit();
        response.json({ message: "Ticket updated successfully" });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        response.status(500).json({ error: "Failed to update ticket" });
    } finally {
        if (connection) connection.release();
    }
});

// Unlink a UserRequest from a Ticket
router.post('/:id/unlink/:requestId', async (request, response) => {
    const { id: ticketID, requestId } = request.params;

    let connection;
    try {
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();

        // 1. Check if more than 1 request exists
        const [links] = await connection.execute("SELECT * FROM TicketUserRequest WHERE ticketID = ?", [ticketID]);
        if (links.length <= 1) throw new Error("Cannot unlink the last request. Delete the ticket instead.");

        // 2. Remove the link
        await connection.execute("DELETE FROM TicketUserRequest WHERE ticketID = ? AND userRequestID = ?", [ticketID, requestId]);

        // 3. Create a NEW Ticket for the unlinked request
        const [requests] = await connection.execute("SELECT * FROM UserRequest WHERE id = ?", [requestId]);
        const req = requests[0];

        const [newTicket] = await connection.execute(
            "INSERT INTO Ticket (title, requestContents, suggestedSolutions, status) VALUES (?, ?, ?, 'draft')",
            [`Unlinked: ${req.userEmail}`, req.requestContents, "No solutions proposed yet."]
        );
        const newID = newTicket.insertId;

        await connection.execute(
            "INSERT INTO TicketUserRequest (ticketID, userRequestID) VALUES (?, ?)",
            [newID, requestId]
        );

        await connection.commit();
        response.json({ message: "Request unlinked successfully.", newTicketID: newID });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        response.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// Convert Draft to New Ticket (Simply update status)
router.post('/toNewTicket', async (request, response) => {
    const { ticketID, deadline: deadlineOverride, assigneeEmail: assigneeOverride } = request.body;
    if (typeof ticketID !== 'number') return response.status(400).json({ message: 'Invalid ticketID.' });

    let connection;
    try {
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();

        const [rows] = await connection.execute("SELECT * FROM Ticket WHERE id = ?", [ticketID]);
        if (rows.length === 0) throw new Error("Ticket not found");
        const ticket = rows[0];

        const updates = ["status = 'New'"];
        const values = [];

        if (deadlineOverride !== undefined) {
            updates.push("deadline = ?");
            values.push(deadlineOverride === '' ? null : deadlineOverride);
        }

        values.push(ticketID);
        await connection.execute(`UPDATE Ticket SET ${updates.join(", ")} WHERE id = ?`, values);

        if (assigneeOverride !== undefined) {
            await connection.execute("DELETE FROM TicketAssignee WHERE ticketID = ?", [ticketID]);
            if (assigneeOverride) {
                await connection.execute("INSERT INTO TicketAssignee (ticketID, assigneeEmail) VALUES (?, ?)", [ticketID, assigneeOverride]);
            }
        }

        // Log Promotion to History
        await logHistory(connection, ticketID, "Promoted", "Admin", `Ticket promoted from draft`);

        // Trigger emails to followers
        const [requestLinks] = await connection.execute(
            `SELECT ur.userEmail, ur.tracking_token 
             FROM UserRequest ur 
             JOIN TicketUserRequest tur ON ur.id = tur.userRequestID 
             WHERE tur.ticketID = ?`,
            [ticketID]
        );

        await connection.commit();

        for (const req of requestLinks) {
            if (req.tracking_token) {
                sendStatusUpdateEmail(req.userEmail, ticket.title, "Active (New)", req.tracking_token)
                    .catch(err => console.error("Update email failed:", err));
            }
        }

        response.status(200).json({ message: 'Promoted to New Ticket.', ticketID: ticketID });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        response.status(500).json({ message: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// Merge multiple Tickets into one
router.post("/merge", async (request, response) => {
    const { draftTicketIDs, title, summary, categories, suggestedSolutions, deadline, assigneeEmail } = request.body;

    if (!Array.isArray(draftTicketIDs) || draftTicketIDs.length === 0) {
        return response.status(400).json({ error: "Invalid IDs array." });
    }

    let connection;
    try {
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();

        // 1. Create Merged Ticket
        const [inserted] = await connection.execute(
            "INSERT INTO Ticket (title, requestContents, suggestedSolutions, deadline, status) VALUES (?, ?, ?, ?, 'draft')",
            [title.trim(), summary.trim(), suggestedSolutions.trim(), deadline || null]
        );
        const mergedID = inserted.insertId;

        // 2. Re-link User Requests and Cleanup old tickets
        for (const oldID of draftTicketIDs) {
            await connection.execute(
                "UPDATE IGNORE TicketUserRequest SET ticketID = ? WHERE ticketID = ?",
                [mergedID, oldID]
            );
            await connection.execute("DELETE FROM TicketUserRequest WHERE ticketID = ?", [oldID]);
            await connection.execute("DELETE FROM TicketCategory WHERE ticketID = ?", [oldID]);
            await connection.execute("DELETE FROM TicketAssignee WHERE ticketID = ?", [oldID]);
            await connection.execute("DELETE FROM Ticket WHERE id = ?", [oldID]);
            // Also move comments and history if relevant (optional, but good practice)
            await connection.execute("UPDATE TicketComments SET ticketID = ? WHERE ticketID = ?", [mergedID, oldID]);
            await connection.execute("UPDATE TicketHistory SET ticketID = ? WHERE ticketID = ?", [mergedID, oldID]);
            await connection.execute("UPDATE TicketFollower SET ticketID = ? WHERE ticketID = ?", [mergedID, oldID]);
        }

        // 3. Assign specialist if provided
        if (assigneeEmail) {
            await connection.execute("INSERT INTO TicketAssignee (ticketID, assigneeEmail) VALUES (?, ?)", [mergedID, assigneeEmail]);
        }

        // 4. Insert new unique categories
        if (categories && Array.isArray(categories)) {
            const uniqueCategories = [...new Set(categories)];
            for (const cat of uniqueCategories) {
                await connection.execute("INSERT INTO TicketCategory (category, ticketID) VALUES (?, ?)", [cat, mergedID]);
            }
        }

        await connection.commit();
        response.status(200).json({ message: "Tickets merged successfully." });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        response.status(500).json({ error: "Merge failed." });
    } finally {
        if (connection) connection.release();
    }
});

// Recommend Merges using AI
router.get("/recommend-merges", async (request, response) => {
    try {
        const [drafts] = await mysqlConnection.execute("SELECT id, title, requestContents as summary FROM Ticket WHERE status = 'draft'");

        if (drafts.length < 2) {
            return response.json({ recommendations: [] });
        }

        let recommendations;
        
        switch (process.env.LLM_PROVIDER) {
            case 'OPENAI':
                recommendations = await openaiRecommend(drafts);
                break;
            case 'ORACLE':
                recommendations = await oracleRecommend(drafts);
                break;
            case 'OLLAMA':
            default:
                recommendations = await ollamaRecommend(drafts);
                break;
        }

        response.status(200).json({ recommendations });
    } catch (error) {
        console.error("Recommendation error:", error);
        response.status(500).json({ error: "Failed to generate recommendations." });
    }
});

// GET Specialists (Users with perm 2)
router.get('/specialists', async (request, response) => {
    try {
        const [rows] = await mysqlConnection.execute(`
            SELECT u.email, u.name, sp.contact, GROUP_CONCAT(ss.scopeTag) as scope
            FROM Users u
            LEFT JOIN SpecialistProfile sp ON u.email = sp.userEmail
            LEFT JOIN SpecialistScope ss ON u.email = ss.userEmail
            WHERE u.perm = 2
            GROUP BY u.email
            ORDER BY u.name ASC
        `);
        response.json(rows);
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "Failed to fetch specialists." });
    }
});

// GET History
router.get('/:id/history', async (request, response) => {
    try {
        const [rows] = await mysqlConnection.execute("SELECT * FROM TicketHistory WHERE ticketID = ? ORDER BY timestamp DESC", [request.params.id]);
        response.json(rows);
    } catch (error) {
        response.status(500).json({ error: "Failed to fetch history" });
    }
});

export default router;