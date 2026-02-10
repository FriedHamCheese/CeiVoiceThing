import {draftTicketFromUserRequest, getDraftTickets, getNewTickets} from './ticket_router_utils.js'
import adminTicketRouter from './ticket_router_admin.js'

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
		console.log("Error while summarising user request: " + draftTicketSuggestions);
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
			category.toLowerCase(),
		]);
	}
	
	//Also need to insert DraftTicketAssignee(s) from AI suggestions on assignees

	response.status(HTTP_STATUS_OK);
})


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

router.use('/admin', adminTicketRouter);

export default router