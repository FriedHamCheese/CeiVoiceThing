import { useState, useEffect } from 'react';

// Construct API URL
const API_HOST = import.meta.env.VITE_API_HOST || 'localhost';
const API_PORT = import.meta.env.VITE_API_PORT || '3001';
const API_URL = `http://${API_HOST}:${API_PORT}`;

function DraftTicketComponent({ draftTicket, removeSelf }) {
	const [expanded, setExpanded] = useState(false);



	function ExpandedView() {
		return (
			<div className="draft-card-content">
				<h5 className="draft-content-heading">Content/Summary</h5>
				<p className="draft-content-text">{draftTicket.summary}</p>

				<h5 className="draft-content-heading">Suggested solutions</h5>
				<p className="draft-content-text">{draftTicket.suggestedSolutions}</p>
			</div>
		);
	}

	return (
		<div className="draft-card">
			<div
				className={`draft-card-header ${expanded ? 'draft-card-header-expanded' : ''}`}
				onClick={() => setExpanded(!expanded)}
			>
				<div className="draft-card-title-container">
					<span className="draft-card-id">#{draftTicket.id}</span>
					<span className="draft-card-title">{draftTicket.title}</span>
				</div>
				<div className="draft-card-actions">
					<button
						className="draft-unlink-btn"
						onClick={(e) => { e.stopPropagation(); removeSelf(draftTicket.id); }}
					>
						UNLINK
					</button>
					<span className="draft-expand-icon">{expanded ? '▲' : '▼'}</span>
				</div>
			</div>
			{expanded ? <ExpandedView /> : null}
		</div>
	);
}

function BubbleWithRemovalButton({ text, removeSelf }) {
	return (
		<div className="merge-bubble">
			<span className="merge-bubble-text">{text}</span>
			<button
				className="merge-bubble-remove"
				onClick={() => removeSelf(text)}
			>
				✕
			</button>
		</div>
	);
}

