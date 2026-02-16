import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    Button, Stack, TextField, Divider, Typography, Box, FormControl, InputLabel, Select, MenuItem,
    List, ListItem, ListItemText, Chip
} from '@mui/material';

export default function DashboardTicketView({
    viewingTicket, setViewingTicket, specialists, isAdmin,
    handleUpdateDraft, handleUpdateTicket, handleUnlinkRequest,
    linkedRequests,
    comments, newComment, setNewComment, handleAddComment,
    isCommentInternal, setIsCommentInternal,
    history,
    promoteTicket,
    handleToggleFollow, isFollowing
}) {
    if (!viewingTicket) return null;

    return (
        <Dialog open={!!viewingTicket} onClose={() => setViewingTicket(null)} fullWidth maxWidth="md">
            <DialogTitle>
                {viewingTicket.type === 'draft' ? 'Edit Draft Ticket' : (isAdmin ? 'Edit Ticket' : 'View Ticket')}
            </DialogTitle>
            <DialogContent dividers>
                {viewingTicket.type === 'draft' ? (
                    /* DRAFT TICKET EDIT MODE */
                    <Stack spacing={3}>
                        <TextField
                            fullWidth
                            label="Title"
                            value={viewingTicket.title || ''}
                            onChange={(e) => setViewingTicket({ ...viewingTicket, title: e.target.value })}
                            onBlur={(e) => handleUpdateDraft(viewingTicket.id, { title: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Summary"
                            value={viewingTicket.summary || ''}
                            onChange={(e) => setViewingTicket({ ...viewingTicket, summary: e.target.value })}
                            onBlur={(e) => handleUpdateDraft(viewingTicket.id, { summary: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Suggested Solutions"
                            value={viewingTicket.suggestedSolutions || ''}
                            onChange={(e) => setViewingTicket({ ...viewingTicket, suggestedSolutions: e.target.value })}
                            onBlur={(e) => handleUpdateDraft(viewingTicket.id, { suggestedSolutions: e.target.value })}
                        />
                        <Stack direction="row" spacing={2}>
                            <TextField
                                fullWidth
                                label="Deadline"
                                type="date"
                                disabled={!isAdmin}
                                InputLabelProps={{ shrink: true }}
                                value={viewingTicket.deadline ? viewingTicket.deadline.split('T')[0] : ''}
                                onChange={(e) => handleUpdateDraft(viewingTicket.id, { deadline: e.target.value })}
                            />
                            {isAdmin ? (
                                <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                                    <InputLabel>Specialist</InputLabel>
                                    <Select
                                        value={viewingTicket.assigneeEmail || ''}
                                        label="Specialist"
                                        onChange={(e) => handleUpdateDraft(viewingTicket.id, { assigneeEmail: e.target.value })}
                                    >
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {specialists.map(s => (
                                            <MenuItem key={s.email} value={s.email}>{s.name} ({s.scope})</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            ) : (
                                <TextField
                                    fullWidth
                                    label="Specialist"
                                    value={specialists.find(s => s.email === viewingTicket.assigneeEmail)?.name || viewingTicket.assigneeEmail || 'Unassigned'}
                                    disabled
                                    sx={{ mt: 1 }}
                                    InputLabelProps={{ shrink: true }}
                                />
                            )}
                        </Stack>

                        <Divider sx={{ my: 1 }} />
                        <Typography variant="subtitle1" fontWeight="bold">Linked Requests ({linkedRequests.length})</Typography>
                        <List size="small">
                            {linkedRequests.map(req => (
                                <ListItem key={req.id} sx={{ bgcolor: '#f5f5f5', mb: 1, borderRadius: 1 }}>
                                    <ListItemText primary={req.userEmail} secondary={req.requestContents.substring(0, 100) + '...'} />
                                    {linkedRequests.length > 1 && (
                                        <Button color="error" size="small" onClick={() => handleUnlinkRequest(viewingTicket.id, req.id)}>Unlink</Button>
                                    )}
                                </ListItem>
                            ))}
                        </List>
                    </Stack>
                ) : (
                    /* ACTIVE TICKET MODE */
                    <>
                        <Box display="flex" justifyContent="flex-end" mb={2}>
                            <Button
                                variant={isFollowing ? "outlined" : "contained"}
                                color={isFollowing ? "secondary" : "primary"}
                                onClick={() => handleToggleFollow(viewingTicket.id)}
                            >
                                {isFollowing ? "Unfollow" : "Follow"}
                            </Button>
                        </Box>
                        <Stack spacing={2} sx={{ mb: 3 }}>
                            {/* Admin can edit Title */}
                            {isAdmin ? (
                                <TextField
                                    fullWidth
                                    label="Title"
                                    value={viewingTicket.title || ''}
                                    onChange={(e) => setViewingTicket({ ...viewingTicket, title: e.target.value })}
                                    onBlur={(e) => handleUpdateTicket(viewingTicket.id, { title: e.target.value })}
                                />
                            ) : (
                                <Typography variant="h6">{viewingTicket.title}</Typography>
                            )}

                            <Box>
                                <DialogContentText sx={{ color: 'text.primary', mb: 1 }}>
                                    <strong>Content:</strong>
                                </DialogContentText>
                                {/* Admin can edit Content (Summary) */}
                                {isAdmin ? (
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={4}
                                        value={viewingTicket.requestContents || ''} // Keeping naming consistent with backend (requestContents mapped to summary)
                                        onChange={(e) => setViewingTicket({ ...viewingTicket, requestContents: e.target.value })}
                                        onBlur={(e) => handleUpdateTicket(viewingTicket.id, { requestContents: e.target.value })}
                                    />
                                ) : (
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
                                        {viewingTicket.requestContents || "No content available."}
                                    </Typography>
                                )}
                            </Box>

                            <Box>
                                <DialogContentText sx={{ color: 'text.primary', mb: 1 }}>
                                    <strong>Suggested Solutions:</strong>
                                </DialogContentText>
                                {/* Admin can edit Solutions */}
                                {isAdmin ? (
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={3}
                                        value={viewingTicket.suggestedSolutions || ''}
                                        onChange={(e) => setViewingTicket({ ...viewingTicket, suggestedSolutions: e.target.value })}
                                        onBlur={(e) => handleUpdateTicket(viewingTicket.id, { suggestedSolutions: e.target.value })}
                                    />
                                ) : (
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
                                        {viewingTicket.suggestedSolutions}
                                    </Typography>
                                )}
                            </Box>
                        </Stack>

                        <Divider sx={{ my: 3 }} />
                        <Typography variant="h6" gutterBottom>Management</Typography>
                        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={viewingTicket.status || ''}
                                    label="Status"
                                    onChange={(e) => handleUpdateTicket(viewingTicket.id, { status: e.target.value })}
                                >
                                    <MenuItem value="New">New</MenuItem>
                                    <MenuItem value="Assigned">Assigned</MenuItem>
                                    <MenuItem value="Solving">Solving</MenuItem>
                                    <MenuItem value="Solved">Solved</MenuItem>
                                    <MenuItem value="Failed">Failed</MenuItem>
                                </Select>
                            </FormControl>

                            {isAdmin ? (
                                <FormControl fullWidth size="small">
                                    <InputLabel>Specialist</InputLabel>
                                    <Select
                                        value={viewingTicket.assigneeEmail || ''}
                                        label="Specialist"
                                        onChange={(e) => handleUpdateTicket(viewingTicket.id, { assigneeEmail: e.target.value })}
                                    >
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {specialists.map(s => (
                                            <MenuItem key={s.email} value={s.email}>{s.name} ({s.scope})</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            ) : (
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Specialist"
                                    value={specialists.find(s => s.email === viewingTicket.assigneeEmail)?.name || viewingTicket.assigneeEmail || 'Unassigned'}
                                    disabled
                                    InputLabelProps={{ shrink: true }}
                                />
                            )}
                        </Stack>

                        <TextField
                            fullWidth
                            label="Deadline"
                            type="date"
                            size="small"
                            disabled={!isAdmin}
                            InputLabelProps={{ shrink: true }}
                            value={viewingTicket.deadline ? viewingTicket.deadline.split('T')[0] : ''}
                            onChange={(e) => handleUpdateTicket(viewingTicket.id, { deadline: e.target.value })}
                            sx={{ mb: 3 }}
                        />

                        <Divider sx={{ my: 3 }} />
                        <Typography variant="h6" gutterBottom>Internal Comments</Typography>
                        <List sx={{ mb: 2, maxHeight: 200, overflow: 'auto', bgcolor: 'background.paper' }}>
                            {comments.length > 0 ? comments.map(c => (
                                <ListItem key={c.id} alignItems="flex-start" divider>
                                    <ListItemText
                                        primary={
                                            <Box display="flex" alignItems="center" gap={1}>
                                                {c.text}
                                                {c.isInternal ? <Chip label="INTERNAL" size="small" color="warning" variant="outlined" /> : null}
                                            </Box>
                                        }
                                        secondary={`${c.authorEmail} • ${new Date(c.createdAt).toLocaleString()}`}
                                    />
                                </ListItem>
                            )) : <Typography variant="body2" color="text.secondary">No comments yet.</Typography>}
                        </List>
                        <Box display="flex" flexDirection="column" gap={1}>
                            <Box display="flex" gap={1}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Add a comment..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                />
                                <Button variant="contained" onClick={() => handleAddComment(viewingTicket.id)}>Add</Button>
                            </Box>
                            <Box display="flex" alignItems="center" gap={1}>
                                <input
                                    type="checkbox"
                                    id="internal"
                                    checked={isCommentInternal}
                                    onChange={(e) => setIsCommentInternal(e.target.checked)}
                                />
                                <label htmlFor="internal" className="cursor-pointer label-small">Mark as Internal</label>
                            </Box>
                        </Box>

                        <Divider sx={{ my: 3 }} />
                        <Typography variant="h6" gutterBottom>Audit Trail (Activity)</Typography>
                        <List sx={{ maxHeight: 200, overflow: 'auto' }}>
                            {history.length > 0 ? history.map(h => (
                                <ListItem key={h.id} dense>
                                    <ListItemText
                                        primary={h.action}
                                        secondary={`${h.details} • By ${h.performedBy} on ${new Date(h.timestamp).toLocaleString()}`}
                                    />
                                </ListItem>
                            )) : <Typography variant="body2" color="text.secondary">No activity logged.</Typography>}
                        </List>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                {(viewingTicket.type === 'draft' && isAdmin) && (
                    <Button
                        color="success"
                        variant="contained"
                        onClick={promoteTicket}
                    >
                        Confirm and Promote
                    </Button>
                )}
                <Button onClick={() => setViewingTicket(null)}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
