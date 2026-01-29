export function DraftTicketComponent({ticketTitle, ticketID, APIDomain, setErrorMessage}){
	//May throw undocumented exceptions
	
	async function requestChangeToNewTicket(){
		//May throw undocumented exceptions
		
		let response = null;
		/*
		Raises
		- AbortError if abort() is called
		- NotAllowedError if Topics API is blocked or Private State Token API is blocked
		- TypeError if the URL is invalid, 
			URL has credentials, request blocked, 
			there's a network error, something from Private State Token API,
			JSON.stringify got a circular reference or a BigInt
		- something from await
		*/
		try{
			response = await fetch(APIDomain + "/ticket/toNewTicket", {
					method: 'POST',
					headers: {'Content-Type': 'application/json'},
					body: JSON.stringify({
						ticketID: ticketID
				})
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
		
		setErrorMessage('');
	}
	
	return (
		<div style={{border: 'solid', borderWidth: '2px', padding: '3px'}}>
			<label style={{marginRight: '10px'}}>{ticketTitle}</label>
			<button onClick={requestChangeToNewTicket}>To New Ticket</button>
		</div>
	);
}