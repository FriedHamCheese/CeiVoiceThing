import {useState, useEffect} from 'react';

export default function UserViewRequestsPage({APIDomain, userEmail, redirectToHomePage}){
	const [errorMessage, setErrorMessage] = useState('');
	
	const [draftTickets, setDraftTickets] = useState([]);
	const [newTickets, setNewTickets] = useState([]);
	const [assignedTickets, setAssignedTickets] = useState([]);
	const [solvingTickets, setSolvingTickets] = useState([]);
	const [solvedTickets, setSolvedTickets] = useState([]);
	const [failedTickets, setFailedTickets] = useState([]);
	
	function TicketContainer({ticket}){
		const [expanded, setExpanded] = useState(false);
		
		function ExpandedView(){
			return (
				<div style={{padding: "10px", paddingTop: 0}}>
					<button style={{float: "right"}}>Chat</button>
					<div style={{marginTop: "20px"}}>
					{ticket.categories.map(category => <label style={{marginRight: "10px", fontWeight: 500}}>{category}</label>)}
					</div>
					<h3 style={{marginBottom: "10px"}}>Summary</h3>
					<p style={{marginTop: 0}}>{ticket.summary}</p>
					<h3 style={{marginBottom: "10px"}}>Suggested Solutions</h3>
					<p style={{marginTop: 0}}>{ticket.suggestedSolutions}</p>
					<h3>Creators</h3>					
					<h3 style={{marginBottom: "10px"}}>Followers</h3>
					<div>
					{ticket.userEmails.map(userEmail => <label style={{borderStyle: "solid", borderWidth: "1px", borderColor: "white"}}>{userEmail}</label>)}
					</div>
				</div>
			);
		}
		
		return (
			<div style={{borderStyle: "solid", borderWidth: "1px", borderColor: "white"}}>
				<div style={{borderStyle: "solid", borderWidth: "1px", borderColor: "white", height: "40px"}} onClick={() => {setExpanded(!expanded);}}>
					<label style={{display: "inline-block", marginRight: "10px", marginTop: "7px"}}>ID: {ticket.id}</label>
					<label style={{display: "inline-block"}}>{ticket.title}</label>
					<label style={{float: "right", marginRight: "10px", marginTop: "7px"}}>{expanded ? '^' : 'v'}</label>
				</div>
				{expanded ? <ExpandedView/> : null}
			</div>
		);
	}
	
	async function getTickets(){
		let response = null;
		try{
			/*
			Raises
			- AbortError if abort() is called
			- NotAllowedError if Topics API is blocked or Private State Token API is blocked
			- TypeError if the URL is invalid, 
				URL has credentials, request blocked, 
				there's a network error, something from Private State Token API
			*/
			response = await fetch(APIDomain + '/ticket/userViewRequests/' + userEmail);
		}catch(err){
			//Not catching AbortError because react could find its definition
			//Not catching NotAllowedError because not using the APIs
			if(err instanceof TypeError)
				return setErrorMessage("Couldn't connect to the server (fetch: TypeError).");
			else throw err;
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
			if(!response.ok) return setErrorMessage("Received HTTP status " + response.status + " from server.");
		}catch(err){
			//Not catching AbortError because react could find its definition
			if(err instanceof TypeError) return setError("Could read the request body from the server.");
			if(err instanceof SyntaxError) return setError("Could parse the request from the server.");		
			else throw err;
		}
		
		setErrorMessage('');
		if(!(objectFromResponse instanceof Array)) 
			return setErrorMessage("Server response not an Array.");
		
		const draftTicketsLocal = [];
		const newTicketsLocal = [];
		const assignedTicketsLocal = [];
		const solvingTicketsLocal = [];
		const solvedTicketsLocal = [];
		const failedTicketsLocal = [];
		
		for(const ticket of objectFromResponse){
			if(!(ticket.userEmails instanceof Array))
				setErrorMessage("Ticket has invalid .userEmails attribute.");
			
			switch(ticket.status){
				case "Draft":
					draftTicketsLocal.push(ticket);
					break;
				case "New":
					newTicketsLocal.push(ticket);
					break;
				case "Assigned":
					assignedTicketsLocal.push(ticket);
					break;
				case "Solving":
					solvingTicketsLocal.push(ticket);
					break;	
				case "Solved":
					solvedTicketsLocal.push(ticket);
					break;	
				case "Failed":
					failedTicketsLocal.push(ticket);
					break;
				default: setErrorMessage("Ticket has invalid .status attribute");
			}
		}
		setDraftTickets(draftTicketsLocal);
		setNewTickets(newTicketsLocal);
		setAssignedTickets(assignedTicketsLocal);
		setSolvingTickets(solvingTicketsLocal);
		setSolvedTickets(solvedTicketsLocal);
		setFailedTickets(failedTicketsLocal);
	}
	
	useEffect(() => {
		getTickets();
	},
	[]);
	
	return(
		<div style={{width: "50vw", height: "100vh"}}>
			<h1>Your Requests</h1>
			<h3>{draftTickets.length > 0 ? "Draft" : null}</h3>
			<div>
				{draftTickets.map(ticket => <TicketContainer ticket={ticket}/>)}
			</div>
			<h3>{newTickets.length > 0 ? "New" : null}</h3>
			<div>
				{newTickets.map(ticket => <TicketContainer ticket={ticket}/>)}
			</div>
			<p></p>
			<button onClick={redirectToHomePage}>Back to home</button>
		</div>
	);
}