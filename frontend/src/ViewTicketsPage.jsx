import { useState, useEffect } from 'react';
import { DraftTicketComponent } from './ViewTicketsPage_components.jsx';

// Construct API URL
const API_HOST = import.meta.env.VITE_API_HOST || 'localhost';
const API_PORT = import.meta.env.VITE_API_PORT || '3001';
const API_URL = `http://${API_HOST}:${API_PORT}`;

// Move sub-components outside to prevent re-creation on every render
const NewTicketComponent = ({ ticketTitle }) => (
  <div style={{ border: 'solid 2px', padding: '3px', marginBottom: '5px' }}>
    <label style={{ marginRight: '10px' }}>{ticketTitle}</label>
  </div>
);

export default function ViewTicketsPage({ redirectToHomePage }) {
  const [tickets, setTickets] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllTickets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/ticket/admin`);
      
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data.tickets)) {
        throw new Error("Invalid data format: .tickets is not an array.");
      }

      setTickets(data.tickets);
      setErrorMessage('');
    } catch (err) {
      // Friendly mapping of technical errors
      if (err instanceof TypeError) {
        setErrorMessage("Network error: Could not connect to server.");
      } else if (err instanceof SyntaxError) {
        setErrorMessage("Parse error: Received invalid JSON from server.");
      } else {
        setErrorMessage(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTickets();
  }, []);

  // Derive filtered lists during render rather than storing them in state
  const draftTickets = tickets.filter(t => t.type === 'draft');
  const otherTickets = tickets.filter(t => t.type !== 'draft');

  return (
    <div>
      <h1>View Tickets (Admin)</h1>

      <section>
        <h2>Tickets</h2>
        {otherTickets.length > 0 ? (
          otherTickets.map(ticket => (
            <NewTicketComponent 
              key={ticket.id} 
              ticketTitle={ticket.title} 
            />
          ))
        ) : (
          <p>No tickets.</p>
        )}
      </section>

      <section>
        <h2>Draft Tickets</h2>
        {draftTickets.length > 0 ? (
          draftTickets.map(ticket => (
            <DraftTicketComponent
              key={ticket.id}
              ticketTitle={ticket.title}
              ticketID={ticket.id}
              setErrorMessage={setErrorMessage}
            />
          ))
        ) : (
          <p>No draft tickets.</p>
        )}
      </section>

      {errorMessage && <p style={{ color: 'red', fontWeight: 'bold' }}>{errorMessage}</p>}
      
      {isLoading && <p>Loading tickets...</p>}

      <button onClick={redirectToHomePage} style={{ marginTop: '20px' }}>
        Back to home
      </button>
    </div>
  );
}