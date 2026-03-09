import express from 'express';
import mysqlConnection from '../utils/mysqlConnection.js';
import { z } from 'zod';
import { sendStatusUpdateEmail, sendAssignmentNotificationEmail } from '../utils/email.js';

const router = express.Router();
import { validateRequest } from '../middleware/validate.js';
import { historyBatchSchema, ticketUpdateSchema, getHistorySchema } from '../schemas/ticketRouter.assignee.schema.js';

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



router.patch('/:id', validateRequest(ticketUpdateSchema), async (request, response) => {
    const email = request.user.email;
    const ticketID = request.params.id;

    // Destructure only the fields we care about
    const { assigneeEmail, status, resolutionComment } = request.body;
    let connection;
    try {
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();

        let [currentStatus] = await connection.execute("SELECT status FROM Ticket WHERE id = ?", [ticketID]);
        let [currentResolutionComment] = await connection.execute("SELECT resolutionComment FROM Ticket WHERE id = ?", [ticketID]);
        let [currentAssigneeEmail] = await connection.execute("SELECT assigneeEmail FROM TicketAssignee WHERE ticketID = ?", [ticketID]);


        // 2. Fetch current record for history comparison
        const [rows] = await connection.execute("SELECT title, status, resolutionComment FROM Ticket WHERE id = ?", [ticketID]);
        if (rows.length === 0) {
            await connection.rollback();
            return response.status(404).json({ error: "Ticket not found" });
        }
        const current = rows[0];

        const updates = [];
        const values = [];
        const historyItems = [];

        let shouldNotifySolved = false;
        let shouldNotifyFailed = false;
        let newAssigneesToNotify = [];

        // 3. Logic for Status & Resolution Comment
        // Validation: Required comment for Solved/Failed
        if (status !== undefined && (status === 'Solved' || status === 'Failed')) {
            if (!resolutionComment || resolutionComment.trim() === "") {
                await connection.rollback();
                return response.status(400).json({ error: `Resolution comment is required for status: ${status}.` });
            }
        }

        if (status !== undefined && status !== current.status) {
            updates.push("status = ?");
            values.push(status);

            if (status === 'Solved') {
                historyItems.push({ action: "Solved", details: "Ticket solved" });
                shouldNotifySolved = true;
            } else if (status === 'Failed') {
                historyItems.push({ action: "Failed", details: "Ticket failed" });
                shouldNotifyFailed = true;
            } else {
                historyItems.push({ action: "Status updated", details: `${current.status} -> ${status}` });
            }
        }

        if (resolutionComment !== undefined && resolutionComment !== current.resolutionComment) {
            updates.push("resolutionComment = ?");
            // If it's undefined, we pass null to SQL, otherwise the string
            values.push(resolutionComment ?? null);
            historyItems.push({ action: "Resolution updated", details: resolutionComment || "Cleared" });
        }

        // Apply updates to the main Ticket table
        if (updates.length > 0) {
            values.push(ticketID); // Add ID for the WHERE clause
            await connection.execute(`UPDATE Ticket SET ${updates.join(", ")} WHERE id = ?`, values);
        }

        // 4. Handle Assignee List (The Junction Table)
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

        // 5. Finalize
        if (historyItems.length > 0) {
            await logHistory(connection, ticketID, email, historyItems);
        }

        let followers = [];
        if (shouldNotifySolved || shouldNotifyFailed) {
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
            const frontendUrl = process.env.FRONTEND_URL || `http://localhost:${process.env.FRONTEND_PORT || 5501}`;
            const link = `${frontendUrl}/`;
            const displayTitle = current.title;
            for (const assignee of newAssigneesToNotify) {
                if (assignee !== email) {
                    sendAssignmentNotificationEmail(assignee, displayTitle, email, link)
                        .catch(err => console.error("Assignment email failed:", err));
                }
            }
        }

        response.json({
            message: "Ticket updated successfully",
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("SQL Error:", error);
        response.status(500).json({ error: "Internal server error", message: error.message });
    } finally {
        if (connection) connection.release();
    }
});

router.get('/:id/history', validateRequest(getHistorySchema), async (request, response) => {
    try {
        const [rows] = await mysqlConnection.execute("SELECT * FROM TicketHistory WHERE ticketID = ? ORDER BY timestamp DESC", [request.params.id]);
        response.json(rows);
    } catch (error) {
        response.status(500).json({ error: "Failed to fetch history" });
    }
});

export default router;
