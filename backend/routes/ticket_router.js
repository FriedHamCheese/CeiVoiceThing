import { draftTicketFromUserRequest as ollama } from '../utils/ticketollama.js';
import { draftTicketFromUserRequest as openai } from '../utils/ticketopenai.js';
import {getDraftTickets, getNewTickets} from '../utils/ticket.js';
import mysqlConnection from '../utils/mysqlConnection.js';
import express from 'express';

const router = express.Router();

router.post('/userRequest', async (request, response) => {
    const FIRST_CHARACTER = 0;
    const HTTP_STATUS_OK = 200;
    const HTTP_STATUS_BAD_REQUEST = 400;
    const HTTP_STATUS_SERVER_ERROR = 500;

    const MAX_USER_EMAIL_CHARACTERS = 64;
    const MAX_REQUEST_TEXT_CHARACTERS = 2048;

    const { requestText, fromEmail } = request.body;

    // Validation
    if (typeof requestText !== 'string') {
        return response.status(HTTP_STATUS_BAD_REQUEST).json({ message: "Incorrect type for .requestText" });
    }
    if (typeof fromEmail !== 'string') {
        return response.status(HTTP_STATUS_BAD_REQUEST).json({ message: "Incorrect type for .fromEmail" });
    }

    const emailForInsertion = fromEmail.trim().substring(FIRST_CHARACTER, MAX_USER_EMAIL_CHARACTERS);
    const requestTextForInsertion = requestText.trim().substring(FIRST_CHARACTER, MAX_REQUEST_TEXT_CHARACTERS);

    let connection;
    try {
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();

        // 1. Insert User Request
        const [userRequestRes] = await connection.execute(
            'INSERT INTO UserRequest (userEmail, requestContents) VALUES (?, ?)',
            [emailForInsertion, requestTextForInsertion]
        );
        const insertedUserRequestID = userRequestRes.insertId;

        // 2. Get AI Suggestions
        const draftTicketSuggestions = process.env.USE_OPENAI === 'TRUE' 
            ? await openai(requestTextForInsertion) 
            : await ollama(requestTextForInsertion);

        if (typeof draftTicketSuggestions === "string") {
            throw new Error("AI Summary failed: " + draftTicketSuggestions);
        }

        // 3. Insert Draft Ticket
        const [draftRes] = await connection.execute(
            'INSERT INTO DraftTicket (title, summary, suggestedSolutions) VALUES (?, ?, ?)',
            [draftTicketSuggestions.title, draftTicketSuggestions.summary, draftTicketSuggestions.suggestedSolutions]
        );
        const insertedDraftTicketID = draftRes.insertId;

        // 4. Link Request and Categories
        await connection.execute(
            'INSERT INTO DraftTicketUserRequest (userRequestID, draftTicketID) VALUES (?, ?)',
            [insertedUserRequestID, insertedDraftTicketID]
        );

        for (const category of draftTicketSuggestions.categories) {
            await connection.execute(
                "INSERT INTO DraftTicketCategory (draftTicketID, category) VALUES (?, ?)",
                [insertedDraftTicketID, category]
            );
        }

        await connection.commit();
        response.status(HTTP_STATUS_OK).json({ message: 'Draft ticket created successfully.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        response.status(HTTP_STATUS_SERVER_ERROR).json({ message: "Internal server error." });
    } finally {
        if (connection) connection.release();
    }
});


router.get('/getDraftTicket/:draftTicketID', async (request, response) => {
	/*
	Returns:
	- HTTP status 200 with {
		.id: int,
		.summary: str,
		.title: str,
		.suggestedSolutions: str,
		.categories: Array(str),
	}
	- HTTP status 400 with .error if .draftTicketID is invalid
	- HTTP status 500 for undocumented errors
	
	Todo:
	- Add .userRequestIDs: Array(int)
	- Add .assigneeIDs: Array(int)
	*/
	const HTTP_STATUS_FOR_BAD_REQUEST = 400;
	const draftTicketID = parseInt(request.params.draftTicketID);
	if(Number.isNaN(draftTicketID)) 
		return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({error: "Received .draftTicketID attribute is not a number."});		
	
	const [draftTickets, _] = await mysqlConnection.execute("SELECT * FROM DraftTicket WHERE id = ?", [draftTicketID]);
	if(draftTickets.length === 0) 
		return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({error: "Received .draftTicketID attribute corresponds to non-existing ticket."});
	
	let draftTicket = draftTickets[0];
	
	const [draftTicketCategories, _2] = await mysqlConnection.execute("SELECT category FROM DraftTicketCategory WHERE draftTicketID = ?", [
		draftTicketID
	]);
	const categories = [];
	for(const draftTicketCategory of draftTicketCategories)
		categories.push(draftTicketCategory.category);
	
	draftTicket.categories = categories;
	response.json(draftTicket);
});


router.get('/userViewRequests/:userID', async (request, response) => {
	/*
	Endpoint for user viewing tickets from their requests.
	
	Returns DraftTickets and NewTickets which is from the requests of the user in a single array:
	[
		For each Ticket: {
			id: int,
			summary: str,
			title: str,
			suggestedSolutions: str,
			categories: Array(str),
			userEmails: Array(str),
			status: str -> "Draft", "New", ...
		},
		...
		
		May throw undocumented exceptions
	]
	*/
	
	async function getDraftTicketsBulk(){
		const joiningCondition = "? = UserRequest.userEmail AND UserRequest.id = DraftTicketUserRequest.userRequestID AND DraftTicketUserRequest.draftTicketID = DraftTicket.id ";
		const [draftTicketsWithID, _] = await mysqlConnection.execute("SELECT DraftTicket.id FROM UserRequest, DraftTicketUserRequest, DraftTicket WHERE " + joiningCondition, [request.params.userID]);
		const userDraftTicketIDs = new Set();
		for(const draftTicket of draftTicketsWithID)
			userDraftTicketIDs.add(draftTicket.id);
		
		const draftTickets = await getDraftTickets(Array.from(userDraftTicketIDs.values()));
		for(const draftTicket of draftTickets){
			draftTicket.status = "Draft";
			const [userRequests, _2] = await mysqlConnection.query("SELECT userEmail FROM UserRequest WHERE id IN (?)", [draftTicket.userRequestIDs]);
			
			const userEmailSet = new Set();
			for(const userRequest of userRequests)
				userEmailSet.add(userRequest.userEmail);
			draftTicket.userEmails = Array.from(userEmailSet.values());
			
			delete draftTicket.assigneeIDs;
			delete draftTicket.userRequestIDs;
		}
		
		return draftTickets;
	}

	async function getNewTicketsBulk(){
		const joiningCondition = "? = NewTicketFollower.userEmail AND NewTicketFollower.newTicketID = NewTicket.id";
		const [newTicketsWithID, _] = await mysqlConnection.execute("SELECT NewTicket.id FROM NewTicketFollower, NewTicket WHERE " + joiningCondition, [request.params.userID]);
		const userNewTicketIDs = new Set();
		for(const newTicket of newTicketsWithID)
			userNewTicketIDs.add(newTicket.id);
		
		const newTickets = await getNewTickets(Array.from(userNewTicketIDs.values()));
		for(const newTicket of newTickets){
			newTicket.summary = newTicket.requestContents;
			delete newTicket.requestContents;
		}
		
		return newTickets;
	}
	
	const streamlinedDraftTickets = await getDraftTicketsBulk();
	const streamlinedNewTickets = await getNewTicketsBulk(); 
	
	response.status(200).json(streamlinedDraftTickets.concat(streamlinedNewTickets));
});

export default router;