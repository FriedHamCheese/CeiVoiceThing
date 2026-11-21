import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, './.env') });

async function runSetup() {
    let connection;

    try {
        console.log('--- Initializing Database Setup ---');

        if (!process.env.DATABASE_HOST) {
            throw new Error('Environment variables not loaded. Check your .env path.');
        }

        connection = await mysql.createConnection({
            host: process.env.DATABASE_HOST,
            user: process.env.DATABASE_ROOT_USERNAME || 'root',
            password: process.env.DATABASE_ROOT_PASSWORD || 'CEiAdmin0',
            database: process.env.DATABASE_NAME,
            multipleStatements: true
        });

        const sqlFilePath = path.join(__dirname, './', 'setup.sql');
        const sqlFileContent = await fs.readFile(sqlFilePath, 'utf8');

        // --- IMPROVED CLEANUP FOR TRIGGERS ---
        // 1. Remove DELIMITER lines entirely
        // 2. Replace // trigger terminators with standard ;
        const cleanSql = sqlFileContent
            .replace(/DELIMITER\s+\/\/|DELIMITER\s+;/g, '')
            .replace(/\/\/\s*(\r?\n|$)/g, ';$1')
            .trim();

        console.log(`Executing SQL on ${process.env.DATABASE_NAME}...`);

        await connection.query(cleanSql);

        console.log('Database setup successful (Tables & Immutable Triggers created)');

    } catch (error) {
        console.error('Setup failed:');
        if (error.code === 'ECONNREFUSED') {
            console.error('Check if MySQL is running.');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.error(`Database '${process.env.DATABASE_NAME}' does not exist.`);
        } else {
            console.error(error.message);
        }
    } finally {
        if (connection) await connection.end();
        console.log('--- Process Finished ---');
        process.exit();
    }
}

runSetup();