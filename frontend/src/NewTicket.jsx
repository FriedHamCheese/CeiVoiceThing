import { Box, TextField, Typography, Alert, Stack, Button, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import React from 'react';
import { useNewTicket } from './utils/newTicketLogic';
import { useAuth } from './context/AuthContext';

const CreateUserRequestContainer = ({ userEmail }) => {
  const {
    requestText,
    status, setStatus,
    isSubmitting,
    handleTextChange,
    submitRequestText,
    MAX_CHARACTERS
  } = useNewTicket(userEmail);

  return (
    <Box component="form" onSubmit={submitRequestText} noValidate>
      <Stack spacing={3}>
        <Typography variant="h5" component="h2" fontWeight="500" color="black">
          Create a new request
        </Typography>

        <TextField
          fullWidth
          multiline
          rows={5}
          label="Request Details"
          placeholder="Describe your request in detail..."
          value={requestText}
          onChange={handleTextChange}
          disabled={isSubmitting}
          inputProps={{ maxLength: MAX_CHARACTERS }}
          helperText={`${requestText.length}/${MAX_CHARACTERS} characters`}
          // Highlight red if it somehow exceeds limit
          error={requestText.length > MAX_CHARACTERS}
        />

        {status.message && (
          <Alert severity={status.type || "info"} variant="outlined">
            {status.message}
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            disabled={!requestText.trim() || isSubmitting}
            endIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            sx={{ minWidth: 150 }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default function MyRequestsPage() {
  const { user } = useAuth();
  return (
    <main className="page-padding">
      <CreateUserRequestContainer userEmail={user?.email} />
    </main>
  );
}
