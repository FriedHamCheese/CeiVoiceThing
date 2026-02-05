import {draftTicketFromUserRequest} from './ticket_router_utils.js'

import mysqlConnection from '../mysqlConnection.js';
import express from 'express';
const router = express.Router();

router.post('/userRequest', async (request, response) => {
	/*
	End point for user to submit their request text along with their email
	
	input:{
		.requestText: str
		.fromEmail: str
	}
	
	This should create a UserRequest object in SQL; 
	summarise the request, suggest the title, assignees for the DraftTicket;
	create the DraftTicket object in SQL with the AI suggested fields;
	Link the UserRequest with the DraftTicket using DraftTicketUserRequest and insert it;
	Link the suggested Assignee(s) with the DraftTicket using DraftTicketAssignee(s) and insert it;
	
	Reponds with  
	- HTTP status 200 if request fulfilled
	- HTTP status 400 with .message if attributes of the request has an invalid type
	- HTTP status 500 with .message if error from AI summary
	- HTTP status 500 for undocumented errors
	
	No documented exceptions
	*/
	const FIRST_CHARACTER = 0;
	const HTTP_STATUS_FOR_BAD_REQUEST = 400;
	const HTTP_STATUS_OK = 200;
	
	//These should be less or equal to SQL length
	const MAX_USER_EMAIL_CHARACTERS = 64;
	const MAX_DRAFT_TICKET_TITLE_CHARACTERS = 256;
	const MAX_REQUEST_TEXT_CHARACTERS = 2048;
	
	const objectFromRequest = request.body;
	const invalidTypeForRequestText = (typeof objectFromRequest.requestText) !== 'string';
	const invalidTypeForUserEmail = (typeof objectFromRequest.fromEmail) !== 'string';
	
	if(invalidTypeForRequestText)
		return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({message: "Received user request has incorrect type for .requestText"});
	if(invalidTypeForUserEmail)
		return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({message: "Received user request has incorrect type for .fromEmail"});
	
	//Verify if email corresponds to user in the system? maybe authenticate them?
	
	const emailForInsertion = objectFromRequest.fromEmail.trim().substr(FIRST_CHARACTER, MAX_USER_EMAIL_CHARACTERS);
	const requestTextForInsertion = objectFromRequest.requestText.trim().substr(FIRST_CHARACTER, MAX_REQUEST_TEXT_CHARACTERS);

	const userRequestInsertionResponse = await mysqlConnection.execute('INSERT INTO UserRequest (userEmail, requestContents) VALUES (?, ?)', [
		emailForInsertion,
		requestTextForInsertion
	]);
	const insertedUserRequestID = userRequestInsertionResponse[0].insertId;

	const draftTicketSuggestions = await draftTicketFromUserRequest(requestTextForInsertion);
	const isError = typeof draftTicketSuggestions === "string";
	if(isError){
		const HTTP_STATUS_FOR_SERVER_ERROR = 500;
		return response.status(HTTP_STATUS_FOR_SERVER_ERROR).json({message: "Error from LLM summary."});
	}

	const draftTicketInsertionResponse = await mysqlConnection.execute('INSERT INTO DraftTicket (title, summary, suggestedSolutions) VALUES (?, ?, ?)', [
		draftTicketSuggestions.title,
		draftTicketSuggestions.summary,
		draftTicketSuggestions.suggestedSolutions,
	]);
	const insertedDraftTicketID = draftTicketInsertionResponse[0].insertId;
	
	await mysqlConnection.execute('INSERT INTO DraftTicketUserRequest (userRequestID, draftTicketID) VALUES (?, ?)', [
		insertedUserRequestID,
		insertedDraftTicketID,
	]);
	
	for(const category of draftTicketSuggestions.categories){
		await mysqlConnection.execute("INSERT INTO DraftTicketCategory (draftTicketID, category) VALUES (?, ?)", [
			insertedDraftTicketID,
			category,
		]);
	}
	
	//Also need to insert DraftTicketAssignee(s) from AI suggestions on assignees

	response.status(HTTP_STATUS_OK);
})

router.get('/admin', async (request, response) => {
	/*
	End point for admin to fetch all tickets from the system
	
	Reponds with 
	- HTTP status 200 with {
			tickets: [
			{
				...depends on ticket type of each ticket
				type: 'draft', 'new'
			}
			...
			]
		}
	
	No documented exceptions
	*/

	//should verify admin's credentials
	
	const [draftTickets ,_] = await mysqlConnection.execute("SELECT * FROM DraftTicket");	
	for(let draftTicket of draftTickets)
		draftTicket.type = 'draft';
	
	const [newTickets ,_2] = await mysqlConnection.execute("SELECT * FROM NewTicket");	
	for(let newTicket of newTickets)
		newTicket.type = 'new';	
	
	const HTTP_STATUS_OK = 200;
	response.status(HTTP_STATUS_OK).json({tickets: draftTickets.concat(newTickets)});
})

