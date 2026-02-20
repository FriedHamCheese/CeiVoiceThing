// backend/database/setup.js
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// 1. Define paths first so we can use them in dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. FIX: Pass an object with the 'path' property
// We use path.join to make it absolute, ensuring it works regardless of where you run the script from
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runSetup() {
    let connection;

    try {
        console.log('--- Initializing Database Setup from File ---');

        // 3. Debugging: Check if env vars are actually loaded (don't log the password)
        if (!process.env.DATABASE_HOST) {
            throw new Error('Environment variables not loaded. Check your .env path.');
        }
        console.log(`Target: ${process.env.DATABASE_USERNAME}@${process.env.DATABASE_HOST} using DB: ${process.env.DATABASE_NAME}`);

        connection = await mysql.createConnection({
            host: process.env.DATABASE_HOST,
            user: process.env.DATABASE_USERNAME,
            password: process.env.DATABASE_PASSWORD,
            database: process.env.DATABASE_NAME,
            multipleStatements: true
        });

        const sqlFilePath = path.join(__dirname, './', 'setup.sql');

        // 4. Verification: Ensure SQL file exists before reading
        try {
            await fs.access(sqlFilePath);
        } catch {
            throw new Error(`Could not find setup.sql at: ${sqlFilePath}`);
        }

        const sqlFileContent = await fs.readFile(sqlFilePath, 'utf8');

        console.log('Executing SQL...');
        await connection.query(sqlFileContent);

        console.log('Database setup successful');

    } catch (error) {
        console.error('Setup failed:');
        // Improved error logging
        if (error.code === 'ECONNREFUSED') {
            console.error('Error: Could not connect to database server. Is MySQL running?');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.error(`Error: The database '${process.env.DATABASE_NAME}' does not exist yet.`);
            console.error('Hint: You may need to create the connection without the "database" option first, then CREATE DATABASE.');
        } else {
            console.error(error.stack || error.message);
        }
    } finally {
        if (connection) await connection.end();
        console.log('--- Process Finished ---');
        process.exit();
    }
}

runSetup();