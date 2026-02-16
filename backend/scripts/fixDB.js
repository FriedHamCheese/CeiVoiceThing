import mysqlConnection from '../utils/mysqlConnection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initializeDatabaseCheck = async () => {
    const connection = await mysqlConnection.getConnection();

    try {
        // Check if Users table exists
        const [tables] = await connection.execute(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users'"
        );

        if (tables.length === 0) {
            console.log('🗄️  Database tables not found. Running setup.sql...');

            const setupPath = path.join(__dirname, '..', '..', 'database', 'setup.sql');
            const setupSQL = fs.readFileSync(setupPath, 'utf-8');

            // Split by semicolon and execute each statement
            const statements = setupSQL.split(';').filter(stmt => stmt.trim());

            for (const statement of statements) {
                if (statement.trim()) {
                    try {
                        await connection.execute(statement);
                    } catch (err) {
                        // Skip comments and other non-executable lines
                        if (!statement.includes('/*') && !statement.includes('--')) {
                            console.warn('Skipped statement:', statement.substring(0, 50), '...');
                        }
                    }
                }
            }

            console.log('Database initialized successfully');
        } else {
            console.log('Database tables already exist');

            // Check for missing columns and add them if needed
            await ensureColumns(connection);

            // Ensure all junction tables exist
            await ensureJunctionTables(connection);
        }
    } catch (error) {
        console.error('Database initialization error:', error.message);
        throw error;
    } finally {
        connection.release();
    }
};

const ensureColumns = async (connection) => {
    try {
        // Check and add missing columns to Users table
        const [userCols] = await connection.execute(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'name'"
        );

        if (userCols.length === 0) {
            console.log('Adding missing column: Users.name');
            await connection.execute(
                'ALTER TABLE Users ADD COLUMN name VARCHAR(128) AFTER email'
            );
        }

        // Check and add missing columns to UserRequest table
        const [userReqCols] = await connection.execute(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'UserRequest' AND COLUMN_NAME IN ('tracking_token', 'createdAt')"
        );

        if (userReqCols.length < 2) {
            const existingCols = userReqCols.map(col => col.COLUMN_NAME);
            if (!existingCols.includes('tracking_token')) {
                console.log('Adding missing column: UserRequest.tracking_token');
                await connection.execute(
                    'ALTER TABLE UserRequest ADD COLUMN tracking_token VARCHAR(64) UNIQUE AFTER requestContents'
                );
            }
            if (!existingCols.includes('createdAt')) {
                console.log('Adding missing column: UserRequest.createdAt');
                await connection.execute(
                    'ALTER TABLE UserRequest ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP AFTER tracking_token'
                );
            }
        }

        // Check and add missing columns to Ticket table
        const [ticketCols] = await connection.execute(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Ticket' AND COLUMN_NAME IN ('deadline', 'createdAt', 'updatedAt')"
        );

        if (ticketCols.length < 3) {
            const existingCols = ticketCols.map(col => col.COLUMN_NAME);
            if (!existingCols.includes('deadline')) {
                console.log('Adding missing column: Ticket.deadline');
                await connection.execute(
                    'ALTER TABLE Ticket ADD COLUMN deadline DATETIME AFTER status'
                );
            }
            if (!existingCols.includes('createdAt')) {
                console.log('Adding missing column: Ticket.createdAt');
                await connection.execute(
                    'ALTER TABLE Ticket ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP AFTER deadline'
                );
            }
            if (!existingCols.includes('updatedAt')) {
                console.log('Adding missing column: Ticket.updatedAt');
                await connection.execute(
                    'ALTER TABLE Ticket ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER createdAt'
                );
            }
        }

        console.log('Schema validation complete');
    } catch (error) {
        console.error('Schema validation warning:', error.message);
    }
};

const ensureJunctionTables = async (connection) => {
    try {
        const junctionTableQueries = [
            `CREATE TABLE IF NOT EXISTS TicketAssignee(
                ticketID INT NOT NULL,
                assigneeEmail VARCHAR(64) NOT NULL,
                FOREIGN KEY (ticketID) REFERENCES Ticket(id) ON DELETE CASCADE,
                FOREIGN KEY (assigneeEmail) REFERENCES Users(email) ON DELETE CASCADE,
                PRIMARY KEY (ticketID, assigneeEmail)
            )`,
            `CREATE TABLE IF NOT EXISTS TicketFollower(
                ticketID INT NOT NULL,
                userEmail VARCHAR(64) NOT NULL,
                FOREIGN KEY (ticketID) REFERENCES Ticket(id) ON DELETE CASCADE,
                FOREIGN KEY (userEmail) REFERENCES Users(email) ON DELETE CASCADE,
                PRIMARY KEY (ticketID, userEmail)
            )`,
            `CREATE TABLE IF NOT EXISTS TicketCategory(
                ticketID INT NOT NULL,
                category VARCHAR(32) NOT NULL,
                FOREIGN KEY (ticketID) REFERENCES Ticket(id) ON DELETE CASCADE,
                PRIMARY KEY (ticketID, category)
            )`,
            `CREATE TABLE IF NOT EXISTS TicketUserRequest(
                ticketID INT NOT NULL,
                userRequestID INT NOT NULL,
                FOREIGN KEY (ticketID) REFERENCES Ticket(id) ON DELETE CASCADE,
                FOREIGN KEY (userRequestID) REFERENCES UserRequest(id) ON DELETE CASCADE,
                PRIMARY KEY (ticketID, userRequestID)
            )`,
            `CREATE TABLE IF NOT EXISTS TicketComments(
                id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
                ticketID INT NOT NULL,
                authorEmail VARCHAR(64) NOT NULL,
                text VARCHAR(2048) NOT NULL,
                isInternal BOOLEAN DEFAULT FALSE,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticketID) REFERENCES Ticket(id) ON DELETE CASCADE,
                FOREIGN KEY (authorEmail) REFERENCES Users(email) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS TicketHistory(
                id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
                ticketID INT NOT NULL,
                action VARCHAR(128) NOT NULL,
                performedBy VARCHAR(64) NOT NULL,
                details VARCHAR(2048),
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticketID) REFERENCES Ticket(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS SpecialistProfile(
                userEmail VARCHAR(64) NOT NULL PRIMARY KEY,
                contact VARCHAR(64),
                FOREIGN KEY (userEmail) REFERENCES Users(email) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS SpecialistScope(
                userEmail VARCHAR(64) NOT NULL,
                scopeTag VARCHAR(64) NOT NULL,
                FOREIGN KEY (userEmail) REFERENCES Users(email) ON DELETE CASCADE,
                PRIMARY KEY (userEmail, scopeTag)
            )`
        ];

        for (const query of junctionTableQueries) {
            try {
                await connection.execute(query);
            } catch (err) {
                if (err.message.includes('already exists')) {
                    // Table already exists, skip it
                } else {
                    throw err;
                }
            }
        }

        console.log('Junction tables validation complete');
    } catch (error) {
        console.error('Junction tables validation warning:', error.message);
    }
};

export default initializeDatabaseCheck;