import mysqlConnection from './mysqlConnection.js';

export async function getDraftTickets(draftTicketIDs){
	/*
	Return an Array of DraftTickets corresponding to IDs in draftTicketIDs, where DraftTicket = {
		.id: int,
		.summary: str,
		.title: str,
		.suggestedSolutions: str,
		.categories: Array(str),		
		.userRequestIDs: Array(int),
	}
	
	Does not validate elements in draftTicketIDs.
	*/
	
	if(draftTicketIDs.length < 1) return [];

	const [draftTickets, _] = await mysqlConnection.query("SELECT * FROM DraftTicket WHERE id in (?)", [draftTicketIDs]);
	for(const draftTicket of draftTickets){
		draftTicket.categories = [];
		draftTicket.assigneeIDs = [];		
		draftTicket.userRequestIDs = [];		
		
		const [draftTicketCategories, _2] = await mysqlConnection.execute("SELECT category FROM DraftTicketCategory WHERE draftTicketID = ?", [draftTicket.id]);
		for(const draftTicketCategory of draftTicketCategories)
			draftTicket.categories.push(draftTicketCategory.category);

		const [draftTicketUserRequests, _3] = await mysqlConnection.execute("SELECT userRequestID FROM DraftTicketUserRequest WHERE draftTicketID = ?", [draftTicket.id]);
		const userRequestIDSet = new Set();
		for(const draftTicketUserRequest of draftTicketUserRequests)
			userRequestIDSet.add(draftTicketUserRequest.userRequestID);	
		draftTicket.userRequestIDs = Array.from(userRequestIDSet.keys());
	}
	
	return draftTickets;
}

export async function getNewTickets(newTicketIDs){
	/*
	Return an Array of NewTickets corresponding to IDs in newTicketIDs, where NewTicket = {
		.id: int,
		.requestContents: str,
		.title: str,
		.suggestedSolutions: str,
		.categories: Array(str),		
		.userEmails: Array(str),
	}
	
	Does not validate elements in newTicketIDs.
	*/
	if(newTicketIDs.length < 1) return [];
	
	const [newTickets, _] = await mysqlConnection.query("SELECT * FROM NewTicket WHERE id in (?)", [newTicketIDs]);
	for(const newTicket of newTickets){
		newTicket.categories = [];
		newTicket.userEmails = [];		
		
		const [newTicketCategories, _2] = await mysqlConnection.execute("SELECT category FROM NewTicketCategory WHERE newTicketID = ?", [newTicket.id]);
		for(const newTicketCategory of newTicketCategories)
			newTicket.categories.push(newTicketCategory.category);

		const [newTicketUserRequests, _3] = await mysqlConnection.execute("SELECT userEmail FROM NewTicketFollower WHERE newTicketID = ?", [newTicket.id]);
		for(const newTicketUserRequest of newTicketUserRequests)
			newTicket.userEmails.push(newTicketUserRequest.userEmail);
	}
	
	return newTickets;
}