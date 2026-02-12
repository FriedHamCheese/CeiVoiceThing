import pool from './utils/mysqlConnection.js'; // Ensure this matches your export
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSetup() {
    // We declare connection outside so it's accessible in the catch/finally blocks
    let connection; 

    try {
        console.log("--- Initializing Database Setup from File ---");

        const sqlFilePath = path.join(__dirname, '..', 'database', 'setup.sql');
        const schema = await fs.readFile(sqlFilePath, 'utf8');

        const statements = schema
            .split(/;\s*$/m)
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        // 1. Get a single connection from the pool
        connection = await pool.getConnection();

        // 2. Start the transaction
        await connection.beginTransaction();

        const shouldIgnoreError = (error) => {
            return error?.code === 'ER_TABLE_EXISTS_ERROR'
                || error?.code === 'ER_DUP_ENTRY';
        };

        for (const statement of statements) {
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            try {
                await connection.query(statement);
            } catch (error) {
                if (shouldIgnoreError(error)) {
                    console.warn(`⚠️  Skipped: ${error.code} for statement`);
                    continue;
                }
                throw error;
            }
        }

        // 3. Commit changes
        await connection.commit();
        console.log("✅ Database successfully synchronized with setup.sql.");
        
    } catch (error) {
        // 4. Rollback using the specific connection
        if (connection) await connection.rollback();
        console.error("❌ Setup failed:");
        console.error(error.stack || error.message);
    } finally {
        // 5. Release the connection back to the pool (don't use .end() on the pool)
        if (connection) connection.release();
        console.log("--- Process Finished ---");
        process.exit();
    }
}

runSetup();