router.post('/toNewTicket', async (request, response) => {
	/*
	Endpoint for admin to convert a DraftTicket to a New Ticket
		
	has to:
	- check if the submitted DraftTicket ID exists
	- create a NewTicket from mostly the same attributes in DraftTicket
	- convert DraftTicketUserRequest(s) of the DraftTicket to NewTicketFollower(s) and delete the former
	- convert DraftTicketAssignee(s) of the DraftTicket to NewTicketCreator(s) and delete the former
	- convert DraftTicketCategory(s) to NewTicketCategory and delete the former
	- delete the original DraftTicket 
	
	Reponds with 
	- HTTP status 200 if request is fulfilled
	- HTTP status 400 with .message,
		if .ticketID in the request is invalid type or doesn't correspond to any DraftTicket
	
	No documented exceptions
	*/
	
	const HTTP_STATUS_FOR_BAD_REQUEST = 400;
	const HTTP_STATUS_OK = 200;
	
	const objectFromRequest = request.body;
	const draftTicketIDForChanging = objectFromRequest.ticketID;

	if(typeof draftTicketIDForChanging !== 'number')
		return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({message: 'Invalid type for .ticketID for changing ticket state to New Ticket.'});
	
	const [draftTickets ,_] = await mysqlConnection.execute("SELECT * FROM DraftTicket WHERE id = ?", 
		[draftTicketIDForChanging]
	);	
	const invalidDraftTicketID = draftTickets.length === 0;
	if(invalidDraftTicketID) return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({message: 'Invalid Draft Ticket ID for changing to New Ticket.'});

	//should verify admin's credentials
	
	//Insert a NewTicket from the DraftTicket
	const newTicketInsertionResponse = await mysqlConnection.execute("INSERT INTO NewTicket (title, requestContents, suggestedSolutions) VALUES (?, ?, ?)", [
		draftTickets[0].title,
		draftTickets[0].summary,
		draftTickets[0].suggestedSolutions,
	]);	
	const insertedNewTicketID = newTicketInsertionResponse[0].insertId;
	
	async function translateDraftTicketUserRequestsToNewTicketFollowers(){
		//Translate Users/Assignees of the DraftTicket to Followers/Creators of the New Ticket.
		const [userRequestsOfDraftTicket, _2] = await mysqlConnection.execute(
			"SELECT UserRequest.userEmail, UserRequest.id FROM UserRequest, DraftTicketUserRequest WHERE DraftTicketUserRequest.userRequestID = UserRequest.id and DraftTicketUserRequest.draftTicketID = ?", 
			[draftTicketIDForChanging]
		);		

		for(const userRequestOfDraftTicket of userRequestsOfDraftTicket){
			await mysqlConnection.execute("INSERT INTO NewTicketFollower (newTicketID, userEmail) VALUES (?, ?)", [
				insertedNewTicketID,
				userRequestOfDraftTicket.userEmail,
			]);		
			
			await mysqlConnection.execute("DELETE FROM DraftTicketUserRequest WHERE draftTicketID = ?", [draftTicketIDForChanging]);
		}
	}
	async function translateDraftTicketCategoryToNewTicketCategory(){
		const [categoriesOfDraftTicket, _3] = await mysqlConnection.execute(
			"SELECT * FROM DraftTicketCategory WHERE draftTicketID = ?", 
			[draftTicketIDForChanging]
		);	

		for(const categoryOfDraftTicket of categoriesOfDraftTicket){
			await mysqlConnection.execute("INSERT INTO NewTicketCategory (newTicketID, category) VALUES (?, ?)", [
				insertedNewTicketID,
				categoryOfDraftTicket.category,
			]);		
			
			await mysqlConnection.execute("DELETE FROM DraftTicketCategory WHERE draftTicketID = ?", [draftTicketIDForChanging]);
		}
	}
	
	translateDraftTicketUserRequestsToNewTicketFollowers();
	translateDraftTicketCategoryToNewTicketCategory();

	//DraftTicket should be last to be deleted since others uses DraftTicket	
	await mysqlConnection.execute("DELETE FROM DraftTicket WHERE id = ?", [draftTicketIDForChanging]);
	response.status(HTTP_STATUS_OK);
})

export default router