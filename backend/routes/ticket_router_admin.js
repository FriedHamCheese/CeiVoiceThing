import mysqlConnection from '../utils/mysqlConnection.js';
import express from 'express';

const router = express.Router();

// Fetch all tickets for Admin dashboard
router.get('/', async (request, response) => {
    try {
        const [drafts] = await mysqlConnection.execute("SELECT *, 'draft' as type FROM DraftTicket");
        const [news] = await mysqlConnection.execute("SELECT *, 'new' as type FROM NewTicket");
        response.status(200).json({ tickets: [...drafts, ...news] });
    } catch (error) {
        response.status(500).json({ message: "Failed to fetch tickets." });
    }
});

// Convert Draft to New Ticket
router.post('/toNewTicket', async (request, response) => {
    const { ticketID } = request.body;
    if (typeof ticketID !== 'number') return response.status(400).json({ message: 'Invalid ticketID.' });

    let connection;
    try {
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();

        const [drafts] = await connection.execute("SELECT * FROM DraftTicket WHERE id = ?", [ticketID]);
        if (drafts.length === 0) throw new Error("Draft not found");

        const draft = drafts[0];

        // 1. Create New Ticket
        const [newTicket] = await connection.execute(
            "INSERT INTO NewTicket (title, requestContents, suggestedSolutions) VALUES (?, ?, ?)",
            [draft.title, draft.summary, draft.suggestedSolutions]
        );
        const newID = newTicket.insertId;

        // 2. Move Followers (UserRequests) - ADDED DISTINCT HERE
        const [requests] = await connection.execute(
            `SELECT DISTINCT ur.userEmail 
             FROM UserRequest ur 
             JOIN DraftTicketUserRequest dtur ON ur.id = dtur.userRequestID 
             WHERE dtur.draftTicketID = ?`,
            [ticketID]
        );

        // Bulk insert is more efficient than a loop
        if (requests.length > 0) {
            const values = requests.map(req => [newID, req.userEmail]);
            await connection.query(
                "INSERT INTO NewTicketFollower (newTicketID, userEmail) VALUES ?",
                [values]
            );
        }

        // 3. Move Categories
        await connection.execute(
            "INSERT INTO NewTicketCategory (newTicketID, category) SELECT ?, category FROM DraftTicketCategory WHERE draftTicketID = ?",
            [newID, ticketID]
        );

        // 4. Cleanup Draft
        await connection.execute("DELETE FROM DraftTicketUserRequest WHERE draftTicketID = ?", [ticketID]);
        await connection.execute("DELETE FROM DraftTicketCategory WHERE draftTicketID = ?", [ticketID]);
        await connection.execute("DELETE FROM DraftTicket WHERE id = ?", [ticketID]);

        await connection.commit();
        response.status(200).json({ message: 'Promoted to New Ticket.', newTicketID: newID });
    } catch (error) {
        if (connection) await connection.rollback();
        response.status(500).json({ message: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// Merge multiple Drafts into one
router.post("/merge", async (request, response) => {
    const { draftTicketIDs, title, summary, categories, suggestedSolutions } = request.body;

    if (!Array.isArray(draftTicketIDs) || draftTicketIDs.length === 0) {
        return response.status(400).json({ error: "Invalid IDs array." });
    }

    let connection;
    try {
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();

        // 1. Create Merged Draft
        const [inserted] = await connection.execute(
            "INSERT INTO DraftTicket (title, summary, suggestedSolutions) VALUES (?, ?, ?)",
            [title.trim(), summary.trim(), suggestedSolutions.trim()]
        );
        const mergedID = inserted.insertId;

        // 2. Re-link User Requests from old drafts to new one
        // Note: Using ? with an array in mysql2 requires specific syntax or manual expansion
        for (const oldID of draftTicketIDs) {
            await connection.execute("UPDATE DraftTicketUserRequest SET draftTicketID = ? WHERE draftTicketID = ?", [mergedID, oldID]);
            await connection.execute("DELETE FROM DraftTicketCategory WHERE draftTicketID = ?", [oldID]);
            await connection.execute("DELETE FROM DraftTicket WHERE id = ?", [oldID]);
        }

        // 3. Insert new unique categories
        const uniqueCategories = [...new Set(categories)];
        for (const cat of uniqueCategories) {
            await connection.execute("INSERT INTO DraftTicketCategory (category, draftTicketID) VALUES (?, ?)", [cat, mergedID]);
        }

        await connection.commit();
        response.status(200).json({ message: "Tickets merged successfully." });
    } catch (error) {
        if (connection) await connection.rollback();
        response.status(500).json({ error: "Merge failed." });
    } finally {
        if (connection) connection.release();
    }
});

export default router;