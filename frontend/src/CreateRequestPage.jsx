import {useState} from 'react';

export default function CreateRequestsPage({redirectToHomePage, APIDomain}){
	//May throw undocumented exceptions

	//May throw undocumented exceptions
	const [requestText, setRequestText] = useState('');
	const [errorMessage, setErrorMessage] = useState('');
	
	async function submitRequestText(htmlEventFromForm){
		const FIRST_CHARACTER = 0;
		const MAX_REQUEST_TEXT_CHARACTERS = 2048;
		
		htmlEventFromForm.preventDefault();
		const trimmedRequestText = requestText.trim().substr(FIRST_CHARACTER, MAX_REQUEST_TEXT_CHARACTERS);
		if(trimmedRequestText.length === 0){
			setErrorMessage('Please enter the request message.');
			return;
		}
		
		let response = null;
		try{
			/*
			Raises
			- AbortError if abort() is called
			- NotAllowedError if Topics API is blocked or Private State Token API is blocked
			- TypeError if the URL is invalid, 
				URL has credentials, request blocked, 
				there's a network error, something from Private State Token API,
				or JSON.stringify has a circular reference or BigInt is passed to it
			- something from await
			*/
			response = await fetch("http://localhost:5001/ticket/userRequest", {
				method: "POST",
				headers: {"Content-Type": "application/json"},
				body: JSON.stringify({
					fromEmail: "placeholder@mail.com",
					requestText: trimmedRequestText
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
		if(response.ok) setErrorMessage('');
		else setErrorMessage("Received HTTP status " + response.status + " from server.");
	}
		
	return (
		<div>
			<h1>Create a Request (User)</h1>
				<form onSubmit={submitRequestText}>
					<input 
						value={requestText}
						onChange={htmlEvent => setRequestText(htmlEvent.target.value)}
						style={{width: '500px', height: '350px'}} 
						placeholder="Request content..."
					/>
					{/*for button to be below input box*/} <p/>
					<button>Submit request</button>
				</form>
				<p style={{color: 'red'}}>{errorMessage}</p>
			<button onClick={redirectToHomePage}>Back to Home</button>
		</div>
	);
}