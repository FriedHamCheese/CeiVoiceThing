import React, { useCallback } from 'react';
import { Card, Box, Typography, Button, Checkbox, Chip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';

// Construct API URL
const API_HOST = import.meta.env.VITE_API_HOST || 'localhost';
const API_PORT = import.meta.env.VITE_API_PORT || '3001';
const API_URL = `http://${API_HOST}:${API_PORT}`;

/**
 * Service function to handle the API request.
 * Decoupling this makes it easier to test and reuse.
 */
async function promoteTicketToNew(ticketID) {
  const url = `${API_URL}/admin/tickets/toNewTicket`;
  
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

export function DraftTicketComponent({ ticket, setErrorMessage, isSelected, onToggleSelect, onView }) {
  
  const handleRequestChange = useCallback(async () => {
    try {
      await promoteTicketToNew(ticket.id);
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
  }, [ticket.id, setErrorMessage]);

  return (
    <Card variant="outlined" sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
      {onToggleSelect && (
        <Checkbox
          checked={isSelected || false}
          onChange={onToggleSelect}
        />
      )}
      
      <Box sx={{ flexGrow: 1, ml: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="subtitle1" component="div" sx={{ fontWeight: 500 }}>
          {ticket.title}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button 
          size="small" 
          startIcon={<VisibilityIcon />} 
          onClick={() => onView(ticket)}
        >
          View
        </Button>
        <Button 
          size="small" 
          variant="contained" 
          color="success" 
          startIcon={<ArrowUpwardIcon />} 
          onClick={handleRequestChange}
        >
          Promote
        </Button>
      </Box>
    </Card>
  );
}