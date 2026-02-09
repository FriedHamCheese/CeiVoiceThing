import React, { useCallback } from 'react';

// Construct API URL
const API_HOST = import.meta.env.VITE_API_HOST || 'localhost';
const API_PORT = import.meta.env.VITE_API_PORT || '3001';
const API_URL = `http://${API_HOST}:${API_PORT}`;

/**
 * Service function to handle the API request.
 * Decoupling this makes it easier to test and reuse.
 */
async function promoteTicketToNew(ticketID) {
  const url = `${API_URL}/ticket/toNewTicket`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketID }),
  });

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
  }

  return response;
}

export function DraftTicketComponent({ ticketTitle, ticketID, setErrorMessage }) {
  
  const handleRequestChange = useCallback(async () => {
    try {
      await promoteTicketToNew(ticketID);
      setErrorMessage(''); // Clear errors on success
    } catch (err) {
      // Handle network/connection errors
      if (err instanceof TypeError) {
        setErrorMessage("Network error: Could not connect to the server.");
      } 
      // Handle the custom HTTP error thrown above
      else if (err.message.includes('HTTP Error')) {
        setErrorMessage(`Server error: ${err.message}`);
      } 
      // Fallback for unexpected issues
      else {
        setErrorMessage("An unexpected error occurred.");
        console.error("DraftTicketComponent Error:", err);
      }
    }
  }, [ticketID, setErrorMessage]);

  const containerStyle = {
    border: '2px solid black',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px'
  };

  return (
    <div style={containerStyle}>
      <label>{ticketTitle}</label>
      <button onClick={handleRequestChange}>
        To New Ticket
      </button>
    </div>
  );
}