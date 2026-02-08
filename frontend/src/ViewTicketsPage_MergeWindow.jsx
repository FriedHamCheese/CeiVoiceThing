import {useState, useEffect} from 'react';

function DraftTicketComponent({draftTicket, removeSelf}){
	const [expanded, setExpanded] = useState(false);
	
	function ExpandedView(){
		return (
			<div>
				<h5 style={{marginTop: "10px"}}>Content/Summary</h5>
				<p style={{overflowY: "auto", width: "95%", height: "100px", padding: "10px", backgroundColor: "#222222"}}
				>{draftTicket.summary}</p>
				<h5 style={{marginTop: "15px"}}>Suggested solutions</h5>
				<p style={{overflowY: "auto", width: "95%", height: "100px", padding: "10px", backgroundColor: "#222222"}}>
				{draftTicket.suggestedSolutions}</p>
			</div>
		);
	}
	
	return (
		<div style={{borderWidth: "1px", borderColor: "#FFFFFF", borderStyle: "solid", width: "87%", paddingLeft: "12px"}}>
			<div style={{height: "50px"}} onClick={() => setExpanded(!expanded)}>
				<label style={{width: "50px", display: "inline-block", marginTop: "12px", marginBottom: 0}}>ID: {draftTicket.id}</label>
				<label style={{marginLeft: "20px"}}>{draftTicket.title}</label>
				<label style={{float: "right", marginRight: "20px", marginTop: "12px"}}>{expanded ? '^' : 'v'}</label>
				<button style={{float: "right", marginRight: "30px", color: "red", fontWeight: "bold", height: "100%", width: "auto", display: "inline"}}>X</button>
			</div>
			{expanded ? <ExpandedView/> : null}
		</div>
	);
}

function BubbleWithRemovalButton({text, removeSelf}){
	return (
		<div style={{
			display: "inline-block", 
			marginRight: "10px", 
			paddingLeft: "15px", 
			borderRadius: "20px", borderStyle: "solid", borderWidth: "1px", borderColor: "white"
		}}>
			<label style={{marginRight: "15px", fontWeight: "bold"}}>{text}</label>
			<button style={{marginRight: "10px", height: "100%", padding: 0, width: "20px"}} onClick={() => removeSelf(text)}>x</button>
		</div>
	);
}

const mergeWindowPopupBackgroundStyle = {
	overflowY: "auto",
	position: "absolute",
	top: "12vh",
	left: "12vw",
	width: "75vw",
	height: "75vh", 
	
	paddingTop: "0px",
	paddingLeft: "5%", 
	paddingBottom: "5%",
	
	backgroundColor: "rgba(26,26,26,1)",
};
const mergeWindowTicketNameInputStyle = {
	display: "inline-block",
	
	marginBottom: "10px",
	width: "70%",
	
	borderWidth: 0,
	fontSize: "30px",
	fontWeight: "bold",
	textDecoration: "underline",
	
	backgroundColor: "rgba(0,0,0,0)",
};
const mergeButtonStyle = {
	float: "right",
	display: "inline-block", 
	marginRight: "12%",
	
	backgroundColor: "white",
	color: "black"
};
const summarytextAreaStyle = {
	overflowY: "auto",
	boxSizing: "border-box",
	width: "87%", 
	height: "100px", 
	padding: "15px", 
	
	borderWidth: "1px", 
	borderColor: "#FFFFFF", 
	borderStyle: "solid", 
	backgroundColor: "#222222", 
};

const suggestedSolutionsTextAreaStyle = {
	overflowY: "auto",
	boxSizing: "border-box",
	width: "87%", 
	height: "100px", 
	padding: "15px", 
	
	borderWidth: "1px", 
	borderColor: "#FFFFFF", 
	borderStyle: "solid", 
	backgroundColor: "#222222", 
}



