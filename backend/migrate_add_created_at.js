
import mysqlConnection from './utils/mysqlConnection.js';

async function migrate() {
    let connection;
    try {
        connection = await mysqlConnection.getConnection();
        console.log("Checking for 'createdAt' column in UserRequest...");

        const [columns] = await connection.execute("SHOW COLUMNS FROM UserRequest LIKE 'createdAt'");

        if (columns.length === 0) {
            console.log("Adding 'createdAt' column to UserRequest...");
            await connection.execute("ALTER TABLE UserRequest ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP");
            console.log("Migration successful: Added 'createdAt' to UserRequest.");
        } else {
            console.log("'createdAt' column already exists in UserRequest. Skipping.");
        }

    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

migrate();
