import { useState, useEffect } from 'react';

// Construct API URL
const API_HOST = import.meta.env.VITE_API_HOST || 'localhost';
const API_PORT = import.meta.env.VITE_API_PORT || '3001';
const API_URL = `http://${API_HOST}:${API_PORT}`;

function DraftTicketComponent({ draftTicket, removeSelf }) {
	const [expanded, setExpanded] = useState(false);

	const cardStyle = {
		border: "1px solid #e0e0e0",
		borderRadius: "6px",
		marginBottom: "10px",
		backgroundColor: "#f9f9f9",
		overflow: "hidden"
	};

	const headerStyle = {
		padding: "12px 15px",
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		cursor: "pointer",
		backgroundColor: expanded ? "#eef2f6" : "transparent",
		transition: "background-color 0.2s"
	};

	const contentStyle = {
		padding: "15px",
		borderTop: "1px solid #e0e0e0",
		backgroundColor: "#fff",
		fontSize: "0.9rem",
		color: "#333"
	};

	function ExpandedView() {
		return (
			<div style={contentStyle}>
				<h5 style={{ margin: "0 0 5px 0", color: "#555" }}>Content/Summary</h5>
				<p style={{ margin: "0 0 15px 0", whiteSpace: "pre-wrap" }}>{draftTicket.summary}</p>

				<h5 style={{ margin: "0 0 5px 0", color: "#555" }}>Suggested solutions</h5>
				<p style={{ margin: "0", whiteSpace: "pre-wrap" }}>{draftTicket.suggestedSolutions}</p>
			</div>
		);
	}

	return (
		<div style={cardStyle}>
			<div style={headerStyle} onClick={() => setExpanded(!expanded)}>
				<div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
					<span style={{ fontWeight: "bold", color: "#666", minWidth: "30px" }}>#{draftTicket.id}</span>
					<span style={{ fontWeight: "500" }}>{draftTicket.title}</span>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
					<button
						style={{
							background: '#ff6b6b',
							color: 'white',
							border: 'none',
							borderRadius: '4px',
							padding: '4px 8px',
							fontSize: '11px',
							fontWeight: 'bold',
							cursor: 'pointer'
						}}
						onClick={(e) => { e.stopPropagation(); removeSelf(draftTicket.id); }}
					>
						UNLINK
					</button>
					<span style={{ color: "#888", fontSize: "12px" }}>{expanded ? '▲' : '▼'}</span>
				</div>
			</div>
			{expanded ? <ExpandedView /> : null}
		</div>
	);
}

function BubbleWithRemovalButton({ text, removeSelf }) {
	return (
		<div style={{
			display: "inline-flex",
			alignItems: "center",
			marginRight: "8px",
			marginBottom: "8px",
			padding: "6px 12px",
			borderRadius: "16px",
			backgroundColor: "#e0e0e0",
			color: "#333",
			fontSize: "14px"
		}}>
			<span style={{ marginRight: "8px" }}>{text}</span>
			<button
				style={{
					background: "none",
					border: "none",
					cursor: "pointer",
					color: "#666",
					fontWeight: "bold",
					padding: 0,
					display: "flex",
					alignItems: "center"
				}}
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
	const styles = {
		overlay: {
			position: 'fixed',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			backgroundColor: 'rgba(0, 0, 0, 0.6)',
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center',
			zIndex: 1000,
			backdropFilter: 'blur(3px)'
		},
		modal: {
			backgroundColor: 'white',
			borderRadius: '8px',
			boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
			width: '90%',
			maxWidth: '800px',
			maxHeight: '90vh',
			display: 'flex',
			flexDirection: 'column',
			padding: '25px',
			color: '#333'
		},
		header: {
			display: 'flex',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: '20px',
			borderBottom: '1px solid #eee',
			paddingBottom: '15px'
		},
		scrollArea: {
			overflowY: 'auto',
			paddingRight: '10px',
			flex: 1
		},
		input: {
			width: '100%',
			padding: '10px',
			borderRadius: '4px',
			border: '1px solid #ccc',
			fontSize: '16px',
			marginBottom: '15px',
			boxSizing: 'border-box'
		},
		textarea: {
			width: '100%',
			padding: '10px',
			borderRadius: '4px',
			border: '1px solid #ccc',
			fontSize: '14px',
			minHeight: '100px',
			resize: 'vertical',
			marginBottom: '15px',
			fontFamily: 'inherit',
			boxSizing: 'border-box'
		},
		label: {
			display: 'block',
			fontWeight: '600',
			marginBottom: '8px',
			color: '#444'
		},
		primaryBtn: {
			backgroundColor: '#1976d2',
			color: 'white',
			border: 'none',
			padding: '10px 20px',
			borderRadius: '4px',
			fontSize: '16px',
			cursor: 'pointer',
			fontWeight: '600',
			marginTop: '10px',
			alignSelf: 'flex-end'
		}
	};

	return (
		<div style={styles.overlay}>
			<div style={styles.modal}>
				<div style={styles.header}>
					<h2 style={{ margin: 0, fontSize: "24px" }}>Merge Tickets</h2>
					<button onClick={() => closeWindow(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#888' }}>✕</button>
				</div>

				{errorMessage && <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>{errorMessage}</div>}

				<div style={styles.scrollArea}>
					<label style={styles.label}>Title</label>
					<input
						style={styles.input}
						value={titleText}
						onChange={e => setTitleText(e.target.value.slice(0, MAX_TITLE))}
						placeholder="Ticket Title"
					/>

					<label style={styles.label}>Categories</label>
					<div style={{ marginBottom: "15px", display: 'flex', flexWrap: 'wrap' }}>
						{categories.map(cat => (
							<BubbleWithRemovalButton key={cat} text={cat} removeSelf={(c) => setCategories(prev => prev.filter(i => i !== c))} />
						))}
						{categories.length === 0 && <span style={{ color: '#888', fontStyle: 'italic' }}>No categories</span>}
					</div>

					<label style={styles.label}>Content / Summary</label>
					<textarea
						style={styles.textarea}
						value={contentText}
						onChange={e => setContentText(e.target.value.slice(0, MAX_BODY))}
						placeholder="Summary of the merged request..."
					/>

					<label style={styles.label}>Suggested Solutions</label>
					<textarea
						style={styles.textarea}
						value={suggestedSolutionsText}
						onChange={e => setSuggestedSolutionsText(e.target.value.slice(0, MAX_BODY))}
						placeholder="Proposed solutions..."
					/>

					<label style={styles.label}>Merging From ({mergingDraftTickets.length})</label>
					<div>
						{mergingDraftTickets.map(dt => (
							<DraftTicketComponent key={dt.id} draftTicket={dt} removeSelf={removeDraftFromMerge} />
						))}
					</div>
				</div>

				<div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '15px', borderTop: '1px solid #eee' }}>
					<button onClick={sendMergeRequest} style={styles.primaryBtn}>Confirm Merge</button>
				</div>
			</div>
		</div>
	);
}