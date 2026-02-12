import mysqlConnection from '../utils/mysqlConnection.js';
import express from 'express';
import { sendStatusUpdateEmail } from '../utils/emailService.js';
import { findMergeRecommendations as ollamaRecommend } from '../utils/ticketollama.js';
import { findMergeRecommendations as openaiRecommend } from '../utils/ticketopenai.js';

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
        const [drafts] = await mysqlConnection.execute(`
            SELECT dt.*, 'draft' as type, 
            (SELECT COUNT(*) FROM DraftTicketUserRequest WHERE draftTicketID = dt.id) as requestCount,
            MIN(dta.assigneeEmail) as assigneeEmail
            FROM DraftTicket dt
            LEFT JOIN DraftTicketAssignee dta ON dt.id = dta.draftTicketID
            GROUP BY dt.id
        `);
        const [news] = await mysqlConnection.execute(`
            SELECT nt.*, 'new' as type, MIN(nta.assigneeEmail) as assigneeEmail
            FROM NewTicket nt
            LEFT JOIN NewTicketAssignee nta ON nt.id = nta.newTicketID
            GROUP BY nt.id
        `);
        response.status(200).json({ tickets: [...drafts, ...news] });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: "Failed to fetch tickets." });
    }
});

// GET Requests linked to a draft
router.get('/draft/:id/requests', async (request, response) => {
    const draftTicketID = request.params.id;
    try {
        const [rows] = await mysqlConnection.execute(
            `SELECT ur.* FROM UserRequest ur 
             JOIN DraftTicketUserRequest dtur ON ur.id = dtur.userRequestID 
             WHERE dtur.draftTicketID = ?`,
            [draftTicketID]
        );
        response.json(rows);
    } catch (error) {
        response.status(500).json({ error: "Failed to fetch linked requests" });
    }
});

// Update Draft Ticket
router.patch('/draft/:id', async (request, response) => {
    const draftID = request.params.id;
    const { title, summary, suggestedSolutions, deadline, categories, assigneeEmail } = request.body;

    let connection;
    try {
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();

        const updates = [];
        const values = [];

        if (title !== undefined) { updates.push("title = ?"); values.push(title); }
        if (summary !== undefined) { updates.push("summary = ?"); values.push(summary); }
        if (suggestedSolutions !== undefined) { updates.push("suggestedSolutions = ?"); values.push(suggestedSolutions); }
        if (deadline !== undefined) { updates.push("deadline = ?"); values.push(deadline === '' ? null : deadline); }

        if (updates.length > 0) {
            values.push(draftID);
            await connection.execute(`UPDATE DraftTicket SET ${updates.join(", ")} WHERE id = ?`, values);
        }

        if (categories !== undefined) {
            await connection.execute("DELETE FROM DraftTicketCategory WHERE draftTicketID = ?", [draftID]);
            for (const cat of categories) {
                await connection.execute("INSERT INTO DraftTicketCategory (draftTicketID, category) VALUES (?, ?)", [draftID, cat]);
            }
        }

        if (assigneeEmail !== undefined) {
            await connection.execute("DELETE FROM DraftTicketAssignee WHERE draftTicketID = ?", [draftID]);
            if (assigneeEmail) {
                await connection.execute("INSERT INTO DraftTicketAssignee (draftTicketID, assigneeEmail) VALUES (?, ?)", [draftID, assigneeEmail]);
            }
        }

        await connection.commit();
        response.json({ message: "Draft updated successfully" });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        response.status(500).json({ error: "Failed to update draft" });
    } finally {
        if (connection) connection.release();
    }
});

