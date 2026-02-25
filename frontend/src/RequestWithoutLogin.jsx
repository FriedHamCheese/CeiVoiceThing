import React, { useState } from 'react';
import {
    Typography,
    Box,
    Button,
    TextField,
    Alert,
    Paper,
    Stack,
    CircularProgress
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './styles/main.css';

const MAX_CHARACTERS = 2048;

export default function RequestWithoutLogin() {
    const { API_URL } = useAuth();
    const [email, setEmail] = useState('');
    const [problem, setProblem] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '', trackingToken: '', submittedEmail: '' });

    const handleSubmit = async (event) => {
        event.preventDefault();

        const normalizedEmail = email.trim();
        const normalizedProblem = problem.trim();

        if (!normalizedEmail || !normalizedProblem) {
            setStatus({ type: 'error', message: 'Please enter both email and problem details.', trackingToken: '', submittedEmail: '' });
            return;
        }

        setIsSubmitting(true);
        setStatus({ type: '', message: '', trackingToken: '', submittedEmail: '' });

        try {
            const response = await fetch(`${API_URL}/public/tickets/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    fromEmail: normalizedEmail,
                    requestText: normalizedProblem.substring(0, MAX_CHARACTERS)
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                setStatus({
                    type: 'error',
                    message: data.message || 'Unable to submit request right now.',
                    trackingToken: '',
                    submittedEmail: ''
                });
                return;
            }

            setEmail('');
            setProblem('');
            setStatus({
                type: 'success',
                message: 'Request submitted successfully.',
                trackingToken: data.trackingToken || '',
                submittedEmail: normalizedEmail
            });
        } catch (error) {
            setStatus({
                type: 'error',
                message: 'Network error: Could not connect to the server.',
                trackingToken: '',
                submittedEmail: ''
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box className="page-padding" sx={{ display: 'flex', justifyContent: 'center' }}>
            <Paper elevation={2} sx={{ p: 4, width: '100%', maxWidth: 760 }}>
                <Stack spacing={2.5} component="form" onSubmit={handleSubmit} noValidate>
                    <Typography variant="h4" component="h1" fontWeight="bold">
                        Submit a Request
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Enter your email and describe your problem.
                    </Typography>

                    <TextField
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        fullWidth
                    />

                    <TextField
                        label="Problem Details"
                        multiline
                        rows={6}
                        value={problem}
                        onChange={(e) => setProblem(e.target.value)}
                        inputProps={{ maxLength: MAX_CHARACTERS }}
                        helperText={`${problem.length}/${MAX_CHARACTERS} characters`}
                        required
                        fullWidth
                    />

                    {status.message && (
                        <Alert severity={status.type || 'info'}>
                            {status.message}
                            {status.type === 'success' && status.trackingToken && (
                                <>
                                    {' '}
                                    <Link to={`/track/${status.trackingToken}?email=${encodeURIComponent(status.submittedEmail)}`}>
                                        Track your request
                                    </Link>
                                </>
                            )}
                        </Alert>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={isSubmitting || !email.trim() || !problem.trim()}
                            sx={{ minWidth: 140 }}
                        >
                            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Submit'}
                        </Button>
                    </Box>
                </Stack>
            </Paper>
        </Box>
    );
}