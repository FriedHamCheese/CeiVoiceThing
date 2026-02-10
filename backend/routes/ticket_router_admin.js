import mysqlConnection from '../mysqlConnection.js';

import express from 'express';
const router = express.Router();

router.get('/', async (request, response) => {
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
	const newTicketInsertionResponse = await mysqlConnection.execute("INSERT INTO NewTicket (title, requestContents, suggestedSolutions, status) VALUES (?, ?, ?, ?)", [
		draftTickets[0].title,
		draftTickets[0].summary,
		draftTickets[0].suggestedSolutions,
		"New",
	]);	
	const insertedNewTicketID = newTicketInsertionResponse[0].insertId;
	
	async function translateDraftTicketUserRequestsToNewTicketFollowers(){
		//Translate Users/Assignees of the DraftTicket to Followers/Creators of the New Ticket.
		const [userRequestsOfDraftTicket, _2] = await mysqlConnection.execute(
			"SELECT UserRequest.userEmail, UserRequest.id FROM UserRequest, DraftTicketUserRequest WHERE DraftTicketUserRequest.userRequestID = UserRequest.id and DraftTicketUserRequest.draftTicketID = ?", 
			[draftTicketIDForChanging]
		);		

		const setOfFollowerEmails = new Set();
		for(const userRequestOfDraftTicket of userRequestsOfDraftTicket)
			setOfFollowerEmails.add(userRequestOfDraftTicket.userEmail);
		for(const followerEmail of setOfFollowerEmails){
			await mysqlConnection.execute("INSERT INTO NewTicketFollower (newTicketID, userEmail) VALUES (?, ?)", [
				insertedNewTicketID,
				followerEmail,
			]);
		}
		await mysqlConnection.execute("DELETE FROM DraftTicketUserRequest WHERE draftTicketID = ?", [draftTicketIDForChanging]);
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
			
		}
		await mysqlConnection.execute("DELETE FROM DraftTicketCategory WHERE draftTicketID = ?", [draftTicketIDForChanging]);
	}
	
	translateDraftTicketUserRequestsToNewTicketFollowers();
	translateDraftTicketCategoryToNewTicketCategory();

	//DraftTicket should be last to be deleted since others uses DraftTicket	
	await mysqlConnection.execute("DELETE FROM DraftTicket WHERE id = ?", [draftTicketIDForChanging]);
	response.status(HTTP_STATUS_OK);
})


router.post("/merge", async (request, response) => {
	/*
	Endpoint for merging draft tickets for admin
	
	input: {
		draftTicketIDs: Array(int),
		title: str[0-128],
		summary: str[0-2048],
		categories: Array(str[0-32]),
		suggestedSolutions: str[0-2048],
	}
	
	Returns:
	- HTTP status 200 if request is fulfilled
	- HTTP status 400 with .error, 
		if draftTicketIDs is not an Array type or any draft ticket id for merging is invalid
	- HTTP status 500 for undocumented errors
	*/
	
	const FIRST_CHARACTER = 0;
	const MAX_CATEGORY_CHARACTERS = 32;
	const MAX_TITLE_CHARACTERS = 128;
	const MAX_SUMMARY_CHARACTERS = 2048;
	const MAX_SOLUTIONS_CHARACTERS = 2048;
	
	const HTTP_STATUS_FOR_BAD_REQUEST = 400;
	const {draftTicketIDs, title, summary, categories, suggestedSolutions} = request.body;
	if(!(draftTicketIDs instanceof Array)) 
		return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({error: ".draftTicketIDs attribute is not an Array."});
	
	for(const draftTicketID of draftTicketIDs){
		if(typeof draftTicketID !== "number") 
			return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({error: "element in .draftTicketIDs is not a number."});
		if(!Number.isInteger(draftTicketID))
			return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({error: "element in .draftTicketIDs is not an integer."});
	}
	
	if((typeof title) !== "string") 
		return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({error: ".title is not a string."});
	if((typeof summary) !== "string") 
		return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({error: ".summary is not a string."});
	if((typeof suggestedSolutions) !== "string") 
		return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({error: ".suggestedSolutions is not a string."});
	if(!(categories instanceof Array)) 
		return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({error: ".categories is not an Array."});
	

	const [draftTicketsFromIDs, _] = await mysqlConnection.query("SELECT * FROM DraftTicket WHERE id in (?)", [draftTicketIDs]);
	const hasInvalidID = draftTicketsFromIDs.length !== draftTicketIDs.length;
	if(hasInvalidID) 
		return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({error: "Request has an invalid draft ticket ID for merging."});
	
	const firstSelectedDraftTicket = draftTicketsFromIDs[0];
	
	
	const draftTicketInsertionResponse = await mysqlConnection.execute("INSERT INTO DraftTicket (summary, title, suggestedSolutions) VALUES (?, ?, ?)", 
	[
		summary.trim().substr(FIRST_CHARACTER, MAX_SUMMARY_CHARACTERS),
		title.trim().substr(FIRST_CHARACTER, MAX_TITLE_CHARACTERS),
		suggestedSolutions.trim().substr(FIRST_CHARACTER, MAX_SOLUTIONS_CHARACTERS),
	]);
	
	const mergedDraftTicketID = draftTicketInsertionResponse[0].insertId;
	
	await mysqlConnection.query("UPDATE DraftTicketUserRequest SET draftTicketID = ? WHERE draftTicketID in (?)", 
	[
		mergedDraftTicketID,
		draftTicketIDs
	]);
	
	async function mergeCategories(){
		await mysqlConnection.query("DELETE FROM DraftTicketCategory WHERE draftTicketID in (?)", [draftTicketIDs]);
		
		const setOfCategories = new Set();
		for(const category of categories){
			if((typeof category) !== "string") continue;
			setOfCategories.add(category.trim().substr(FIRST_CHARACTER, MAX_CATEGORY_CHARACTERS));
		}
		for(const category of setOfCategories){
			await mysqlConnection.execute("INSERT INTO DraftTicketCategory (category, draftTicketID) VALUES (?, ?)", [
				category, mergedDraftTicketID
			]);
		}
	}
	await mergeCategories();
	
	await mysqlConnection.query("DELETE FROM DraftTicket WHERE id in (?)", [draftTicketIDs]);
	response.status(200);
});

export default router;