import {
	DATABASE_USERNAME,
	DATABASE_PASSWORD,
	DATABASE_NAME,
	DATABASE_HOST, 
	SERVER_PORT
} from './config.js';

import mysql from 'mysql2/promise';

const mysqlConnection = await mysql.createConnection({
	host: DATABASE_HOST,
	user: DATABASE_USERNAME,
	password: DATABASE_PASSWORD,
	database: DATABASE_NAME,
});

export default mysqlConnection;