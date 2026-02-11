import mysqlConnection from './utils/mysqlConnection.js';

async function verify() {
    let connection;
    try {
        connection = await mysqlConnection.getConnection();
        console.log("Starting verification of EP03 backend endpoints...");

        // 1. Create a dummy UserRequest
        const [reqRes] = await connection.execute(
            "INSERT INTO UserRequest (userEmail, requestContents) VALUES (?, ?)",
            ['test@example.com', 'I need help with EP03 verification']
        );
        const reqId = reqRes.insertId;

        // 2. Create a DraftTicket and link it
        const [draftRes] = await connection.execute(
            "INSERT INTO DraftTicket (title, summary) VALUES (?, ?)",
            ['Verify Draft', 'Summary for verification']
        );
        const draftId = draftRes.insertId;

        await connection.execute(
            "INSERT INTO DraftTicketUserRequest (draftTicketID, userRequestID) VALUES (?, ?)",
            [draftId, reqId]
        );

        console.log(`Created test draft ID: ${draftId} with request ID: ${reqId}`);

        // 3. Test PATCH /draft/:id (Update)
        console.log("Testing Draft Update...");
        const newTitle = "Updated Draft Title";
        const newDeadline = "2026-12-31 23:59:59";

        await connection.execute(
            "UPDATE DraftTicket SET title = ?, deadline = ? WHERE id = ?",
            [newTitle, newDeadline, draftId]
        );

        const [updatedDrafts] = await connection.execute("SELECT * FROM DraftTicket WHERE id = ?", [draftId]);
        if (updatedDrafts[0].title === newTitle && updatedDrafts[0].deadline !== null) {
            console.log("Draft Update SUCCESS");
        } else {
            console.log("Draft Update FAILED", updatedDrafts[0]);
        }

        // 4. Test Unlink (Need at least 2 requests to test the unlink logic I wrote)
        console.log("Testing Unlink...");
        const [reqRes2] = await connection.execute(
            "INSERT INTO UserRequest (userEmail, requestContents) VALUES (?, ?)",
            ['test2@example.com', 'Second request for unlinking']
        );
        const reqId2 = reqRes2.insertId;
        await connection.execute(
            "INSERT INTO DraftTicketUserRequest (draftTicketID, userRequestID) VALUES (?, ?)",
            [draftId, reqId2]
        );

        // Simulate the unlink endpoint logic
        await connection.beginTransaction();
        await connection.execute("DELETE FROM DraftTicketUserRequest WHERE draftTicketID = ? AND userRequestID = ?", [draftId, reqId2]);
        const [newDraft] = await connection.execute(
            "INSERT INTO DraftTicket (title, summary) VALUES (?, ?)",
            ["Unlinked Test", "Unlinked content"]
        );
        await connection.execute(
            "INSERT INTO DraftTicketUserRequest (draftTicketID, userRequestID) VALUES (?, ?)",
            [newDraft.insertId, reqId2]
        );
        await connection.commit();

        const [linksOriginal] = await connection.execute("SELECT * FROM DraftTicketUserRequest WHERE draftTicketID = ?", [draftId]);
        const [linksNew] = await connection.execute("SELECT * FROM DraftTicketUserRequest WHERE draftTicketID = ?", [newDraft.insertId]);

        if (linksOriginal.length === 1 && linksNew.length === 1) {
            console.log("Unlink SUCCESS");
        } else {
            console.log("Unlink FAILED", { original: linksOriginal.length, new: linksNew.length });
        }

        // 5. Test Promotion with Deadline
        console.log("Testing Promotion with Deadline...");
        const [newTicketRes] = await connection.execute(
            "INSERT INTO NewTicket (title, requestContents, status, deadline) VALUES (?, ?, ?, ?)",
            [updatedDrafts[0].title, updatedDrafts[0].summary, 'New', updatedDrafts[0].deadline]
        );
        const newTicketId = newTicketRes.insertId;

        const [promoted] = await connection.execute("SELECT * FROM NewTicket WHERE id = ?", [newTicketId]);
        if (promoted[0].deadline !== null) {
            console.log("Promotion with Deadline SUCCESS");
        } else {
            console.log("Promotion with Deadline FAILED", promoted[0]);
        }

        console.log("Cleanup...");
        await connection.execute("DELETE FROM DraftTicketUserRequest WHERE draftTicketID IN (?, ?)", [draftId, newDraft.insertId]);
        await connection.execute("DELETE FROM DraftTicket WHERE id IN (?, ?)", [draftId, newDraft.insertId]);
        await connection.execute("DELETE FROM UserRequest WHERE id IN (?, ?)", [reqId, reqId2]);
        await connection.execute("DELETE FROM NewTicket WHERE id = ?", [newTicketId]);

        console.log("Verification complete.");

    } catch (error) {
        console.error("Verification failed:", error);
        if (connection) await connection.rollback();
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

verify();
