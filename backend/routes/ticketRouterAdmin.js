import mysqlConnection from '../utils/mysqlConnection.js';
import express from 'express';
import { z } from 'zod';
import { sendStatusUpdateEmail, sendAssignmentNotificationEmail } from '../utils/email.js';
import { findMergeRecommendations } from '../utils/ticketOpenAI.js';
const router = express.Router();

const historySchema = z.object({
    ticketID: z.number().min(1),
    action: z.string().min(1),
    performer: z.email().min(1),
    details: z.string().min(1)
});

// Create a schema for the array of history items
const historyBatchSchema = z.array(historySchema);

const logHistory = async (connection, ticketID, userEmail, historyItems) => {
    // 1. Prepare the data for validation
    const dataToValidate = historyItems.map(item => ({
        ticketID: parseInt(ticketID),
        action: String(item.action),
        performer: String(userEmail),
        details: String(item.details)
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
    status: z.string().optional(),
    resolutionComment: z.string().optional(),
});

router.patch('/:id', async (request, response) => {
    const email = request.user.email;
    const ticketID = request.params.id;

    // 1. Validate Input
    const parsed = ticketUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
        return response.status(400).json({
            error: "Validation failed",
            details: parsed.error.issues
        });
    }

    const { title, summary, solution, deadline, categories, assigneeEmail, status, resolutionComment } = parsed.data;
    let connection;

    try {
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();

        let [currentStatus] = await connection.execute("SELECT status FROM Ticket WHERE id = ?", [ticketID]);
        let [currentResolutionComment] = await connection.execute("SELECT resolutionComment FROM Ticket WHERE id = ?", [ticketID]);
        let [currentAssigneeEmail] = await connection.execute("SELECT assigneeEmail FROM TicketAssignee WHERE ticketID = ?", [ticketID]);

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

        if (status !== undefined && (status === 'Solved' || status === 'Failed')) {
            if (!resolutionComment || resolutionComment.trim() === "") {
                await connection.rollback();
                return response.status(400).json({ error: `Resolution comment is required when setting status to ${status}.` });
            }
        }

        let shouldNotifyNew = false;
        let shouldNotifySolved = false;
        let shouldNotifyFailed = false;
        let newAssigneesToNotify = [];

        if (status !== undefined && status !== current.status) {
            updates.push("status = ?"), values.push(status);
            if (resolutionComment) {
                updates.push("resolutionComment = ?"), values.push(resolutionComment);
            }

            if (current.status === 'draft' && status === 'New') {
                historyItems.push({ action: "Promoted", details: "Ticket promoted from draft" });
                shouldNotifyNew = true;
            }
            else if (status === 'Solved') {
                historyItems.push({ action: "Solved", details: "Ticket solved" });
                shouldNotifySolved = true;
            }
            else if (status === 'Failed') {
                historyItems.push({ action: "Failed", details: "Ticket failed" });
                shouldNotifyFailed = true;
            }
            else {
                let details = `${current.status} -> ${status}`;
                if (resolutionComment) details += `. Resolution: ${resolutionComment}`;
                historyItems.push({ action: "Status updated", details: details });
            }
        } else if (resolutionComment !== undefined && resolutionComment !== current.resolutionComment) {
            // Case where status didn't change but comment was updated (maybe? or just allow it)
            updates.push("resolutionComment = ?"), values.push(resolutionComment);
            historyItems.push({ action: "Resolution comment updated", details: resolutionComment });
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
            const oldAssigneeEmails = currentAssigneeEmail.map(a => a.assigneeEmail);
            newAssigneesToNotify = assigneeEmail.filter(e => !oldAssigneeEmails.includes(e));

            // 1. Clear existing assignees
            await connection.execute(
                "DELETE FROM TicketAssignee WHERE ticketID = ?",
                [ticketID]
            );
            // 2. Insert new assignees
            if (Array.isArray(assigneeEmail) && assigneeEmail.length > 0) {
                const assValues = assigneeEmail.map(ae =>
                    connection.execute(
                        "INSERT INTO TicketAssignee (ticketID, assigneeEmail) VALUES (?, ?)",
                        [ticketID, ae]
                    )
                );
                await Promise.all(assValues);
            }

            historyItems.push({
                action: "Assignees updated",
                details: `${currentAssigneeEmail.length > 0 ? currentAssigneeEmail.map(ae => ae.assigneeEmail).join(", ") : "No assignees"} -> ${assigneeEmail.length > 0 ? assigneeEmail.join(", ") : "No assignees"}`
            });
        }

        await logHistory(connection, ticketID, email, historyItems);

        let followers = [];
        if (shouldNotifyNew || shouldNotifySolved || shouldNotifyFailed) {
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

        if (shouldNotifySolved) {
            for (const req of followers) {
                if (req.tracking_token) {
                    sendStatusUpdateEmail(req.userEmail, current.title, "Solved", req.tracking_token)
                        .catch(err => console.error("Update email failed:", err));
                }
            }
        }

        if (shouldNotifyFailed) {
            for (const req of followers) {
                if (req.tracking_token) {
                    sendStatusUpdateEmail(req.userEmail, current.title, "Failed", req.tracking_token)
                        .catch(err => console.error("Update email failed:", err));
                }
            }
        }

        // Send Assignment Notifications
        if (newAssigneesToNotify.length > 0) {
            const link = `http://localhost:${process.env.FRONTEND_PORT}/`;
            const displayTitle = title !== undefined ? title : current.title;
            for (const assignee of newAssigneesToNotify) {
                if (assignee !== email) {
                    sendAssignmentNotificationEmail(assignee, displayTitle, email, link)
                        .catch(err => console.error("Assignment email failed:", err));
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

// Unlink a UserRequest from a Ticket (now updating mergedTo and status)
// Unlink a UserRequest from a Ticket (now updating mergedTo and status)
router.post('/:parentTicketId/unlink/:childUserRequestID', async (request, response) => {
    const { childUserRequestID, parentTicketId } = request.params;
    const email = request.user.email;
    let connection;

    try {
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();

        // 1. Get the specific child ticket ID requested by the user
        const [childTickets] = await connection.execute(
            `SELECT id FROM Ticket WHERE userRequestID = ? AND mergedTo = ?`,
            [childUserRequestID, parentTicketId]
        );

        if (childTickets.length === 0) {
            await connection.rollback();
            return response.status(404).json({ error: "UserRequest not found or not linked to this parent." });
        }
        const childTicketID = childTickets[0].id;

        // 2. Unlink the specific child ticket
        await connection.execute(
            `UPDATE Ticket SET mergedTo = NULL, status = 'draft' WHERE id = ?`,
            [childTicketID]
        );

        await logHistory(connection, childTicketID, email, [{
            action: "Status updated",
            details: `merged -> draft (Unlinked from parent ticket #${parentTicketId})`
        }]);

        // 3. Update Mapping Table for the unlinked child
        await connection.execute(
            `UPDATE TicketUserRequest SET ticketID = ? WHERE userRequestID = ?`,
            [childTicketID, childUserRequestID]
        );

        // ==================================================================================
        // NEW LOGIC: Check if the Parent Ticket is now left with only 1 child
        // ==================================================================================

        // Count remaining children in the parent ticket
        const [remainingChildren] = await connection.execute(
            `SELECT id, userRequestID FROM Ticket WHERE mergedTo = ?`,
            [parentTicketId]
        );

        let parentDeleted = false;

        // If only 1 child remains, a "merged" ticket implies at least 2 items.
        // We must dissolve the merge completely.
        if (remainingChildren.length === 1) {
            const lastChild = remainingChildren[0];

            // A. Revert the last remaining child ticket to 'draft' and remove link
            await connection.execute(
                `UPDATE Ticket SET mergedTo = NULL, status = 'draft' WHERE id = ?`,
                [lastChild.id]
            );

            await logHistory(connection, lastChild.id, email, [{
                action: "Status updated",
                details: `merged -> draft (Parent ticket #${parentTicketId} dissolved)`
            }]);

            // B. Fix Mapping Table for this last remaining child
            await connection.execute(
                `UPDATE TicketUserRequest SET ticketID = ? WHERE userRequestID = ?`,
                [lastChild.id, lastChild.userRequestID]
            );

            // C. Delete any followers associated with the Parent Ticket (to prevent FK errors)
            await connection.execute(
                `DELETE FROM TicketFollower WHERE ticketID = ?`,
                [parentTicketId]
            );

            // D. Delete the Parent Merged Ticket itself
            await connection.execute(
                `DELETE FROM Ticket WHERE id = ?`,
                [parentTicketId]
            );

            parentDeleted = true;
        }
        // ==================================================================================


        // 4. ADD Follower (Re-sync) for the ticket user just unlinked
        // (We do this regardless of whether the parent was deleted)
        await connection.execute(
            `INSERT IGNORE INTO TicketFollower (ticketID, userEmail) 
             SELECT (SELECT id FROM Ticket WHERE userRequestID = ?), (SELECT userEmail FROM UserRequest WHERE id = Ticket.userRequestID)
             FROM Ticket WHERE id = (SELECT id FROM Ticket WHERE userRequestID = ?)`,
            [childUserRequestID, childUserRequestID]
        );

        await connection.commit();

        response.json({
            message: parentDeleted
                ? "Ticket unlinked. Parent merged ticket deleted as only one child remained."
                : "Ticket unlinked and followers synchronized."
        });

    } catch (error) {
        if (connection) await connection.rollback();

        // LOGGING SYSTEM
        console.error("Unlink Transaction Failed:", {
            code: error.code,      // e.g., 'ER_DUP_ENTRY'
            errno: error.errno,    // e.g., 1062
            sqlMessage: error.sqlMessage,
            params: { childUserRequestID, parentTicketId }
        });

        // CUSTOM ERROR RESPONSES
        if (error.code === 'ER_BAD_NULL_ERROR') {
            return response.status(400).json({ error: "Requester data is missing for this ticket." });
        }

        response.status(500).json({
            error: "Internal server error.",
            trackId: Date.now()
        });
    } finally {
        if (connection) connection.release();
    }
});


// Merge multiple Tickets into one
router.post("/merge", async (request, response) => {
    const { draftTicketIDs, title, summary, categories, suggestedSolutions, deadline, assigneeEmails } = request.body;
    const email = request.user.email;

    if (!Array.isArray(draftTicketIDs) || draftTicketIDs.length === 0) {
        return response.status(400).json({ error: "Invalid IDs array." });
    }

    let connection;
    try {
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();

        const finalDeadline = deadline || null;
        // 1. Create Merged Ticket
        const [inserted] = await connection.execute(
            "INSERT INTO Ticket (title, summary, solution, deadline, status, mergedTo) VALUES (?, ?, ?, ?, 'draft', NULL)",
            [title.trim(), summary.trim(), suggestedSolutions.trim(), finalDeadline]
        );
        const mergedID = inserted.insertId;

        // Log creation for new merged ticket
        let historyItems = [{
            action: "Ticket created",
            details: `Merged from tickets: ${draftTicketIDs.join(', ')}`
        }];
        if (finalDeadline) {
            historyItems.push({ action: "Deadline updated", details: `null -> ${finalDeadline}` });
        }
        // Will flush after assignments

        // 2. Re-link User Requests and Cleanup old tickets
        for (const oldID of draftTicketIDs) {
            // Move the UserRequest link to the new ticket
            await connection.execute(
                "UPDATE IGNORE TicketUserRequest SET ticketID = ? WHERE ticketID = ?",
                [mergedID, oldID]
            );

            // Mark old ticket as merged
            await connection.execute(
                "UPDATE Ticket SET mergedTo = ?, status = 'merged' WHERE id = ?",
                [mergedID, oldID]
            );

            await logHistory(connection, oldID, email, [{
                action: "Status updated",
                details: `draft -> merged (Merged into ticket #${mergedID})`
            }]);
        }

        // 3. Assign multiple assignees
        let newAssigneesToNotify = [];
        if (assigneeEmails && Array.isArray(assigneeEmails) && assigneeEmails.length > 0) {
            for (const assigneeEmail of assigneeEmails) {
                // Added IGNORE to prevent crashing if user is already assigned
                await connection.execute(
                    "INSERT IGNORE INTO TicketAssignee (ticketID, assigneeEmail) VALUES (?, ?)",
                    [mergedID, assigneeEmail]
                );
            }
            newAssigneesToNotify = assigneeEmails;
            historyItems.push({
                action: "Assignees updated",
                details: `No assignees -> ${assigneeEmails.join(", ")}`
            });
        }

        if (historyItems.length > 0) {
            await logHistory(connection, mergedID, email, historyItems);
        }

        // 4. Insert new unique categories
        if (categories && Array.isArray(categories)) {
            const uniqueCategories = [...new Set(categories)];
            for (const cat of uniqueCategories) {
                await connection.execute(
                    "INSERT INTO TicketCategory (category, ticketID) VALUES (?, ?)",
                    [cat, mergedID]
                );
            }
            if (uniqueCategories.length > 0) {
                await logHistory(connection, mergedID, email, [{
                    action: "Categories updated",
                    details: `${uniqueCategories.join(", ")}`
                }]);
            }
        }

        // ==============================================================================
        // 5. FIX: Insert followers (Optimized)
        // ==============================================================================

        // Create a string of placeholders based on the number of IDs (e.g., "?, ?, ?")
        const placeholders = draftTicketIDs.map(() => '?').join(',');

        // Perform a direct SQL copy. 
        // We select the userEmail from the old tickets and insert them into the new one using the new ID.
        // INSERT IGNORE handles the deduplication automatically.
        if (draftTicketIDs.length > 0) {
            await connection.execute(
                `INSERT IGNORE INTO TicketFollower (ticketID, userEmail)
                 SELECT ?, userEmail 
                 FROM TicketFollower 
                 WHERE ticketID IN (${placeholders})`,
                [mergedID, ...draftTicketIDs]
            );
        }
        // ==============================================================================

        await connection.commit();

        if (newAssigneesToNotify && newAssigneesToNotify.length > 0) {
            const link = `http://localhost:${process.env.FRONTEND_PORT}/`;
            const displayTitle = title.trim();
            for (const assignee of newAssigneesToNotify) {
                if (assignee !== email) {
                    sendAssignmentNotificationEmail(assignee, displayTitle, email, link)
                        .catch(err => console.error("Assignment email failed:", err));
                }
            }
        }

        response.status(200).json({ message: "Tickets merged successfully.", mergedTicketId: mergedID });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Merge Transaction Failed:", error);
        response.status(500).json({ error: "Merge failed." });
    } finally {
        if (connection) connection.release();
    }
});


router.get("/recommend-merges", async (request, response) => {
    try {
        const [drafts] = await mysqlConnection.execute(
            "SELECT id, title, summary FROM Ticket WHERE status = 'draft'"
        );

        // Not enough tickets to compare
        if (drafts.length < 2) return response.json({ recommendations: [] });

        const recommendations = await findMergeRecommendations(drafts, 0.7);

        // Returns: [[1, 5, 12], [3, 8]]
        response.status(200).json({ recommendations });
    } catch (error) {
        console.error("Clustering error:", error);
        response.status(500).json({ error: "Failed to cluster tickets." });
    }
});

export default router;