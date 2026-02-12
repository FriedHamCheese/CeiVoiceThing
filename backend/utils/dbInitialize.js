import mysqlConnection from './mysqlConnection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initializeDatabase = async () => {
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
                            console.warn('⚠️  Skipped statement:', statement.substring(0, 50), '...');
                        }
                    }
                }
            }
            
            console.log('✅ Database initialized successfully');
        } else {
            console.log('✅ Database tables already exist');
            
            // Check for missing columns and add them if needed
            await ensureColumns(connection);
            
            // Ensure all junction tables exist
            await ensureJunctionTables(connection);
        }
    } catch (error) {
        console.error('❌ Database initialization error:', error.message);
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
            console.log('⚠️  Adding missing column: Users.name');
            await connection.execute(
                'ALTER TABLE Users ADD COLUMN name VARCHAR(128) AFTER email'
            );
        }

        // Check and add missing columns to UserRequest table
        const [userReqCols] = await connection.execute(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'UserRequest' AND COLUMN_NAME IN ('tracking_token', 'createdAt')"
        );
        
        if (userReqCols.length < 2) {
            if (userReqCols.length === 0) {
                console.log('⚠️  Adding missing columns to UserRequest: tracking_token, createdAt');
                await connection.execute(
                    'ALTER TABLE UserRequest ADD COLUMN tracking_token VARCHAR(64) UNIQUE AFTER requestContents'
                );
                await connection.execute(
                    'ALTER TABLE UserRequest ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP AFTER tracking_token'
                );
            } else {
                const existingCols = userReqCols.map(col => col.COLUMN_NAME);
                if (!existingCols.includes('tracking_token')) {
                    console.log('⚠️  Adding missing column: UserRequest.tracking_token');
                    await connection.execute(
                        'ALTER TABLE UserRequest ADD COLUMN tracking_token VARCHAR(64) UNIQUE AFTER requestContents'
                    );
                }
                if (!existingCols.includes('createdAt')) {
                    console.log('⚠️  Adding missing column: UserRequest.createdAt');
                    await connection.execute(
                        'ALTER TABLE UserRequest ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP AFTER tracking_token'
                    );
                }
            }
        }

        // Check and add missing columns to DraftTicket table
        const [draftTicketCols] = await connection.execute(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DraftTicket' AND COLUMN_NAME IN ('suggestedAssignee', 'deadline', 'createdAt')"
        );
        
        if (draftTicketCols.length < 3) {
            const existingCols = draftTicketCols.map(col => col.COLUMN_NAME);
            if (!existingCols.includes('suggestedAssignee')) {
                console.log('⚠️  Adding missing column: DraftTicket.suggestedAssignee');
                await connection.execute(
                    'ALTER TABLE DraftTicket ADD COLUMN suggestedAssignee VARCHAR(64) AFTER suggestedSolutions'
                );
            }
            if (!existingCols.includes('deadline')) {
                console.log('⚠️  Adding missing column: DraftTicket.deadline');
                await connection.execute(
                    'ALTER TABLE DraftTicket ADD COLUMN deadline DATETIME AFTER suggestedAssignee'
                );
            }
            if (!existingCols.includes('createdAt')) {
                console.log('⚠️  Adding missing column: DraftTicket.createdAt');
                await connection.execute(
                    'ALTER TABLE DraftTicket ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP AFTER deadline'
                );
            }
        }

        // Check and add missing columns to NewTicket table
        const [newTicketCols] = await connection.execute(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'NewTicket' AND COLUMN_NAME IN ('deadline', 'createdAt', 'updatedAt')"
        );
        
        if (newTicketCols.length < 3) {
            const existingCols = newTicketCols.map(col => col.COLUMN_NAME);
            if (!existingCols.includes('deadline')) {
                console.log('⚠️  Adding missing column: NewTicket.deadline');
                await connection.execute(
                    'ALTER TABLE NewTicket ADD COLUMN deadline DATETIME AFTER status'
                );
            }
            if (!existingCols.includes('createdAt')) {
                console.log('⚠️  Adding missing column: NewTicket.createdAt');
                await connection.execute(
                    'ALTER TABLE NewTicket ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP AFTER deadline'
                );
            }
            if (!existingCols.includes('updatedAt')) {
                console.log('⚠️  Adding missing column: NewTicket.updatedAt');
                await connection.execute(
                    'ALTER TABLE NewTicket ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER createdAt'
                );
            }
        }

        // Normalize DraftTicketAssignee column name to match code expectations
        const [draftAssigneeCols] = await connection.execute(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DraftTicketAssignee' AND COLUMN_NAME IN ('assigneeEmail', 'assigneeID')"
        );
        const draftAssigneeColNames = draftAssigneeCols.map(col => col.COLUMN_NAME);
        if (!draftAssigneeColNames.includes('assigneeEmail') && draftAssigneeColNames.includes('assigneeID')) {
            try {
                console.log('⚠️  Renaming DraftTicketAssignee.assigneeID to assigneeEmail');
                await connection.execute(
                    'ALTER TABLE DraftTicketAssignee CHANGE COLUMN assigneeID assigneeEmail VARCHAR(64) NOT NULL'
                );
            } catch (error) {
                console.error('⚠️  Failed to rename DraftTicketAssignee.assigneeID:', error.message);
            }
        }

        const [draftAssigneeFk] = await connection.execute(
            "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_NAME = 'DraftTicketAssignee' AND COLUMN_NAME = 'assigneeEmail' AND REFERENCED_TABLE_NAME = 'Users'"
        );
        if (draftAssigneeFk.length === 0) {
            try {
                await connection.execute(
                    'ALTER TABLE DraftTicketAssignee ADD CONSTRAINT fk_DraftTicketAssignee_assigneeEmail FOREIGN KEY (assigneeEmail) REFERENCES Users(email) ON DELETE CASCADE'
                );
            } catch (error) {
                console.error('⚠️  Failed to add DraftTicketAssignee assigneeEmail FK:', error.message);
            }
        }

        // Normalize NewTicketAssignee column name to match code expectations
        const [newAssigneeCols] = await connection.execute(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'NewTicketAssignee' AND COLUMN_NAME IN ('assigneeEmail', 'assigneeID')"
        );
        const newAssigneeColNames = newAssigneeCols.map(col => col.COLUMN_NAME);
        if (!newAssigneeColNames.includes('assigneeEmail') && newAssigneeColNames.includes('assigneeID')) {
            try {
                console.log('⚠️  Renaming NewTicketAssignee.assigneeID to assigneeEmail');
                await connection.execute(
                    'ALTER TABLE NewTicketAssignee CHANGE COLUMN assigneeID assigneeEmail VARCHAR(64) NOT NULL'
                );
            } catch (error) {
                console.error('⚠️  Failed to rename NewTicketAssignee.assigneeID:', error.message);
            }
        }

        const [newAssigneeFk] = await connection.execute(
            "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_NAME = 'NewTicketAssignee' AND COLUMN_NAME = 'assigneeEmail' AND REFERENCED_TABLE_NAME = 'Users'"
        );
        if (newAssigneeFk.length === 0) {
            try {
                await connection.execute(
                    'ALTER TABLE NewTicketAssignee ADD CONSTRAINT fk_NewTicketAssignee_assigneeEmail FOREIGN KEY (assigneeEmail) REFERENCES Users(email) ON DELETE CASCADE'
                );
            } catch (error) {
                console.error('⚠️  Failed to add NewTicketAssignee assigneeEmail FK:', error.message);
            }
        }

        console.log('✅ Schema validation complete');
    } catch (error) {
        console.error('⚠️  Schema validation warning:', error.message);
        // Don't throw - just log as warning
    }
};

