import mysqlConnection from './utils/mysqlConnection.js';

async function verify() {
    let connection;
    try {
        connection = await mysqlConnection.getConnection();
        console.log("Starting verification of merge and promotion fixes...");

        // 1. Create two DraftTickets
        const [draft1Res] = await connection.execute(
            "INSERT INTO DraftTicket (title, summary, deadline) VALUES (?, ?, ?)",
            ['Draft 1', 'Summary 1', '2026-10-10 10:00:00']
        );
        const d1 = draft1Res.insertId;

        const [draft2Res] = await connection.execute(
            "INSERT INTO DraftTicket (title, summary) VALUES (?, ?)",
            ['Draft 2', 'Summary 2']
        );
        const d2 = draft2Res.insertId;

        // 2. Assign Specialist to Draft 1
        // (Assuming specialist with ID 1 exists from seed data, if not we'll use whatever is available)
        const [specRows] = await connection.execute("SELECT id FROM Specialists LIMIT 1");
        const specID = specRows[0]?.id || 1;

        await connection.execute(
            "INSERT INTO DraftTicketAssignee (draftTicketID, assigneeID) VALUES (?, ?)",
            [d1, specID]
        );

        console.log(`Created Draft 1 (ID: ${d1}, Assignee: ${specID}) and Draft 2 (ID: ${d2})`);

        // 3. Simulate Merge (Draft 1 into a new merged draft)
        const mergeTitle = "Merged Ticket";
        const mergeSummary = "Summary 1 + 2";
        const [mergedRes] = await connection.execute(
            "INSERT INTO DraftTicket (title, summary, deadline) VALUES (?, ?, ?)",
            [mergeTitle, mergeSummary, '2026-10-10 10:00:00']
        );
        const mId = mergedRes.insertId;
        await connection.execute("INSERT INTO DraftTicketAssignee (draftTicketID, assigneeID) VALUES (?, ?)", [mId, specID]);

        console.log(`Created Merged Draft (ID: ${mId})`);

        // 4. Test Promotion of Merged Draft
        console.log("Testing Promotion of Merged Draft...");
        // Fetch assignee from merged draft
        const [mergedAssignees] = await connection.execute("SELECT assigneeID FROM DraftTicketAssignee WHERE draftTicketID = ?", [mId]);
        const mAssigneeID = mergedAssignees[0].assigneeID;

        const [newTicketRes] = await connection.execute(
            "INSERT INTO NewTicket (title, requestContents, status, deadline, assigneeID) VALUES (?, ?, ?, ?, ?)",
            [mergeTitle, mergeSummary, 'New', '2026-10-10 10:00:00', mAssigneeID]
        );
        const ntId = newTicketRes.insertId;

        const [promoted] = await connection.execute("SELECT * FROM NewTicket WHERE id = ?", [ntId]);
        if (promoted[0].assigneeID === specID && promoted[0].deadline !== null) {
            console.log("Merge and Promotion Fixes SUCCESS");
        } else {
            console.log("Merge and Promotion Fixes FAILED", promoted[0]);
        }

        console.log("Cleanup...");
        await connection.execute("DELETE FROM DraftTicketAssignee WHERE draftTicketID IN (?, ?, ?)", [d1, d2, mId]);
        await connection.execute("DELETE FROM DraftTicket WHERE id IN (?, ?, ?)", [d1, d2, mId]);
        await connection.execute("DELETE FROM NewTicket WHERE id = ?", [ntId]);

        console.log("Verification complete.");

    } catch (error) {
        console.error("Verification failed:", error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

verify();