export default function MergeWindow({closeWindow, APIDomain, draftTicketIDsForMerging, setDraftTicketIDsForMerging}){
	const [contentText, setContentText] = useState("");
	const [suggestedSolutionsText, setSuggestedSolutionsText] = useState("");
	const [titleText, setTitleText] = useState("");
	const [categories, setCategories] = useState([]);
	
	const [draftTicketComponentsForMerging, setDraftTicketComponentsForMerging] = useState([]);
	const [refresh, setRefresh] = useState(true);
	
	const FIRST_CHARACTER = 0;
	const MAX_TITLE_CHARACTERS = 128;
	const MAX_CONTENT_CHARACTERS = 2048;
	const MAX_SOLUTIONS_CHARACTERS = 2048;
	
	async function getDraftTicket(draftTicketID){
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
			response = await fetch(APIDomain + '/ticket/getDraftTicket/' + draftTicketID);
		}catch(err){
			//Not catching AbortError because react could find its definition
			//Not catching NotAllowedError because not using the APIs
			if(err instanceof TypeError)
				return {error: "Couldn't connect to the server (fetch: TypeError)."};
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
			if(!response.ok) return {error: "Received HTTP status " + response.status + " from server."};
			return objectFromResponse;
		}catch(err){
			//Not catching AbortError because react could find its definition
			if(err instanceof TypeError) return {error: "Could read the request body from the server."};
			if(err instanceof SyntaxError) return {error: "Could parse the request from the server."};		
			else throw err;
		}
	}
	
	async function sendMergeRequest(){
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
			response = await fetch(APIDomain + '/ticket/admin/merge/', {
				method: "POST",
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({
					draftTicketIDs: draftTicketIDsForMerging,
					title: titleText,
					summary: contentText,
					categories: categories,
					suggestedSolutions: suggestedSolutionsText,
				}),
			});
		}catch(err){
			//Not catching AbortError because react could find its definition
			//Not catching NotAllowedError because not using the APIs
			if(err instanceof TypeError)
				return setErrorMessage("Couldn't connect to the server (fetch: TypeError).");
			else throw err;
		}
		
		if(response.ok) return;
		
		let objectFromResponse = null;
		try{
			/*
			Raises
			- AbortError if abort() is called
			- TypeError if the request body couldn't be read
			- SyntaxError if the body couldn't be parsed as json
			*/
			objectFromResponse = await response.json();
			setErrorMessage(objectFromResponse.error);
		}catch(err){
			//Not catching AbortError because react could find its definition
			if(err instanceof TypeError) setErrorMessage("Could read the request body from the server.");
			if(err instanceof SyntaxError) setErrorMessage("Could parse the request from the server.");		
			else throw err;
		}		
	}
	
	function removeCategory(category){
		const indexOfCategory = categories.indexOf(category);
		const REMOVE_ONE_ELEMENT_AT_INDEX = 1;
		const categoriesRemovedElement = categories.toSpliced(indexOfCategory, REMOVE_ONE_ELEMENT_AT_INDEX);
		setCategories(categoriesRemovedElement);
	}
	
	useEffect(() => {
		async function getMergingDraftTickets(){	
			const draftTickets = [];
			for(const draftTicketID of draftTicketIDsForMerging){
				const draftTicket = await getDraftTicket(draftTicketID);
				const failedToFetch = draftTicket.error !== undefined;
				if(failedToFetch) return;
				draftTickets.push(draftTicket);
			}
	
			const primaryDraftTicketForMerging = draftTickets[0];
			setContentText(primaryDraftTicketForMerging.summary);
			setTitleText(primaryDraftTicketForMerging.title);
			setSuggestedSolutionsText(primaryDraftTicketForMerging.suggestedSolutions);
			
			const categoryElementsLocal = [];
			setCategories(primaryDraftTicketForMerging.categories);
			
			const draftTicketComponentsLocal = [];
			for(const draftTicket of draftTickets){
				const draftTicketComponent = <DraftTicketComponent draftTicket={draftTicket}/>
				draftTicketComponentsLocal.push(draftTicketComponent);
			}
			setDraftTicketComponentsForMerging(draftTicketComponentsLocal);
		}
		getMergingDraftTickets();
	}, []);

	return(
		<div className="mergeWindowPopupBackground" style={mergeWindowPopupBackgroundStyle}>
			<button onClick={() => {closeWindow(false)}} style={{float: "right", margin: "20px"}}>x</button>
			<h2 style={{marginBottom: "10px", fontSize: "36px"}}>Merging Draft Ticket </h2>
			<input 
				onChange={htmlEvent => setTitleText(htmlEvent.target.value.substr(FIRST_CHARACTER, MAX_TITLE_CHARACTERS))} 
				value={titleText}
				style={mergeWindowTicketNameInputStyle}
			/>
			<button onClick={sendMergeRequest} style={mergeButtonStyle}>Merge</button>
			<h3>Assignees</h3>
			<h3 style={{marginBottom: "5px"}}>Categories</h3>
			{categories.map(category => <BubbleWithRemovalButton text={category} removeSelf={removeCategory}/>)}
			<h3>Content/Summary</h3>
			<textarea 
				value={contentText}
				onChange={htmlEvent => setContentText(htmlEvent.target.value.substr(FIRST_CHARACTER, MAX_CONTENT_CHARACTERS))}
				style={summarytextAreaStyle}
			/>
			<h3>Suggested solutions</h3>			
			<textarea 
				value={suggestedSolutionsText}
				onChange={htmlEvent => setSuggestedSolutionsText(htmlEvent.target.value.substr(FIRST_CHARACTER, MAX_SOLUTIONS_CHARACTERS))}
				style={suggestedSolutionsTextAreaStyle}
			/>
			<h3>Merging from</h3>	
			{draftTicketComponentsForMerging}
		</div>
	);
}