// Unlink a UserRequest from a Draft
router.post('/draft/:id/unlink/:requestId', async (request, response) => {
    const { id: draftID, requestId } = request.params;

    let connection;
    try {
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();

        // 1. Check if more than 1 request exists (don't unlink the last one this way)
        const [links] = await connection.execute("SELECT * FROM DraftTicketUserRequest WHERE draftTicketID = ?", [draftID]);
        if (links.length <= 1) throw new Error("Cannot unlink the last request from a draft. Delete or update the draft instead.");

        // 2. Remove the link
        await connection.execute("DELETE FROM DraftTicketUserRequest WHERE draftTicketID = ? AND userRequestID = ?", [draftID, requestId]);

        // 3. Create a NEW DraftTicket for the unlinked request
        const [requests] = await connection.execute("SELECT * FROM UserRequest WHERE id = ?", [requestId]);
        const req = requests[0];

        // For simplicity, we just use defaults or re-trigger AI. 
        // Here we'll just create a basic draft and let the Admin dashboard's usual mechanisms handle it if needed.
        // Actually, trigger AI would be better but for EPIC 03 acceptance criteria, "revert to a new separate draft" is key.
        const [newDraft] = await connection.execute(
            "INSERT INTO DraftTicket (title, summary, suggestedSolutions) VALUES (?, ?, ?)",
            [`Unlinked: ${req.userEmail}`, req.requestContents, "No solutions proposed yet."]
        );
        const newDraftID = newDraft.insertId;

        await connection.execute(
            "INSERT INTO DraftTicketUserRequest (draftTicketID, userRequestID) VALUES (?, ?)",
            [newDraftID, requestId]
        );

        await connection.commit();
        response.json({ message: "Request unlinked successfully.", newDraftID: newDraftID });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        response.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// Convert Draft to New Ticket
router.post('/toNewTicket', async (request, response) => {
    const { ticketID, deadline: deadlineOverride, assigneeEmail: assigneeOverride } = request.body;
    if (typeof ticketID !== 'number') return response.status(400).json({ message: 'Invalid ticketID.' });

    let connection;
    try {
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();

        const [drafts] = await connection.execute("SELECT * FROM DraftTicket WHERE id = ?", [ticketID]);
        if (drafts.length === 0) throw new Error("Draft not found");

        const draft = drafts[0];

        // Fetch selected assignee for draft if any
        const [assignees] = await connection.execute("SELECT assigneeEmail FROM DraftTicketAssignee WHERE draftTicketID = ?", [ticketID]);
        const draftAssigneeEmail = assignees.length > 0 ? assignees[0].assigneeEmail : null;

        // 1. Create New Ticket
        const deadline = deadlineOverride !== undefined ? (deadlineOverride === '' ? null : deadlineOverride) : draft.deadline;
        const assigneeEmail = assigneeOverride !== undefined ? assigneeOverride : draftAssigneeEmail;

        const [newTicket] = await connection.execute(
            "INSERT INTO NewTicket (title, requestContents, suggestedSolutions, status, deadline) VALUES (?, ?, ?, ?, ?)",
            [draft.title, draft.summary, draft.suggestedSolutions, 'New', deadline]
        );
        const newID = newTicket.insertId;

        // 1.1 Assign specialist if exists
        if (assigneeEmail) {
            await connection.execute("INSERT INTO NewTicketAssignee (newTicketID, assigneeEmail) VALUES (?, ?)", [newID, assigneeEmail]);
        }

        // Log Promotion to History
        await logHistory(connection, newID, "Promoted", "Admin", `Ticket promoted from draft ID ${ticketID}`);

        // 2. Move Followers (UserRequests) and Link them
        const [requestLinks] = await connection.execute(
            `SELECT DISTINCT dtur.userRequestID, ur.userEmail 
             FROM DraftTicketUserRequest dtur 
             JOIN UserRequest ur ON dtur.userRequestID = ur.id 
             WHERE dtur.draftTicketID = ?`,
            [ticketID]
        );

        if (requestLinks.length > 0) {
            // Bulk insert followers
            const followerValues = Array.from(new Set(requestLinks.map(r => r.userEmail))).map(email => [newID, email]);
            await connection.query("INSERT INTO NewTicketFollower (newTicketID, userEmail) VALUES ?", [followerValues]);

            // Link original requests to the new ticket
            const linkValues = requestLinks.map(r => [newID, r.userRequestID]);
            await connection.query("INSERT INTO NewTicketUserRequest (newTicketID, userRequestID) VALUES ?", [linkValues]);
        }

        // 3. Move Categories
        await connection.execute(
            "INSERT INTO NewTicketCategory (newTicketID, category) SELECT ?, category FROM DraftTicketCategory WHERE draftTicketID = ?",
            [newID, ticketID]
        );

        // 4. Cleanup Draft
        await connection.execute("DELETE FROM DraftTicketUserRequest WHERE draftTicketID = ?", [ticketID]);
        await connection.execute("DELETE FROM DraftTicketCategory WHERE draftTicketID = ?", [ticketID]);
        await connection.execute("DELETE FROM DraftTicketAssignee WHERE draftTicketID = ?", [ticketID]);
        await connection.execute("DELETE FROM DraftTicket WHERE id = ?", [ticketID]);

        await connection.commit();

        // Trigger emails to followers
        for (const req of requestLinks) {
            const [tokens] = await mysqlConnection.execute(
                "SELECT tracking_token FROM UserRequest WHERE id = ?",
                [req.userRequestID]
            );
            const token = tokens.length > 0 ? tokens[0].tracking_token : null;
            if (token) {
                sendStatusUpdateEmail(req.userEmail, draft.title, "Active (New)", token)
                    .catch(err => console.error("Update email failed:", err));
            }
        }

        response.status(200).json({ message: 'Promoted to New Ticket.', newTicketID: newID });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        response.status(500).json({ message: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// Merge multiple Drafts into one
router.post("/merge", async (request, response) => {
    const { draftTicketIDs, title, summary, categories, suggestedSolutions, deadline, assigneeEmail } = request.body;

    if (!Array.isArray(draftTicketIDs) || draftTicketIDs.length === 0) {
        return response.status(400).json({ error: "Invalid IDs array." });
    }

    let connection;
    try {
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();

        // 1. Create Merged Draft
        const [inserted] = await connection.execute(
            "INSERT INTO DraftTicket (title, summary, suggestedSolutions, deadline) VALUES (?, ?, ?, ?)",
            [title.trim(), summary.trim(), suggestedSolutions.trim(), deadline || null]
        );
        const mergedID = inserted.insertId;

        // 2. Re-link User Requests from old drafts to new one
        for (const oldID of draftTicketIDs) {
            await connection.execute(
                "UPDATE IGNORE DraftTicketUserRequest SET draftTicketID = ? WHERE draftTicketID = ?",
                [mergedID, oldID]
            );
            await connection.execute("DELETE FROM DraftTicketUserRequest WHERE draftTicketID = ?", [oldID]);
            await connection.execute("DELETE FROM DraftTicketCategory WHERE draftTicketID = ?", [oldID]);
            await connection.execute("DELETE FROM DraftTicketAssignee WHERE draftTicketID = ?", [oldID]);
            await connection.execute("DELETE FROM DraftTicket WHERE id = ?", [oldID]);
        }

        // 3. Assign specialist if provided
        if (assigneeEmail) {
            await connection.execute("INSERT INTO DraftTicketAssignee (draftTicketID, assigneeEmail) VALUES (?, ?)", [mergedID, assigneeEmail]);
        }

        // 4. Insert new unique categories
        const uniqueCategories = [...new Set(categories)];
        for (const cat of uniqueCategories) {
            await connection.execute("INSERT INTO DraftTicketCategory (category, draftTicketID) VALUES (?, ?)", [cat, mergedID]);
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
        const [drafts] = await mysqlConnection.execute("SELECT id, title, summary FROM DraftTicket");

        if (drafts.length < 2) {
            return response.json({ recommendations: [] });
        }

        const recommendations = process.env.USE_OPENAI === 'TRUE'
            ? await openaiRecommend(drafts)
            : await ollamaRecommend(drafts);

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

// Update Ticket (Status, Deadline, Assignee)
router.patch('/:id', async (request, response) => {
    const ticketID = request.params.id;
    const { status, deadline, assigneeEmail } = request.body;
    const adminEmail = "Admin"; // Should ideally come from request.user.email

    let connection;
    try {
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();

        const [current] = await connection.execute("SELECT * FROM NewTicket WHERE id = ?", [ticketID]);
        if (current.length === 0) return response.status(404).json({ error: "Ticket not found" });
        const old = current[0];

        const updates = [];
        const values = [];
        const historyDetails = [];

        if (status && status !== old.status) {
            updates.push("status = ?");
            values.push(status);
            historyDetails.push(`Status changed from ${old.status} to ${status}`);
        }
        if (deadline !== undefined) {
            updates.push("deadline = ?");
            values.push(deadline);
            historyDetails.push(`Deadline updated to ${deadline}`);
        }

        if (updates.length > 0) {
            values.push(ticketID);
            await connection.execute(`UPDATE NewTicket SET ${updates.join(", ")} WHERE id = ?`, values);
        }

        if (assigneeEmail !== undefined) {
            // Support multiple assignees by adding, or replace single? 
            // For now, let's assume one specialist per ticket for simplicity, but use the junction table.
            await connection.execute("DELETE FROM NewTicketAssignee WHERE newTicketID = ?", [ticketID]);
            if (assigneeEmail) {
                await connection.execute("INSERT INTO NewTicketAssignee (newTicketID, assigneeEmail) VALUES (?, ?)", [ticketID, assigneeEmail]);
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

// GET Comments
router.get('/:id/comments', async (request, response) => {
    try {
        const [rows] = await mysqlConnection.execute("SELECT * FROM TicketComments WHERE ticketID = ? ORDER BY createdAt DESC", [request.params.id]);
        response.json(rows);
    } catch (error) {
        response.status(500).json({ error: "Failed to fetch comments" });
    }
});

// ADD Comment
router.post('/:id/comment', async (request, response) => {
    const { text, authorEmail, isInternal } = request.body;
    const ticketID = request.params.id;

    if (!text) return response.status(400).json({ error: "Comment text required" });

    try {
        await mysqlConnection.execute(
            "INSERT INTO TicketComments (ticketID, authorEmail, text, isInternal) VALUES (?, ?, ?, ?)",
            [ticketID, authorEmail || "admin@example.com", text, isInternal || false]
        );
        response.json({ message: "Comment added" });
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "Failed to add comment" });
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