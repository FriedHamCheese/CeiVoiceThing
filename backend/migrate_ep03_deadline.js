import mysqlConnection from './utils/mysqlConnection.js';

async function migrate() {
    let connection;
    try {
        connection = await mysqlConnection.getConnection();
        console.log("Checking for 'deadline' column in DraftTicket...");

        const [columns] = await connection.execute("SHOW COLUMNS FROM DraftTicket LIKE 'deadline'");

        if (columns.length === 0) {
            console.log("Adding 'deadline' column to DraftTicket...");
            await connection.execute("ALTER TABLE DraftTicket ADD COLUMN deadline DATETIME DEFAULT NULL");
            console.log("Migration successful.");
        } else {
            console.log("'deadline' column already exists. Skipping.");
        }

    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

migrate();
