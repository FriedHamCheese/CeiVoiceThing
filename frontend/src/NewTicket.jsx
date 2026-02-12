import { Box, TextField, Typography, Alert, Stack, Button, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import React, { useState, useRef } from 'react';
// Construct API URL
const API_HOST = import.meta.env.VITE_API_HOST || 'localhost';
const API_PORT = import.meta.env.VITE_API_PORT || '3001';
const API_URL = `http://${API_HOST}:${API_PORT}`;

const MAX_CHARACTERS = 2048;

const CreateUserRequestContainer = ({ userEmail }) => {
  const [requestText, setRequestText] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' }); // 'error' or 'success'
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTextChange = (e) => {
    setRequestText(e.target.value);
    if (status.message) setStatus({ type: '', message: '' }); // Clear errors when user types
  };

  const submitRequestText = async (e) => {
    e.preventDefault();
    const trimmedText = requestText.trim();

    if (!trimmedText) {
      setStatus({ type: 'error', message: 'Please enter the request message.' });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`${API_URL}/tickets/userRequest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromEmail: userEmail,
          requestText: trimmedText.substring(0, MAX_CHARACTERS)
        })
      });

      if (response.ok) {
        const data = await response.json();
        const trackingToken = data.trackingToken;
        setRequestText('');
        setStatus({
          type: 'success',
          message: trackingToken
            ? <span>Request submitted successfully! <a href={`/track/${trackingToken}?email=${encodeURIComponent(userEmail)}`} target="_blank" rel="noopener noreferrer" className="link-bold">Track your request here</a></span>
            : 'Request submitted successfully!'
        });
      } else {
        setStatus({ type: 'error', message: `Server Error: ${response.status}` });
      }
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof TypeError ? "Network error: Connection failed." : "An unexpected error occurred."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

export default function MyRequestsPage({ user }) {
  return (
    <main className="page-padding">
      <CreateUserRequestContainer userEmail={user?.email} />
    </main>
  );
}