export const logHistory = async (connection, ticketID, performer, historyItems) => {
    // 3. Map validated data to SQL values
    const values = historyItems.map(item => [
        ticketID,
        item.action,
        performer,
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