import React, { useState } from 'react';
import { Box, TextField, Typography, Alert, Stack } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import SendIcon from '@mui/icons-material/Send';

const MAX_CHARACTERS = 2048;

const CreateUserRequestContainer = ({ APIDomain }) => {
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
      const response = await fetch(`${APIDomain}/ticket/userRequest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromEmail: "placeholder@mail.com",
          requestText: trimmedText.substring(0, MAX_CHARACTERS)
        })
      });

      if (response.ok) {
        setRequestText('');
        setStatus({ type: 'success', message: 'Request submitted successfully!' });
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
          <LoadingButton
            type="submit"
            variant="contained"
            loading={isSubmitting}
            loadingPosition="end"
            endIcon={<SendIcon />}
            disabled={!requestText.trim()}
            sx={{ minWidth: 150 }}
          >
            Submit Request
          </LoadingButton>
        </Box>
      </Stack>
    </Box>
  );
};

export default function MyRequestsPage({ APIDomain = "http://localhost:5001" }) {
  return (
    <main style={{ padding: '20px' }}>
       <CreateUserRequestContainer APIDomain={APIDomain} />
    </main>
  );
}