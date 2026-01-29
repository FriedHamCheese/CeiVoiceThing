import {
	DATABASE_USERNAME,
	DATABASE_PASSWORD, 
	DATABASE_HOST, 
	SERVER_PORT
} from './config.js';

import mysqlConnection from './mysqlConnection.js';
import ticketRouter from './routes/ticket_router.js';

import express from 'express';
import crossOriginResourceSharing from 'cors';

const app = express();
app.use(crossOriginResourceSharing());
app.use(express.json());

async function main(){
	app.use('/ticket', ticketRouter);
	app.listen(SERVER_PORT);
	console.log("Server is listening on http://localhost:" + SERVER_PORT);
}

main();