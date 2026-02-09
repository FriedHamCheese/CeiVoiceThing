import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

// Using a Pool instead of a single connection for better stability
const pool = mysql.createPool({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test the connection immediately on startup
try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL Database');
    connection.release();
} catch (error) {
    console.error('❌ Database connection failed:', error.message);
}

export default pool;