import React from 'react';
import {
    Typography, Box, TextField, Button, CircularProgress, Alert, Stepper, Step, StepLabel,
    Chip, Divider, List, ListItem, ListItemText, Stack,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';

export const TrackSearch = ({ inputToken, setInputToken, email, setEmail, error, loading, user, fetchStatus, setViewMode }) => (
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
            disabled={!!user}
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

export const TrackList = ({ userTickets, handleViewDetails }) => (
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

export const TrackDetails = ({ ticketStatus, getStep, steps, user, setTicketStatus, setViewMode, newComment, setNewComment, commentError, handleAddComment }) => (
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
