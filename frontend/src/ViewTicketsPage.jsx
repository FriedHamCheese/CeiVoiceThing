import {DraftTicketComponent} from './ViewTicketsPage_components.jsx';
import {useState, useEffect} from 'react';

export default function ViewTicketsPage({redirectToHomePage, APIDomain}){
	//May throw undocumented exceptions
	
	const [errorMessage, setErrorMessage] = useState('');
	const [refreshPage, setRefreshPage] = useState(true);
	const [selectedDraftTicketIDs, setSelectedDraftTicketIDs] = useState([]);
	const [draftTicketComponents, setDraftTicketComponents] = useState([]);
	const [newTicketComponents, setNewTicketComponents] = useState([]);
	
	function NewTicketComponent({ticketTitle, ticketID}){
		return (
			<div style={{border: 'solid', borderWidth: '2px', padding: '3px'}}>
				<label style={{marginRight: '10px'}}>{ticketTitle}</label>
			</div>
		);
	}	
	
	function addSelectedDraftTicketID(draftTicketID){
		setSelectedDraftTicketIDs(selectedDraftTicketIDs => selectedDraftTicketIDs.concat([draftTicketID]));
	}
	function removeSelectedDraftTicketID(draftTicketID){
		const indexOfDraftTicketID = selectedDraftTicketIDs.indexOf(draftTicketID);
		const DELETE_FROM_SPECIFIED_INDEX = indexOfDraftTicketID;
		const REMOVE_ONE_ELEMENT = 1;
		setSelectedDraftTicketIDs(selectedDraftTicketIDs => selectedDraftTicketIDs.toSpliced(DELETE_FROM_SPECIFIED_INDEX, REMOVE_ONE_ELEMENT));
	}
	
	async function fetchAllTickets(){
		//May throw undocumented exceptions
		let response = null;
		try{
				/*
				Raises
				- AbortError if abort() is called
				- NotAllowedError if Topics API is blocked or Private State Token API is blocked
				- TypeError if the URL is invalid, 
					URL has credentials, request blocked, 
					there's a network error, something from Private State Token API
				- something from await
				*/
			response = await fetch(APIDomain + "/ticket/admin", {
				method: "GET"
			});
		}catch(err){
				//Not catching AbortError because react could find its definition
				//Not catching NotAllowedError because not using the APIs
				if(err instanceof TypeError)
					setErrorMessage("Couldn't connect to the server (fetch: TypeError).");
				else throw err;
				return;
		}
		
		if(!(response.ok)){
			setErrorMessage("Received HTTP status " + response.status + " from server.");
			return;
		}
		
		let objectFromResponse = null;
		try{
			/*
			Raises
			- AbortError if abort() is called
			- TypeError if the request body couldn't be read
			- SyntaxError if the body couldn't be parsed as json
			*/
			objectFromResponse = await response.json();
		}catch(err){
				//Not catching AbortError because react could find its definition
				if(err instanceof TypeError) setErrorMessage("Could read the request body from the server.");
				if(err instanceof SyntaxError) setErrorMessage("Could parse the request from the server.");		
				else throw err;
				return;
		}
		
		if(!(objectFromResponse.tickets instanceof Array)){
			setErrorMessage("Received server response does not have .tickets attribute as array.");
			return;
		}
		
		//Set empty error message here
		setErrorMessage('');
		
		const draftTicketComponentsLocal = [];
		const newTicketComponentsLocal = [];
		for(const ticket of objectFromResponse.tickets){
			if(typeof ticket.type !== 'string'){
				setErrorMessage("Invalid type for ticket .type attribute, skipping ticket...");
				continue;
			}else if(typeof ticket.id !== 'number'){
				setErrorMessage("Invalid type for ticket .id attribute, skipping ticket...");
				continue;				
			}

			switch(ticket.type){
				case 'draft':
					draftTicketComponentsLocal.push(<DraftTicketComponent 
						ticketTitle={ticket.title}
						ticketID={ticket.id}
						APIDomain={APIDomain}
						setErrorMessage={setErrorMessage}
						saveTicketIDAsSelected={addSelectedDraftTicketID}
						removeTicketIDFromSelected={removeSelectedDraftTicketID}
						refreshParent={() => {setRefreshPage(true)}}
					/>);
					break;
				default:
					newTicketComponentsLocal.push(<NewTicketComponent
						ticketTitle={ticket.title}
						ticketID={ticket.id}
					/>)
			}
		}

		if(draftTicketComponentsLocal.length === 0) setDraftTicketComponents(null);
		else setDraftTicketComponents(draftTicketComponentsLocal);
		
		if(newTicketComponentsLocal.length === 0) setNewTicketComponents(null);
		else setNewTicketComponents(newTicketComponentsLocal);		
	}
	
	useEffect(() => {
		if(!refreshPage) return; 
		fetchAllTickets();
		setRefreshPage(false);
	}, [refreshPage, ]);
	
	async function mergeSelectedDraftTickets(){
		//May throw undocumented exceptions
		let response = null;
		try{
				/*
				Raises
				- AbortError if abort() is called
				- NotAllowedError if Topics API is blocked or Private State Token API is blocked
				- TypeError if the URL is invalid, 
					URL has credentials, request blocked, 
					there's a network error, something from Private State Token API
				- something from await
				*/
			response = await fetch(APIDomain + "/ticket/admin/merge/", {
				method: "POST",
				headers: {"Content-Type": "application/json"},
				body: JSON.stringify({
					draftTicketIDs: selectedDraftTicketIDs
				}),
			});
		}catch(err){
				//Not catching AbortError because react could find its definition
				//Not catching NotAllowedError because not using the APIs
				if(err instanceof TypeError)
					setErrorMessage("Couldn't connect to the server (fetch: TypeError).");
				else throw err;
				return;
		}
		
		setErrorMessage('');
		if(response.ok) return fetchAllTickets();
		//404 returns HTML which response.json can't parse
		if(response.status === 404) return setErrorMessage("Received HTTP status 404 from server.");
		
		let objectFromResponse = null;
		try{
			/*
			Raises
			- AbortError if abort() is called
			- TypeError if the request body couldn't be read
			- SyntaxError if the body couldn't be parsed as json
			*/
			objectFromResponse = await response.json();
			setErrorMessage(objectFromResponse.error || ("Received HTTP status " + response.status + " from server."));
		}catch(err){
				//Not catching AbortError because react could find its definition
				if(err instanceof TypeError) setErrorMessage("Could read the request body from the server.");
				if(err instanceof SyntaxError) setErrorMessage("Could parse the request from the server.");		
				else throw err;
				return;
		}		
	}

	return (
		<div>
		<h1>View Tickets (Admin)</h1>
		<h2>Tickets</h2>
		{newTicketComponents || <p>No tickets.</p>}
		<h2>Draft Tickets</h2>
		{draftTicketComponents || <p>No tickets.</p>}
		<p></p>
		<button onClick={mergeSelectedDraftTickets}> Merge tickets</button>
		<p style={{color: 'red'}}>{errorMessage}</p>
		<button onClick={redirectToHomePage}>Back to home</button>
		</div>
	);
}