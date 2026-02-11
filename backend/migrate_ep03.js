import mysqlConnection from './utils/mysqlConnection.js';

async function migrate() {
    const connection = await mysqlConnection.getConnection();
    try {
        console.log("Running EP03 Migrations...");
        await connection.beginTransaction();

        // 1. Specialists Table
        console.log("Creating Specialists table...");
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Specialists (
                id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(128) NOT NULL,
                email VARCHAR(128) NOT NULL UNIQUE,
                expertise VARCHAR(256),
                contact VARCHAR(64)
            )
        `);

        // 2. Add deadline and assigneeID to NewTicket
        console.log("Updating NewTicket table columns...");
        try {
            await connection.execute("ALTER TABLE NewTicket ADD COLUMN deadline DATETIME;");
        } catch (e) { if (e.code !== 'ER_DUP_COLUMN_NAME') throw e; }

        try {
            await connection.execute("ALTER TABLE NewTicket ADD COLUMN assigneeID INT;");
        } catch (e) { if (e.code !== 'ER_DUP_COLUMN_NAME') throw e; }

        // 3. TicketComments Table
        console.log("Creating TicketComments table...");
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS TicketComments (
                id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
                ticketID INT NOT NULL,
                authorEmail VARCHAR(64) NOT NULL,
                text VARCHAR(2048) NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticketID) REFERENCES NewTicket(id) ON DELETE CASCADE
            )
        `);

        // 4. TicketHistory Table
        console.log("Creating TicketHistory table...");
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS TicketHistory (
                id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
                ticketID INT NOT NULL,
                action VARCHAR(128) NOT NULL,
                performedBy VARCHAR(64) NOT NULL,
                details VARCHAR(2048),
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticketID) REFERENCES NewTicket(id) ON DELETE CASCADE
            )
        `);

        // 5. Seed initial specialists data
        console.log("Seeding specialists...");
        const specialists = [
            ['IT Support', 'it@example.com', 'General IT, Hardware, Network'],
            ['HR Relations', 'hr@example.com', 'Human Resources, Workplace Policy'],
            ['Billing Department', 'billing@example.com', 'Invoices, Payments, Refunds'],
            ['Technical Specialist', 'tech@example.com', 'Software Bugs, API Integration']
        ];
        for (const s of specialists) {
            await connection.execute(
                "INSERT IGNORE INTO Specialists (name, email, expertise) VALUES (?, ?, ?)",
                s
            );
        }

        await connection.commit();
        console.log("✅ EP03 Migrations completed successfully.");
    } catch (error) {
        await connection.rollback();
        console.error("❌ EP03 Migration failed:", error);
    } finally {
        connection.release();
        process.exit();
    }
}

migrate();