export default function MergeWindow({ closeWindow, draftTicketIDsForMerging, refreshData }) {
	const [contentText, setContentText] = useState("");
	const [suggestedSolutionsText, setSuggestedSolutionsText] = useState("");
	const [titleText, setTitleText] = useState("");
	const [categories, setCategories] = useState([]);
	const [mergingDraftTickets, setMergingDraftTickets] = useState([]);
	const [deadline, setDeadline] = useState("");
	const [assigneeEmail, setAssigneeEmail] = useState("");
	const [errorMessage, setErrorMessage] = useState("");

	const MAX_TITLE = 128;
	const MAX_BODY = 2048;

	async function getDraftTicket(draftTicketID) {
		let response = null;
		try {
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
			response = await fetch(`${API_URL}/tickets/getDraftTicket/${draftTicketID}`);
		} catch (err) {
			//Not catching AbortError because react could find its definition
			//Not catching NotAllowedError because not using the APIs
			if (err instanceof TypeError)
				return { error: "Couldn't connect to the server (fetch: TypeError)." };
			else throw err;
		}

		let objectFromResponse = null;
		try {
			/*
			Raises
			- AbortError if abort() is called
			- TypeError if the request body couldn't be read
			- SyntaxError if the body couldn't be parsed as json
			*/
			objectFromResponse = await response.json();
			if (!response.ok) return { error: "Received HTTP status " + response.status + " from server." };
			return objectFromResponse;
		} catch (err) {
			//Not catching AbortError because react could find its definition
			if (err instanceof TypeError) return { error: "Could read the request body from the server." };
			if (err instanceof SyntaxError) return { error: "Could parse the request from the server." };
			else throw err;
		}
	}

	async function sendMergeRequest() {
		let response = null;
		try {
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
			response = await fetch(`${API_URL}/admin/tickets/merge/`, {
				method: "POST",
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					draftTicketIDs: mergingDraftTickets.map(dt => dt.id),
					title: titleText,
					summary: contentText,
					categories: categories,
					suggestedSolutions: suggestedSolutionsText,
					deadline: deadline,
					assigneeEmail: assigneeEmail
				}),
			});
		} catch (err) {
			//Not catching AbortError because react could find its definition
			//Not catching NotAllowedError because not using the APIs
			if (err instanceof TypeError)
				return setErrorMessage("Couldn't connect to the server (fetch: TypeError).");
			else throw err;
		}

		if (response.ok) {
			if (refreshData) refreshData();
			closeWindow(false);
			return;
		}

		let objectFromResponse = null;
		try {
			/*
			Raises
			- AbortError if abort() is called
			- TypeError if the request body couldn't be read
			- SyntaxError if the body couldn't be parsed as json
			*/
			objectFromResponse = await response.json();
			setErrorMessage(objectFromResponse.error);
		} catch (err) {
			//Not catching AbortError because react could find its definition
			if (err instanceof TypeError) setErrorMessage("Could read the request body from the server.");
			if (err instanceof SyntaxError) setErrorMessage("Could parse the request from the server.");
			else throw err;
		}
	}

	function removeCategory(category) {
		const indexOfCategory = categories.indexOf(category);
		const REMOVE_ONE_ELEMENT_AT_INDEX = 1;
		const categoriesRemovedElement = categories.toSpliced(indexOfCategory, REMOVE_ONE_ELEMENT_AT_INDEX);
		setCategories(categoriesRemovedElement);
	}

	function removeDraftFromMerge(id) {
		const newDrafts = mergingDraftTickets.filter(dt => dt.id !== id);
		if (newDrafts.length < 2) {
			closeWindow(false);
			return;
		}
		setMergingDraftTickets(newDrafts);
	}

	useEffect(() => {
		async function getMergingDraftTickets() {
			const draftTickets = [];
			for (const draftTicketID of draftTicketIDsForMerging) {
				const draftTicket = await getDraftTicket(draftTicketID);
				if (!draftTicket.error) draftTickets.push(draftTicket);
			}

			if (draftTickets.length > 0) {
				const primary = draftTickets[0];
				setContentText(primary.summary);
				setTitleText(primary.title);
				setSuggestedSolutionsText(primary.suggestedSolutions);
				setCategories(primary.categories);
				setDeadline(primary.deadline ? primary.deadline.split('T')[0] : "");
				setAssigneeEmail(primary.assigneeEmail || "");
				setMergingDraftTickets(draftTickets);
			}
		}
		getMergingDraftTickets();
	}, [draftTicketIDsForMerging]);

	// Styles for the modal


	return (
		<div className="merge-overlay">
			<div className="merge-modal">
				<div className="merge-header">
					<h2>Merge Tickets</h2>
					<button onClick={() => closeWindow(false)} className="merge-close-btn">✕</button>
				</div>

				{errorMessage && <div className="merge-error">{errorMessage}</div>}

				<div className="merge-scroll-area">
					<label className="merge-label">Title</label>
					<input
						className="merge-input"
						value={titleText}
						onChange={e => setTitleText(e.target.value.slice(0, MAX_TITLE))}
						placeholder="Ticket Title"
					/>

					<label className="merge-label">Categories</label>
					<div className="merge-categories-container">
						{categories.map(cat => (
							<BubbleWithRemovalButton key={cat} text={cat} removeSelf={(c) => setCategories(prev => prev.filter(i => i !== c))} />
						))}
						{categories.length === 0 && <span className="merge-no-categories">No categories</span>}
					</div>

					<label className="merge-label">Content / Summary</label>
					<textarea
						className="merge-textarea"
						value={contentText}
						onChange={e => setContentText(e.target.value.slice(0, MAX_BODY))}
						placeholder="Summary of the merged request..."
					/>

					<label className="merge-label">Suggested Solutions</label>
					<textarea
						className="merge-textarea"
						value={suggestedSolutionsText}
						onChange={e => setSuggestedSolutionsText(e.target.value.slice(0, MAX_BODY))}
						placeholder="Proposed solutions..."
					/>

					<label className="merge-label">Merging From ({mergingDraftTickets.length})</label>
					<div>
						{mergingDraftTickets.map(dt => (
							<DraftTicketComponent key={dt.id} draftTicket={dt} removeSelf={removeDraftFromMerge} />
						))}
					</div>
				</div>

				<div className="merge-footer">
					<button onClick={sendMergeRequest} className="merge-primary-btn">Confirm Merge</button>
				</div>
			</div>
		</div>
	);
}