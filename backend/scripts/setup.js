import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSetup() {
    let connection;

    try {
        console.log('--- Initializing Database Setup from File ---');

        // 1️⃣ Create direct connection (NOT pool)
        connection = await mysql.createConnection({
            host: process.env.DATABASE_HOST,
            user: process.env.DATABASE_USERNAME,
            password: process.env.DATABASE_PASSWORD,
            database: process.env.DATABASE_NAME,
            multipleStatements: true
        });

        // 2️⃣ Read SQL file
        const sqlFilePath = path.join(__dirname, '..', 'database', 'setup.sql');
        const sqlFileContent = await fs.readFile(sqlFilePath, 'utf8');

        // 3️⃣ Execute entire SQL file at once
        await connection.query(sqlFileContent);

        console.log('✅ Database setup successfull');

    } catch (error) {
        console.error('❌ Setup failed:');
        console.error(error.stack || error.message);
    } finally {
        if (connection) await connection.end();
        console.log('--- Process Finished ---');
        process.exit();
    }
}

runSetup();