const ensureJunctionTables = async (connection) => {
    try {
        const junctionTableQueries = [
            `CREATE TABLE IF NOT EXISTS NewTicketAssignee(
                newTicketID INT NOT NULL,
                assigneeEmail VARCHAR(64) NOT NULL,
                FOREIGN KEY (newTicketID) REFERENCES NewTicket(id) ON DELETE CASCADE,
                FOREIGN KEY (assigneeEmail) REFERENCES Users(email) ON DELETE CASCADE,
                PRIMARY KEY (newTicketID, assigneeEmail)
            )`,
            `CREATE TABLE IF NOT EXISTS NewTicketFollower(
                newTicketID INT NOT NULL,
                userEmail VARCHAR(64) NOT NULL,
                FOREIGN KEY (newTicketID) REFERENCES NewTicket(id) ON DELETE CASCADE,
                FOREIGN KEY (userEmail) REFERENCES Users(email) ON DELETE CASCADE,
                PRIMARY KEY (newTicketID, userEmail)
            )`,
            `CREATE TABLE IF NOT EXISTS NewTicketCategory(
                newTicketID INT NOT NULL,
                category VARCHAR(32) NOT NULL,
                FOREIGN KEY (newTicketID) REFERENCES NewTicket(id) ON DELETE CASCADE,
                PRIMARY KEY (newTicketID, category)
            )`,
            `CREATE TABLE IF NOT EXISTS NewTicketUserRequest(
                newTicketID INT NOT NULL,
                userRequestID INT NOT NULL,
                FOREIGN KEY (newTicketID) REFERENCES NewTicket(id) ON DELETE CASCADE,
                FOREIGN KEY (userRequestID) REFERENCES UserRequest(id) ON DELETE CASCADE,
                PRIMARY KEY (newTicketID, userRequestID)
            )`,
            `CREATE TABLE IF NOT EXISTS TicketComments(
                id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
                ticketID INT NOT NULL,
                authorEmail VARCHAR(64) NOT NULL,
                text VARCHAR(2048) NOT NULL,
                isInternal BOOLEAN DEFAULT FALSE,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticketID) REFERENCES NewTicket(id) ON DELETE CASCADE,
                FOREIGN KEY (authorEmail) REFERENCES Users(email) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS TicketHistory(
                id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
                ticketID INT NOT NULL,
                action VARCHAR(128) NOT NULL,
                performedBy VARCHAR(64) NOT NULL,
                details VARCHAR(2048),
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticketID) REFERENCES NewTicket(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS DraftTicketAssignee(
                draftTicketID INT NOT NULL,
                assigneeEmail VARCHAR(64) NOT NULL,
                FOREIGN KEY (draftTicketID) REFERENCES DraftTicket(id) ON DELETE CASCADE,
                FOREIGN KEY (assigneeEmail) REFERENCES Users(email) ON DELETE CASCADE,
                PRIMARY KEY (draftTicketID, assigneeEmail)
            )`,
            `CREATE TABLE IF NOT EXISTS DraftTicketCategory(
                draftTicketID INT NOT NULL,
                category VARCHAR(32) NOT NULL,
                FOREIGN KEY (draftTicketID) REFERENCES DraftTicket(id) ON DELETE CASCADE,
                PRIMARY KEY (draftTicketID, category)
            )`,
            `CREATE TABLE IF NOT EXISTS DraftTicketUserRequest(
                draftTicketID INT NOT NULL,
                userRequestID INT NOT NULL,
                FOREIGN KEY (draftTicketID) REFERENCES DraftTicket(id) ON DELETE CASCADE,
                FOREIGN KEY (userRequestID) REFERENCES UserRequest(id) ON DELETE CASCADE,
                PRIMARY KEY (draftTicketID, userRequestID)
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

        console.log('✅ Junction tables validation complete');
    } catch (error) {
        console.error('⚠️  Junction tables validation warning:', error.message);
    }
};

export default initializeDatabase;
