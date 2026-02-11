import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
    Container, Typography, Box, TextField,
    Button, CircularProgress, Alert, Stepper, Step, StepLabel,
    Chip, Divider, List, ListItem, ListItemText, Stack,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';

const API_HOST = import.meta.env.VITE_API_HOST || 'localhost';
const API_PORT = import.meta.env.VITE_API_PORT || '3001';
const API_URL = `http://${API_HOST}:${API_PORT}`;

export default function TrackTicket({ token: propToken, user }) {
    const { token: urlToken } = useParams();
    const tokenFromParams = propToken || urlToken;
    const [searchParams] = useSearchParams();

    // State
    const [inputToken, setInputToken] = useState(tokenFromParams || '');
    const [email, setEmail] = useState(searchParams.get('email') || (user ? user.email : ''));
    const [ticketStatus, setTicketStatus] = useState(null);
    const [userTickets, setUserTickets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [newComment, setNewComment] = useState('');
    const [commentError, setCommentError] = useState('');

    // Determine initial view mode
    // If token exists, we are tracking specific ticket.
    // If logged in and no token, we see list.
    // Else, we see search form.
    const [viewMode, setViewMode] = useState(tokenFromParams ? 'details' : (user ? 'list' : 'search'));

    useEffect(() => {
        if (tokenFromParams) {
            // If URL has token, we need email to verify. 
            // If logged in, we use user.email. 
            // If not, we might need to ask for email (unless it's in params).
            if (email || user) {
                fetchStatus(null, tokenFromParams, user ? user.email : email);
            } else {
                // If we have token but no email, we show search form to ask for email? 
                // Or we could try fetching and let backend reject if email missing?
                setViewMode('search');
            }
        } else if (user) {
            fetchUserTickets();
            setViewMode('list');
        }
    }, [tokenFromParams, user]);

    const fetchUserTickets = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/tickets/user/${user.email}/requests`);
            if (response.ok) {
                setUserTickets(await response.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStatus = async (e, tOverride, eOverride) => {
        if (e) e.preventDefault();
        const t = tOverride || inputToken;
        const em = eOverride || email;

        if (!em || !t) return;

        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_URL}/tickets/track/${t}?email=${encodeURIComponent(em)}`);
            const data = await response.json();

            if (response.ok) {
                setTicketStatus(data);
                setViewMode('details');
            } else {
                setError(data.error || "Failed to fetch status.");
            }
        } catch (err) {
            setError("Network error. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        setCommentError('');
        // We need ticket ID or token. The endpoint uses token.
        // We might not have token in state if we came from list view?
        // Wait, list view items should have tracking_token.
        // ticketStatus should have id. But endpoint uses /track/:token/comment.
        // We need the token.
        // Let's ensure ticketStatus includes token or we pass it.
        // backend logic uses token to find UserRequest.
        // The list item has tracking_token. ticketStatus from /track/:token usually implies we have token.
        // But if we clicked from list, we should fetch details using token.

        const currentToken = tokenFromParams || inputToken || (ticketStatus ? ticketStatus.token : null);
        // We need to ensure we have the token when viewing details.

        try {
            const response = await fetch(`${API_URL}/tickets/track/${currentToken}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user ? user.email : email, text: newComment })
            });
            if (response.ok) {
                setNewComment('');
                // Refresh details
                fetchStatus(null, currentToken, user ? user.email : email);
            } else {
                const data = await response.json();
                setCommentError(data.error || "Failed to post comment.");
            }
        } catch (err) {
            setCommentError("Network error.");
        }
    };

    const getStep = (status) => {
        switch (status) {
            case 'Draft': return 1;
            case 'New': return 2;
            case 'Assigned': return 2;
            case 'Solving': return 3;
            case 'Solved': return 4;
            case 'Failed': return 4;
            default: return 0;
        }
    };

    const steps = ['Received', 'Review', 'Active', 'Resolving', 'Finished'];

    // Helper to view details from list
    const handleViewDetails = (ticket) => {
        if (ticket.tracking_token) {
            setInputToken(ticket.tracking_token);
            fetchStatus(null, ticket.tracking_token, user.email);
        }
    };

    const renderSearch = () => (
        <Box component="form" onSubmit={(e) => fetchStatus(e)} sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Enter the email you used to submit your request to see its current status.
            </Typography>
            <TextField
                fullWidth
                label="Tracking Token"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                sx={{ mb: 3 }}
                required
            />
            <TextField
                fullWidth
                label="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ mb: 3 }}
                required
                disabled={!!user} // Disable if logged in
            />
            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
            <Button
                fullWidth
                variant="contained"
                type="submit"
                disabled={loading}
                size="large"
            >
                {loading ? <CircularProgress size={24} /> : "Check Status"}
            </Button>
            {user && (
                <Button fullWidth variant="text" onClick={() => setViewMode('list')} sx={{ mt: 2 }}>
                    Back to My Requests
                </Button>
            )}
        </Box>
    );

    const renderList = () => (
        <Box>
            <Typography variant="h6" gutterBottom>My Requests</Typography>
            {userTickets.length === 0 ? (
                <Typography color="text.secondary">You haven't submitted any requests yet.</Typography>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Title</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {userTickets.map((row) => (
                                <TableRow key={row.tracking_token}>
                                    <TableCell>#{row.id}</TableCell>
                                    <TableCell>{row.title || "(No Title)"}</TableCell>
                                    <TableCell><Chip label={row.status} size="small" color={row.status === 'Draft' ? 'default' : 'primary'} /></TableCell>
                                    <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell align="right">
                                        <Button size="small" onClick={() => handleViewDetails(row)}>View</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

        </Box>
    );

    const renderDetails = () => (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h5" fontWeight="bold">{ticketStatus.title || "Request Status"}</Typography>
                <Chip label={ticketStatus.status} color="primary" variant="outlined" />
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                ID: {ticketStatus.id ? `#${ticketStatus.id}` : "Pending"}
            </Typography>

            <Alert severity="info" sx={{ mb: 4 }}>
                {ticketStatus.message}
            </Alert>

            <Stepper activeStep={getStep(ticketStatus.status)} alternativeLabel sx={{ mb: 6 }}>
                {steps.map((label) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            <Divider sx={{ my: 4 }} />

            <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">Details</Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', bgcolor: '#f8f9fa', p: 2, borderRadius: 1 }}>
                    {ticketStatus.details || "Initial processing..."}
                </Typography>
            </Box>

            {ticketStatus.assignees && ticketStatus.assignees.length > 0 && (
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" gutterBottom fontWeight="bold">Assigned Team</Typography>
                    <Stack direction="row" spacing={1}>
                        {ticketStatus.assignees.map(a => (
                            <Chip key={a.email} label={a.name} variant="outlined" />
                        ))}
                    </Stack>
                </Box>
            )}

            <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">Public Comments</Typography>
                <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #eee' }}>
                    {ticketStatus.comments && ticketStatus.comments.length > 0 ? ticketStatus.comments.map((c, i) => (
                        <ListItem key={i} divider={i < ticketStatus.comments.length - 1}>
                            <ListItemText
                                primary={c.text}
                                secondary={`${c.authorEmail} • ${new Date(c.createdAt).toLocaleString()}`}
                            />
                        </ListItem>
                    )) : (
                        <ListItem>
                            <ListItemText secondary="No public updates yet." />
                        </ListItem>
                    )}
                </List>

                {ticketStatus.id && (
                    <Box sx={{ mt: 2 }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Add a reply..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            sx={{ mb: 1 }}
                        />
                        {commentError && <Typography color="error" variant="caption">{commentError}</Typography>}
                        <Button variant="contained" size="small" onClick={handleAddComment}>Post Reply</Button>
                    </Box>
                )}
            </Box>

            <Button variant="text" onClick={() => {
                setTicketStatus(null);
                setViewMode(user ? 'list' : 'search');
            }} sx={{ mt: 2 }}>
                ← Back to {user ? 'My Requests' : 'Search'}
            </Button>
        </Box>
    );

    return (
        <Container maxWidth="md" sx={{ mt: 2 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
                Track Your Request
            </Typography>

            {viewMode === 'search' && renderSearch()}
            {viewMode === 'list' && renderList()}
            {viewMode === 'details' && ticketStatus && renderDetails()}
        </Container>
    );
}
