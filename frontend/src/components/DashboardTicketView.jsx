import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    Button, Stack, TextField, Divider, Typography, Box, FormControl, InputLabel, Select, MenuItem,
    List, ListItem, ListItemText, Chip, Autocomplete
} from '@mui/material';

export default function DashboardTicketView({
    viewingTicket, setViewingTicket, assignees, isAdmin, user,
    handleUpdateDraft, handleUpdateTicket, handleUnlinkRequest,
    linkedRequests,
    comments, newComment, setNewComment, handleAddComment,
    isCommentInternal, setIsCommentInternal,
    history,
    promoteTicket,
    handleToggleFollow, isFollowing
}) {
    // Helper to get category as array
    const getCategoriesArray = (ticket) => {
        if (!ticket?.categories) return [];
        if (Array.isArray(ticket.categories)) return ticket.categories;
        return ticket.categories.split(',').map(s => s.trim()).filter(Boolean);
    };

    // Helper to get assignee emails as array
    const getAssigneeEmails = (ticket) => {
        if (!ticket?.assignees) return [];
        if (Array.isArray(ticket.assignees)) return ticket.assignees;
        return ticket.assignees.split(',').map(s => s.trim()).filter(Boolean);
    };

    const [localAssignees, setLocalAssignees] = useState([]);
    const [localCategories, setLocalCategories] = useState([]);

    // Sync local state when ticket changes
    useEffect(() => {
        if (viewingTicket) {
            setLocalAssignees(getAssigneeEmails(viewingTicket));
            setLocalCategories(getCategoriesArray(viewingTicket));
        }
    }, [viewingTicket?.id, viewingTicket?.assignees, viewingTicket?.categories]);

    if (!viewingTicket) return null;

    return (
        <Dialog open={!!viewingTicket} onClose={() => setViewingTicket(null)} fullWidth maxWidth="md">
            <DialogTitle>
                {viewingTicket.status === 'draft' ? 'Edit Draft Ticket' : (isAdmin ? 'Edit Ticket' : 'View Ticket')}
            </DialogTitle>
            <DialogContent dividers>
                {viewingTicket.status === 'draft' ? (
                    /* DRAFT TICKET EDIT MODE */
                    <Stack spacing={3}>
                        <TextField
                            fullWidth
                            label="Title"
                            disabled={!isAdmin}
                            value={viewingTicket.title || ''}
                            onChange={(e) => setViewingTicket({ ...viewingTicket, title: e.target.value })}
                            onBlur={(e) => handleUpdateDraft(viewingTicket.id, { title: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label="Summary"
                            disabled={!isAdmin}
                            value={viewingTicket.summary || ''}
                            onChange={(e) => setViewingTicket({ ...viewingTicket, summary: e.target.value })}
                            onBlur={(e) => handleUpdateDraft(viewingTicket.id, { summary: e.target.value })}
                        />
                        {isAdmin ? (
                            <Autocomplete
                                multiple
                                fullWidth
                                options={[]} // Assuming no fixed options for categories for now, or maybe the user wants to add them
                                value={localCategories}
                                onChange={(event, newValue) => {
                                    setLocalCategories(newValue);
                                    handleUpdateDraft(viewingTicket.id, { categories: newValue });
                                }}
                                freeSolo
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => {
                                        const { key, ...tagProps } = getTagProps({ index });
                                        return (
                                            <Chip
                                                key={key}
                                                label={option}
                                                {...tagProps}
                                            />
                                        );
                                    })
                                }
                                sx={{
                                    flexGrow: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    '& .MuiFormControl-root': {
                                        flexGrow: 1,
                                    },
                                    '& .MuiInputBase-root': {
                                        height: '100%',
                                        alignItems: 'flex-start',
                                        alignContent: 'flex-start',
                                    }
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Categories"
                                        placeholder="Add category"
                                    />
                                )}
                            />
                        ) : (
                            <Box sx={{
                                flexGrow: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                p: 2
                            }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                    Categories
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {localCategories.length > 0 ? localCategories.map(cat => (
                                        <Chip key={cat} label={cat} size="small" />
                                    )) : <Typography variant="body2">No categories</Typography>}
                                </Box>
                            </Box>
                        )}
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch' }}>
                            <TextField
                                fullWidth
                                rows={8}
                                multiline
                                label="Solutions"
                                disabled={!isAdmin}
                                value={viewingTicket.solution || ''}
                                onChange={(e) => setViewingTicket({ ...viewingTicket, solution: e.target.value })}
                                onBlur={(e) => handleUpdateDraft(viewingTicket.id, { solution: e.target.value })}
                                sx={{
                                    flex: 1, // Take up 50% width
                                }}
                            />
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                                    <Autocomplete
                                        multiple
                                        fullWidth
                                        options={assignees}
                                        getOptionLabel={(option) => typeof option === 'string' ? option : `${option.name} (${option.email})`}
                                        value={localAssignees.map(email => assignees.find(a => a.email === email) || email)}
                                        onChange={(event, newValue) => {
                                            const emails = newValue.map(val => typeof val === 'string' ? val : val.email);
                                            setLocalAssignees(emails);
                                            handleUpdateDraft(viewingTicket.id, { assigneeEmail: emails });
                                        }}
                                        freeSolo
                                        renderTags={(value, getTagProps) =>
                                            value.map((option, index) => {
                                                const { key, ...tagProps } = getTagProps({ index });
                                                return (
                                                    <Chip
                                                        key={key}
                                                        label={typeof option === 'string' ? option : option.email}
                                                        {...tagProps}
                                                    />
                                                );
                                            })
                                        }
                                        sx={{
                                            flexGrow: 1, // 1. Tells the Autocomplete wrapper to fill remaining space
                                            display: 'flex',
                                            flexDirection: 'column',
                                            '& .MuiFormControl-root': {
                                                flexGrow: 1, // 2. Forces the inner form control to stretch
                                            },
                                            '& .MuiInputBase-root': {
                                                height: '100%', // 3. Forces the actual bordered box to hit the bottom
                                                alignItems: 'flex-start', // Keeps chips pinned to the top
                                                alignContent: 'flex-start',
                                            }
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Assignees"
                                                placeholder="Add assignee email"
                                            />
                                        )}
                                    />
                                ) : (
                                    <Box sx={{
                                        flexGrow: 1, // Ensures the read-only box stretches too
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        p: 2
                                    }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                            Assignees
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {localAssignees.length > 0 ? localAssignees.map(email => (
                                                <Chip key={email} label={email} size="small" />
                                            )) : <Typography variant="body2">Unassigned</Typography>}
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        </Box>

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
                    <Stack spacing={3}>
                        <Box display="flex" justifyContent="flex-end">
                            <Button
                                variant={isFollowing ? "outlined" : "contained"}
                                color={isFollowing ? "secondary" : "primary"}
                                onClick={() => handleToggleFollow(viewingTicket.id)}
                            >
                                {isFollowing ? "Unfollow" : "Follow"}
                            </Button>
                        </Box>

                        <TextField
                            fullWidth
                            label="Title"
                            disabled={!isAdmin}
                            value={viewingTicket.title || ''}
                            onChange={(e) => setViewingTicket({ ...viewingTicket, title: e.target.value })}
                            onBlur={(e) => handleUpdateTicket(viewingTicket.id, { title: e.target.value })}
                        />

                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label="Summary"
                            disabled={!isAdmin}
                            value={viewingTicket.summary || ''}
                            onChange={(e) => setViewingTicket({ ...viewingTicket, summary: e.target.value })}
                            onBlur={(e) => handleUpdateTicket(viewingTicket.id, { summary: e.target.value })}
                        />

                        {isAdmin ? (
                            <Autocomplete
                                multiple
                                fullWidth
                                options={[]}
                                value={localCategories}
                                onChange={(event, newValue) => {
                                    setLocalCategories(newValue);
                                    handleUpdateTicket(viewingTicket.id, { categories: newValue });
                                }}
                                freeSolo
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => {
                                        const { key, ...tagProps } = getTagProps({ index });
                                        return (
                                            <Chip
                                                key={key}
                                                label={option}
                                                {...tagProps}
                                            />
                                        );
                                    })
                                }
                                sx={{
                                    flexGrow: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    '& .MuiFormControl-root': {
                                        flexGrow: 1,
                                    },
                                    '& .MuiInputBase-root': {
                                        height: '100%',
                                        alignItems: 'flex-start',
                                        alignContent: 'flex-start',
                                    }
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Categories"
                                        placeholder="Add category"
                                    />
                                )}
                            />
                        ) : (
                            <Box sx={{
                                flexGrow: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                p: 2
                            }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                    Categories
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {localCategories.length > 0 ? localCategories.map(cat => (
                                        <Chip key={cat} label={cat} size="small" />
                                    )) : <Typography variant="body2">No categories</Typography>}
                                </Box>
                            </Box>
                        )}

                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch' }}>
                            <TextField
                                fullWidth
                                rows={10}
                                multiline
                                label="Solutions"
                                disabled={!isAdmin}
                                value={viewingTicket.solution || ''}
                                onChange={(e) => setViewingTicket({ ...viewingTicket, solution: e.target.value })}
                                onBlur={(e) => handleUpdateTicket(viewingTicket.id, { solution: e.target.value })}
                                sx={{
                                    flex: 1,
                                }}
                            />
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Status</InputLabel>
                                    <Select
                                        value={viewingTicket.status || ''}
                                        label="Status"
                                        disabled={!isAdmin && !localAssignees.includes(user?.email)}
                                        onChange={(e) => handleUpdateTicket(viewingTicket.id, { status: e.target.value })}
                                    >
                                        <MenuItem value="New">New</MenuItem>
                                        <MenuItem value="Assigned">Assigned</MenuItem>
                                        <MenuItem value="Solving">Solving</MenuItem>
                                        <MenuItem value="Solved">Solved</MenuItem>
                                        <MenuItem value="Failed">Failed</MenuItem>
                                    </Select>
                                </FormControl>

                                <TextField
                                    fullWidth
                                    label="Deadline"
                                    type="date"
                                    disabled={!isAdmin}
                                    InputLabelProps={{ shrink: true }}
                                    value={viewingTicket.deadline ? viewingTicket.deadline.split('T')[0] : ''}
                                    onChange={(e) => handleUpdateTicket(viewingTicket.id, { deadline: e.target.value })}
                                />

                                {isAdmin ? (
                                    <Autocomplete
                                        multiple
                                        fullWidth
                                        options={assignees}
                                        getOptionLabel={(option) => typeof option === 'string' ? option : `${option.name} (${option.email})`}
                                        value={localAssignees.map(email => assignees.find(a => a.email === email) || email)}
                                        onChange={(event, newValue) => {
                                            const emails = newValue.map(val => typeof val === 'string' ? val : val.email);
                                            setLocalAssignees(emails);
                                            handleUpdateTicket(viewingTicket.id, { assigneeEmail: emails });
                                        }}
                                        freeSolo
                                        renderTags={(value, getTagProps) =>
                                            value.map((option, index) => {
                                                const { key, ...tagProps } = getTagProps({ index });
                                                return (
                                                    <Chip
                                                        key={key}
                                                        label={typeof option === 'string' ? option : option.email}
                                                        {...tagProps}
                                                    />
                                                );
                                            })
                                        }
                                        sx={{
                                            flexGrow: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            '& .MuiFormControl-root': {
                                                flexGrow: 1,
                                            },
                                            '& .MuiInputBase-root': {
                                                height: '100%',
                                                alignItems: 'flex-start',
                                                alignContent: 'flex-start',
                                            }
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Assignees"
                                                placeholder="Add assignee email"
                                            />
                                        )}
                                    />
                                ) : (
                                    <Box sx={{
                                        flexGrow: 1,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        p: 2
                                    }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                            Assignees
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {localAssignees.length > 0 ? localAssignees.map(email => (
                                                <Chip key={email} label={email} size="small" />
                                            )) : <Typography variant="body2">Unassigned</Typography>}
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        </Box>

                        <Divider sx={{ my: 1 }} />
                        <Typography variant="h6" gutterBottom>Internal Comments</Typography>
                        <List sx={{ mb: 2, maxHeight: 200, overflow: 'auto', bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                            {comments.length > 0 ? comments.map(c => (
                                <ListItem key={c.id} alignItems="flex-start" divider>
                                    <ListItemText
                                        primary={
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Typography variant="body2">{c.text}</Typography>
                                                {c.isInternal ? <Chip label="INTERNAL" size="small" color="warning" variant="outlined" /> : null}
                                            </Box>
                                        }
                                        secondary={`${c.authorEmail} • ${new Date(c.createdAt).toLocaleString()}`}
                                    />
                                </ListItem>
                            )) : <Box p={2}><Typography variant="body2" color="text.secondary">No comments yet.</Typography></Box>}
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
                                <label htmlFor="internal" style={{ cursor: 'pointer', fontSize: '0.875rem' }}>Mark as Internal</label>
                            </Box>
                        </Box>

                        <Divider sx={{ my: 1 }} />
                        <Typography variant="h6" gutterBottom>Audit Trail (Activity)</Typography>
                        <List sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            {history.length > 0 ? history.map(h => (
                                <ListItem key={h.id} dense divider>
                                    <ListItemText
                                        primary={h.action}
                                        secondary={`${h.details} • By ${h.performedBy} on ${new Date(h.timestamp).toLocaleString()}`}
                                    />
                                </ListItem>
                            )) : <Box p={2}><Typography variant="body2" color="text.secondary">No activity logged.</Typography></Box>}
                        </List>
                    </Stack>

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
