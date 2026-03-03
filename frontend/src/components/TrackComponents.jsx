import React from 'react';
import {
    Typography, Box, TextField, Button, CircularProgress, Alert, Stepper, Step, StepLabel,
    Chip, Divider, List, ListItem, ListItemText, Stack,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, useMediaQuery, useTheme
} from '@mui/material';

export const TrackSearch = ({ inputToken, setInputToken, email, setEmail, error, loading, user, fetchStatus, setViewMode }) => (
    <Box component="form" onSubmit={(e) => fetchStatus(e)} sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
        <Typography variant="body2" align='center' color="text.secondary" sx={{ mb: 4 }}>
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
                    <TableHead sx={{ display: { xs: 'none', sm: 'table-header-group' } }}>
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
                            <TableRow
                                key={row.tracking_token}
                                sx={{
                                    display: { xs: 'flex', sm: 'table-row' },
                                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                                    borderBottom: { xs: '1px solid rgba(224, 224, 224, 1)', sm: 'none' },
                                    alignItems: 'center'
                                }}
                            >
                                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>#{row.id}</TableCell>
                                <TableCell sx={{
                                    order: { xs: 1, sm: 0 },
                                    width: { xs: '100%', sm: 'auto' },
                                    borderBottom: { xs: 'none', sm: '1px solid rgba(224, 224, 224, 1)' },
                                    fontWeight: { xs: 'bold', sm: 'normal' },
                                    pt: { xs: 2, sm: 2 },
                                    pb: { xs: 0.5, sm: 2 }
                                }}>
                                    <Box sx={{ display: { xs: 'inline', sm: 'none' }, color: 'text.secondary', fontWeight: 'normal', mr: 1 }}>#{row.id}</Box>
                                    {row.title || "(No Title)"}
                                </TableCell>
                                <TableCell sx={{
                                    order: { xs: 2, sm: 0 },
                                    borderBottom: { xs: 'none', sm: '1px solid rgba(224, 224, 224, 1)' },
                                    pt: { xs: 0.5, sm: 2 },
                                    pb: { xs: 2, sm: 2 }
                                }}>
                                    <Chip label={row.status} size="small" color={row.status === 'Draft' ? 'default' : 'primary'} />
                                </TableCell>
                                <TableCell sx={{
                                    order: { xs: 3, sm: 0 },
                                    borderBottom: { xs: 'none', sm: '1px solid rgba(224, 224, 224, 1)' },
                                    pt: { xs: 0.5, sm: 2 },
                                    pb: { xs: 2, sm: 2 },
                                    color: 'text.secondary',
                                    fontSize: { xs: '0.85rem', sm: 'inherit' }
                                }}>
                                    {new Date(row.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell align="right" sx={{
                                    order: { xs: 4, sm: 0 },
                                    borderBottom: { xs: 'none', sm: '1px solid rgba(224, 224, 224, 1)' },
                                    ml: { xs: 'auto', sm: 0 },
                                    pt: { xs: 0.5, sm: 2 },
                                    pb: { xs: 2, sm: 2 }
                                }}>
                                    <Button size="small" variant="outlined" onClick={() => handleViewDetails(row)}>View</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        )}
    </Box>
);

export const TrackDetails = ({ ticketStatus, getStep, steps, user, setTicketStatus, setViewMode, newComment, setNewComment, commentError, handleAddComment }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <Box>
            <Button variant="text" onClick={() => {
                setTicketStatus(null);
                setViewMode(user ? 'list' : 'search');
            }} sx={{ mt: 4 }}>
                ← Back to {user ? 'My Requests' : 'Search'}
            </Button>
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}
            >
                <Typography variant="h5" fontWeight="bold" sx={{ wordBreak: 'break-word', flex: '1 1 auto' }}>
                    {ticketStatus.title || "Request Status"}
                </Typography>
                <Chip label={ticketStatus.status} color="primary" variant="outlined" />
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                ID: {ticketStatus.id ? `#${ticketStatus.id}` : "Pending"}
            </Typography>

            <Alert severity="info" sx={{ mb: 4, wordBreak: 'break-word' }}>
                {ticketStatus.message}
            </Alert>

            <Stepper activeStep={getStep(ticketStatus.status)} alternativeLabel={!isMobile} orientation={isMobile ? 'vertical' : 'horizontal'} sx={{ mb: 6 }}>
                {steps.map((label) => (
                    <Step key={label}>
                        <StepLabel
                            sx={isMobile ? {
                                '& .MuiStepLabel-label': { fontSize: '0.8 rem' },
                                '& .MuiStepIcon-root': { width: 16, height: 16 }
                            } : {}}
                        >
                            {label}
                        </StepLabel>
                    </Step>
                ))}
            </Stepper>

            <Divider sx={{ my: 4 }} />

            {ticketStatus.resolutionComment && (
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" gutterBottom fontWeight="bold">Resolution Comment</Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default', wordBreak: 'break-word' }}>
                        <Typography variant="body1">{ticketStatus.resolutionComment}</Typography>
                    </Paper>
                </Box>
            )}

            <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">History</Typography>
                <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #eee', maxHeight: 300, overflow: 'auto' }}>
                    {ticketStatus.history && ticketStatus.history.length > 0 ? ticketStatus.history.map((h, i) => (
                        <ListItem key={i} divider={i < ticketStatus.history.length - 1} dense sx={{ flexWrap: 'wrap' }}>
                            <ListItemText
                                primary={h.action}
                                secondary={`${h.details} • By ${h.performer} on ${new Date(h.timestamp).toLocaleString()}`}
                                primaryTypographyProps={{ fontSize: '1.1rem', sx: { wordBreak: 'break-word' } }}
                                secondaryTypographyProps={{ fontSize: '1rem', sx: { wordBreak: 'break-all' } }}
                            />
                        </ListItem>
                    )) : (
                        <ListItem>
                            <ListItemText primary="No activity logged yet." primaryTypographyProps={{ fontSize: '1.1rem', color: 'text.secondary' }} />
                        </ListItem>
                    )}
                </List>
            </Box>

            {ticketStatus.assignees && ticketStatus.assignees.length > 0 && (
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" gutterBottom fontWeight="bold">Assigned Team</Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {ticketStatus.assignees.map(a => (
                            <Chip key={a.email} label={a.name} variant="outlined" sx={{ mb: 1, fontSize: '1rem' }} />
                        ))}
                    </Stack>
                </Box>
            )}

            <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">Public Comments</Typography>
                <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #eee' }}>
                    {ticketStatus.comments && ticketStatus.comments.length > 0 ? ticketStatus.comments.map((c, i) => (
                        <ListItem key={i} divider={i < ticketStatus.comments.length - 1} sx={{ flexWrap: 'wrap' }}>
                            <ListItemText
                                primary={c.text}
                                secondary={`${c.authorEmail} • ${new Date(c.createdAt).toLocaleString()}`}
                                primaryTypographyProps={{ fontSize: '1.1rem', sx: { wordBreak: 'break-word' } }}
                                secondaryTypographyProps={{ fontSize: '1rem', sx: { wordBreak: 'break-all' } }}
                            />
                        </ListItem>
                    )) : (
                        <ListItem>
                            <ListItemText primary="No public updates yet." primaryTypographyProps={{ fontSize: '1.1rem', color: 'text.secondary' }} />
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
};
