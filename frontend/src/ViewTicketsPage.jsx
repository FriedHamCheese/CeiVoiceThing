import { useState, useEffect } from 'react';
import { DraftTicketComponent } from './ViewTicketsPage_components.jsx';
import MergeWindow from './ViewTicketsPage_MergeWindow.jsx';
import { 
  Container, Typography, Box, Button, Stack, Dialog, 
  DialogTitle, DialogContent, DialogContentText, DialogActions, 
  Card, CardContent, CardActions, Chip, CircularProgress, Alert 
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Construct API URL
const API_HOST = import.meta.env.VITE_API_HOST || 'localhost';
const API_PORT = import.meta.env.VITE_API_PORT || '3001';
const API_URL = `http://${API_HOST}:${API_PORT}`;

// Move sub-components outside to prevent re-creation on every render
const NewTicketComponent = ({ ticket, onView }) => (
  <Card variant="outlined" sx={{ display: 'flex', alignItems: 'center', p: 1, pl: 2 }}>
    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>{ticket.title}</Typography>
    </Box>
    <Button size="small" startIcon={<VisibilityIcon />} onClick={() => onView(ticket)}>
      View
    </Button>
  </Card>
);

export default function ViewTicketsPage({ redirectToHomePage }) {
  const [tickets, setTickets] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDraftIds, setSelectedDraftIds] = useState(new Set());
  const [showMergeWindow, setShowMergeWindow] = useState(false);
  const [viewingTicket, setViewingTicket] = useState(null);

  const fetchAllTickets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/tickets`);
      
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

  const handleToggleSelect = (id) => {
    const newSet = new Set(selectedDraftIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedDraftIds(newSet);
  };

  // Derive filtered lists during render rather than storing them in state
  const draftTickets = tickets.filter(t => t.type === 'draft');
  const otherTickets = tickets.filter(t => t.type !== 'draft');

  return (
    <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="left" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Admin Dashboard
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={redirectToHomePage}
        >
          Back to Home
        </Button>
      </Box>

      {errorMessage && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>}
      
      {isLoading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
        <Typography variant="h5" sx={{ mb: 2, mt: 4 }}>Active Tickets</Typography>
        {otherTickets.length > 0 ? (
          <Stack spacing={2}>
            {otherTickets.map(ticket => (
              <NewTicketComponent 
                key={ticket.id} 
                ticket={ticket} 
                onView={setViewingTicket}
              />
            ))}
          </Stack>
        ) : (
          <Typography color="text.secondary" fontStyle="italic">No active tickets.</Typography>
        )}

        <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2, mt: 4 }}>
          <Typography variant="h5">Draft Tickets</Typography>
          <Button 
            variant="contained"
            onClick={() => setShowMergeWindow(true)} 
            disabled={selectedDraftIds.size < 2}
          >
            Merge Selected ({selectedDraftIds.size})
          </Button>
        </Box>
        
        {draftTickets.length > 0 ? (
          <Stack spacing={2}>
            {draftTickets.map(ticket => (
              <DraftTicketComponent
                key={ticket.id}
                ticket={ticket}
                setErrorMessage={setErrorMessage}
                isSelected={selectedDraftIds.has(ticket.id)}
                onToggleSelect={() => handleToggleSelect(ticket.id)}
                onView={setViewingTicket}
              />
            ))}
          </Stack>
        ) : (
          <Typography color="text.secondary" fontStyle="italic">No draft tickets.</Typography>
        )}
        </>
      )}

      {showMergeWindow && (
        <MergeWindow 
          closeWindow={setShowMergeWindow} 
          draftTicketIDsForMerging={Array.from(selectedDraftIds)} 
        />
      )}

      {/* View Ticket Dialog */}
      <Dialog open={!!viewingTicket} onClose={() => setViewingTicket(null)} fullWidth maxWidth="sm">
        <DialogTitle>{viewingTicket?.title}</DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ color: 'text.primary', mb: 1 }}>
            <strong>Content:</strong>
          </DialogContentText>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
            {viewingTicket?.summary || viewingTicket?.requestContents || "No content available."}
          </Typography>
          
          {viewingTicket?.suggestedSolutions && (
            <>
              <DialogContentText sx={{ color: 'text.primary', mb: 1 }}>
                <strong>Suggested Solutions:</strong>
              </DialogContentText>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {viewingTicket.suggestedSolutions}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingTicket(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}