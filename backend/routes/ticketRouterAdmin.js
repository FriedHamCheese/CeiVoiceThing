import mysqlConnection from '../utils/mysqlConnection.js';
import express from 'express';
import { z } from 'zod';
import { sendStatusUpdateEmail, sendCommentNotificationEmail } from '../utils/email.js';
import { findMergeRecommendations as ollamaRecommend } from '../utils/ticketOllama.js';
import { findMergeRecommendations as openaiRecommend } from '../utils/ticketOpenAI.js';
import { findMergeRecommendations as oracleRecommend } from '../utils/ticketOracle.js';

const router = express.Router();

const historySchema = z.object({
    action: z.string().min(1),
    performer: z.email().min(1),
    details: z.string().min(1)
});

// Create a schema for the array of history items
const historyBatchSchema = z.array(historySchema);

const logHistory = async (connection, ticketID, userEmail, historyItems) => {
    // 1. Prepare the data for validation
    const dataToValidate = historyItems.map(item => ({
        ticketID,
        action: item.action,
        performer: userEmail,
        details: item.details
    }));

    // 2. Validate the batch
    const validation = historyBatchSchema.safeParse(dataToValidate);

    if (!validation.success) {
        console.error("Validation failed:", validation.error.format());
        return;
    }

    if (validation.data.length === 0) return;

    // 3. Map validated data to SQL values
    const values = validation.data.map(item => [
        item.ticketID,
        item.action,
        item.performer,
        item.details,
        new Date()
    ]);

    try {
        await connection.query(
            "INSERT INTO TicketHistory (ticketID, action, performer, details, timestamp) VALUES ?",
            [values]
        );
    } catch (error) {
        console.error("Database Error:", error);
    }
};
// Update Ticket
// Ticket schema
const ticketUpdateSchema = z.object({
    title: z.string().optional(),
    summary: z.string().optional(),
    solution: z.string().optional(),
    deadline: z.string().optional().nullable(),
    categories: z.array(z.string()).optional(),
    assigneeEmail: z.array(z.email("Invalid email format")).optional(),
    status: z.string().optional()
});

router.patch('/:id', async (request, response) => {
    const ticketID = request.params.id;
    const email = request.user.email;

    // 1. Validate Input
    const parsed = ticketUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
        return response.status(400).json({
            error: "Validation failed",
            details: parsed.error.issues
        });
    }

    const { title, summary, solution, deadline, categories, assigneeEmail, status } = parsed.data;
    let connection;

    try {
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();

        // 2. Fetch current record to compare changes
        const [rows] = await connection.execute("SELECT * FROM Ticket WHERE id = ?", [ticketID]);
        if (rows.length === 0) {
            await connection.rollback();
            return response.status(404).json({ error: "Ticket not found" });
        }
        const current = rows[0];

        const updates = [];
        const values = [];
        const historyItems = [];

        // 3. Dynamic SQL Construction for Main Ticket Table
        if (title !== undefined && title !== current.title) {
            updates.push("title = ?"), values.push(title);
            historyItems.push({ action: "Title updated", details: `${current.title} -> ${title}` });
        }
        if (summary !== undefined && summary !== current.summary) {
            updates.push("summary = ?"), values.push(summary);
            historyItems.push({ action: "Summary updated", details: `${current.summary} -> ${summary}` });
        }
        if (solution !== undefined && solution !== current.solution) {
            updates.push("solution = ?"), values.push(solution);
            historyItems.push({ action: "Solution updated", details: `${current.solution} -> ${solution}` });
        }
        let shouldNotifyNew = false;
        if (status !== undefined && status !== current.status) {
            updates.push("status = ?"), values.push(status);
            if (current.status === 'draft' && status === 'New') {
                historyItems.push({ action: "Promoted", details: "Ticket promoted from draft" });
                shouldNotifyNew = true;
            } else {
                historyItems.push({ action: "Status updated", details: `${current.status} -> ${status}` });
            }
        }

        if (deadline !== undefined) {
            const finalDeadline = deadline === '' ? null : deadline;
            if (finalDeadline !== current.deadline) {
                updates.push("deadline = ?"), values.push(finalDeadline);
                historyItems.push({ action: "Deadline updated", details: `${current.deadline} -> ${finalDeadline}` });
            }
        }
        if (updates.length > 0) {
            values.push(ticketID);
            await connection.execute(`UPDATE Ticket SET ${updates.join(", ")} WHERE id = ?`, values);
        }

        if (categories !== undefined) {
            await connection.execute("DELETE FROM TicketCategory WHERE ticketID = ?", [ticketID]);
            if (categories.length > 0) {
                const catValues = categories.map(cat => [ticketID, cat]);
                await connection.query("INSERT INTO TicketCategory (ticketID, category) VALUES ?", [catValues]);
            }
            historyItems.push({ action: "Categories updated", details: `${categories}` });
        }

        if (assigneeEmail !== undefined) {
            await connection.execute("DELETE FROM TicketAssignee WHERE ticketID = ?", [ticketID]);
            if (assigneeEmail.length > 0) {
                const assValues = assigneeEmail.map(ae => [ticketID, ae]);
                await connection.query("INSERT INTO TicketAssignee (ticketID, assigneeEmail) VALUES ?", [assValues]);
            }
            historyItems.push({ action: "Assignees updated", details: `${assigneeEmail}` });
        }

        await logHistory(connection, ticketID, email, historyItems);

        let followers = [];
        if (shouldNotifyNew) {
            const [requestLinks] = await connection.execute(
                `SELECT ur.userEmail, ur.tracking_token 
                 FROM UserRequest ur 
                 JOIN TicketUserRequest tur ON ur.id = tur.userRequestID 
                 WHERE tur.ticketID = ?`,
                [ticketID]
            );
            followers = requestLinks;
        }

        await connection.commit();

        if (shouldNotifyNew) {
            for (const req of followers) {
                if (req.tracking_token) {
                    sendStatusUpdateEmail(req.userEmail, current.title, "Active (New)", req.tracking_token)
                        .catch(err => console.error("Update email failed:", err));
                }
            }
        }

        response.json({ message: "Ticket updated successfully", changes: historyItems.length });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Critical Update Error:", error);
        response.status(500).json({
            error: "Internal server error during update",
            message: error.message
        });
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


// Merge multiple Tickets into one
router.post("/merge", async (request, response) => {
    const { draftTicketIDs, title, summary, categories, suggestedSolutions, deadline, assigneeEmails } = request.body;

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

        // 3. Assign multiple assignees if provided
        if (assigneeEmails && Array.isArray(assigneeEmails)) {
            for (const email of assigneeEmails) {
                await connection.execute("INSERT INTO TicketAssignee (ticketID, assigneeEmail) VALUES (?, ?)", [mergedID, email]);
            }
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
        const [drafts] = await mysqlConnection.execute("SELECT id, title, summary FROM Ticket WHERE status = 'draft'");

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

export default router;