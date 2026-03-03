import React, { useState, useMemo } from 'react';
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
import { z } from 'zod';
import { useAuth } from './context/AuthContext';
import './styles/main.css';

const MAX_CHARACTERS = 2048;

const requestSchema = z.object({
    email: z
        .email('Please enter a valid email address.')
        .min(1, 'Email is required.'),
    problem: z
        .string()
        .min(1, 'Problem details are required.')
        .max(MAX_CHARACTERS, `Problem details must be at most ${MAX_CHARACTERS} characters.`)
});

export default function RequestWithoutLogin() {
    const { API_URL } = useAuth();
    const [email, setEmail] = useState('');
    const [problem, setProblem] = useState('');
    const [touched, setTouched] = useState({ email: false, problem: false });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '', trackingToken: '', submittedEmail: '' });

    // Validate the whole form on every change
    const validation = useMemo(() => {
        const result = requestSchema.safeParse({ email: email.trim(), problem: problem.trim() });
        if (result.success) {
            return { isValid: true, errors: {} };
        }
        const fieldErrors = {};
        for (const issue of result.error.issues) {
            const field = issue.path[0];
            if (!fieldErrors[field]) fieldErrors[field] = issue.message;
        }
        return { isValid: false, errors: fieldErrors };
    }, [email, problem]);

    const handleBlur = (field) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        // Mark all fields as touched so errors show
        setTouched({ email: true, problem: true });

        if (!validation.isValid) {
            setStatus({ type: 'error', message: 'Please fix the errors above before submitting.', trackingToken: '', submittedEmail: '' });
            return;
        }

        const normalizedEmail = email.trim();
        const normalizedProblem = problem.trim();

        setIsSubmitting(true);
        setStatus({ type: '', message: '', trackingToken: '', submittedEmail: '' });

        try {
            const response = await fetch(`${API_URL}/api/public/tickets/request`, {
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
            setTouched({ email: false, problem: false });
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
                        onBlur={() => handleBlur('email')}
                        error={touched.email && !!validation.errors.email}
                        helperText={touched.email && validation.errors.email}
                        required
                        fullWidth
                    />

                    <TextField
                        label="Problem Details"
                        multiline
                        rows={6}
                        value={problem}
                        onChange={(e) => setProblem(e.target.value)}
                        onBlur={() => handleBlur('problem')}
                        error={touched.problem && !!validation.errors.problem}
                        inputProps={{ maxLength: MAX_CHARACTERS }}
                        helperText={
                            touched.problem && validation.errors.problem
                                ? validation.errors.problem
                                : `${problem.length}/${MAX_CHARACTERS} characters`
                        }
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
                            disabled={isSubmitting || !validation.isValid}
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