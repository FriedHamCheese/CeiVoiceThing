import dotenv from 'dotenv';
import pool from './utils/mysqlConnection.js';
dotenv.config();

async function nukeDatabases() {
  try {
    const [rows] = await pool.query('SHOW DATABASES');
    
    const systemDbs = ['information_schema', 'mysql', 'performance_schema', 'sys', 'phpmyadmin'];
    const targets = rows
      .map(r => r.Database || r.database)
      .filter(db => !systemDbs.includes(db));

    if (targets.length === 0) return;

    await pool.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const db of targets) {
      await pool.query(`DROP DATABASE IF EXISTS \`${db}\``);
    }

    const mainDb = process.env.DATABASE_NAME;
    if (mainDb) {
      await pool.query(`CREATE DATABASE \`${mainDb}\``);
    }

    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

  } catch (error) {
    console.error(error.message);
  } finally {
    await pool.end();
  }
}

nukeDatabases();