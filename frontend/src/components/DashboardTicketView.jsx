import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    Button, Stack, TextField, Divider, Typography, Box, FormControl, InputLabel, Select, MenuItem,
    List, ListItem, ListItemText, Chip, Autocomplete, CircularProgress, Collapse, useMediaQuery, useTheme
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

function LinkedRequestItem({ req, isAdmin, linkedRequestsLength, onUnlink, viewingTicketId }) {
    const [expanded, setExpanded] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Safely get content string
    const content = req.requestContents || '';
    const displayContent = content.length > 100 ? content.substring(0, 100) + '...' : content;

    const primaryText = isMobile ? displayContent : req.userEmail;
    const secondaryText = isMobile ? req.userEmail : displayContent;

    return (
        <Box sx={{ bgcolor: '#f5f5f5', mb: 1, borderRadius: 1, overflow: 'hidden' }}>
            <ListItem
                onClick={() => setExpanded(!expanded)}
                sx={{
                    cursor: { xs: 'pointer', md: 'default' },
                    display: 'flex',
                    alignItems: { xs: 'flex-start', md: 'center' } // Vertically centered on md and up
                }}
            >
                <ListItemText
                    primary={primaryText}
                    secondary={secondaryText}
                    primaryTypographyProps={isMobile ? { fontSize: '1.1rem', fontWeight: 500 } : {}}
                />
                {isAdmin && linkedRequestsLength > 1 && (
                    <Button
                        color="error"
                        size="small"
                        onClick={(e) => { e.stopPropagation(); onUnlink(viewingTicketId, req.id); }}
                        sx={{ display: { xs: 'none', md: 'block' }, ml: 2, minWidth: 'auto' }}
                    >
                        Unlink
                    </Button>
                )}
            </ListItem>
            {isAdmin && linkedRequestsLength > 1 && (
                <Collapse in={expanded} timeout="auto" unmountOnExit sx={{ display: { xs: 'block', md: 'none' } }}>
                    <Box sx={{ p: 1, pt: 0, display: 'flex', justifyContent: 'center', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                        <Button
                            color="error"
                            size="small"
                            variant="outlined"
                            onClick={(e) => { e.stopPropagation(); onUnlink(viewingTicketId, req.id); }}
                            sx={{ width: '100%', maxWidth: '200px' }}
                        >
                            Unlink
                        </Button>
                    </Box>
                </Collapse>
            )}
        </Box>
    );
}

export default function DashboardTicketView({
    viewingTicket, setViewingTicket, assignees, categories = [], isAdmin, user,
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

    const { API_URL } = useAuth();
    const [creatorInfo, setCreatorInfo] = useState(null);
    const [loadingCreator, setLoadingCreator] = useState(false);


    // Helper to get assignee emails as array
    const getAssigneeEmails = (ticket) => {
        if (!ticket?.assignees) return [];
        if (Array.isArray(ticket.assignees)) return ticket.assignees;
        return ticket.assignees.split(',').map(s => s.trim()).filter(Boolean);
    };

    const [localAssignees, setLocalAssignees] = useState([]);
    const [localCategories, setLocalCategories] = useState([]);
    const [localStatus, setLocalStatus] = useState('');
    const [localResolutionComment, setLocalResolutionComment] = useState('');

    // Sync local state when ticket changes
    useEffect(() => {
        if (viewingTicket) {
            setLocalAssignees(getAssigneeEmails(viewingTicket));
            setLocalCategories(getCategoriesArray(viewingTicket));
            setLocalStatus(viewingTicket.status || '');
            setLocalResolutionComment(viewingTicket.resolutionComment || '');

            // Fetch creator info
            const fetchCreatorInfo = async () => {
                setLoadingCreator(true);
                try {
                    const response = await fetch(`${API_URL}/api/tickets/creator/${viewingTicket.id}`, {
                        credentials: 'include'
                    });
                    if (response.ok) {
                        const data = await response.json();
                        if (Array.isArray(data) && data.length > 0) {
                            setCreatorInfo(data[0]);
                        } else {
                            setCreatorInfo(null);
                        }
                    } else {
                        setCreatorInfo(null);
                    }
                } catch (err) {
                    console.error("Failed to fetch creator info", err);
                    setCreatorInfo(null);
                } finally {
                    setLoadingCreator(false);
                }
            };
            fetchCreatorInfo();
        } else {
            setCreatorInfo(null);
        }
    }, [viewingTicket?.id, viewingTicket?.assignees, viewingTicket?.categories, viewingTicket?.status, viewingTicket?.resolutionComment, API_URL]);

    const handleStatusChange = (newStatus) => {
        setLocalStatus(newStatus);
        // If not Solved/Failed, we can auto-update if we want, or wait for manual save.
        // For consistency with existing behavior, let's auto-update if NOT Solved/Failed.
        if (newStatus !== 'Solved' && newStatus !== 'Failed') {
            handleUpdateTicket(viewingTicket.id, { status: newStatus });
        }
    };

    const submitResolution = async () => {
        if (!localResolutionComment.trim()) {
            alert("Resolution comment is required for Solved or Failed status.");
            return;
        }
        await handleUpdateTicket(viewingTicket.id, {
            status: localStatus,
            resolutionComment: localResolutionComment
        });
        setViewingTicket(null);
    };

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
                        {loadingCreator ? (
                            <CircularProgress size={24} />
                        ) : creatorInfo ? (
                            <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                Creator: {creatorInfo?.map((user) => `${user.name} (${user.email})`).join(', ')}
                            </Typography>
                        ) : null}
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
                                options={categories} // Now uses the fetched categories list
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
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'stretch' }}>
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
                                <LinkedRequestItem
                                    key={req.id}
                                    req={req}
                                    isAdmin={isAdmin}
                                    linkedRequestsLength={linkedRequests.length}
                                    onUnlink={handleUnlinkRequest}
                                    viewingTicketId={viewingTicket.id}
                                />
                            ))}
                        </List>

                        <Divider sx={{ my: 1 }} />
                        <Typography variant="subtitle1" fontWeight="bold">Stakeholders (Followers)</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                            {viewingTicket.followers && viewingTicket.followers.length > 0 ? (
                                viewingTicket.followers.map(email => (
                                    <Chip key={email} label={email} size="small" variant="outlined" color="primary" />
                                ))
                            ) : (
                                <Typography variant="body2" color="text.secondary">No followers</Typography>
                            )}
                        </Box>
                    </Stack>
                ) : (
                    /* ACTIVE TICKET MODE */
                    <Stack spacing={3}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            {loadingCreator ? (
                                <CircularProgress size={24} />
                            ) : creatorInfo ? (
                                <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                    Creator: {creatorInfo?.map((user) => `${user.name} (${user.email})`).join(', ')}
                                </Typography>
                            ) : (
                                <Box /> // Placeholder to keep flex-end layout for button
                            )}
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
                                options={categories}
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

                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'stretch' }}>
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
                                        value={localStatus}
                                        label="Status"
                                        disabled={!isAdmin && !localAssignees.includes(user?.email)}
                                        onChange={(e) => handleStatusChange(e.target.value)}
                                    >
                                        <MenuItem value="New">New</MenuItem>
                                        <MenuItem value="Assigned">Assigned</MenuItem>
                                        <MenuItem value="Solving">Solving</MenuItem>
                                        <MenuItem value="Solved">Solved</MenuItem>
                                        <MenuItem value="Failed">Failed</MenuItem>
                                    </Select>
                                </FormControl>

                                {(localStatus === 'Solved' || localStatus === 'Failed') && (
                                    <Box sx={{ mt: 1, p: 2, border: '1px solid', borderColor: 'warning.light', borderRadius: 1, bgcolor: 'warning.stack' }}>
                                        <Typography variant="subtitle2" color="warning.main" gutterBottom>
                                            Resolution Required
                                        </Typography>
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={3}
                                            label="Resolution Comment"
                                            placeholder="Explain how the issue was resolved or why it failed..."
                                            value={localResolutionComment}
                                            onChange={(e) => setLocalResolutionComment(e.target.value)}
                                            sx={{ mb: 1 }}
                                        />
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            fullWidth
                                            onClick={submitResolution}
                                            disabled={!localResolutionComment.trim() || (localStatus === viewingTicket.status && localResolutionComment === viewingTicket.resolutionComment)}
                                        >
                                            Save Resolution & Update Status
                                        </Button>
                                    </Box>
                                )}

                                {viewingTicket.resolutionComment && (localStatus !== 'Solved' && localStatus !== 'Failed') && (
                                    <Box sx={{ mt: 1, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: '#f9f9f9' }}>
                                        <Typography variant="caption" color="text.secondary">Previous Resolution:</Typography>
                                        <Typography variant="body2">{viewingTicket.resolutionComment}</Typography>
                                    </Box>
                                )}

                                <TextField
                                    fullWidth
                                    label="Deadline"
                                    type="date"
                                    disabled={!isAdmin}
                                    InputLabelProps={{ shrink: true }}
                                    value={viewingTicket.deadline ? viewingTicket.deadline.split('T')[0] : ''}
                                    onChange={(e) => handleUpdateTicket(viewingTicket.id, { deadline: e.target.value })}
                                />

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
                            </Box>
                        </Box>

                        <Divider sx={{ my: 1 }} />
                        <Typography variant="subtitle1" fontWeight="bold">Stakeholders (Followers)</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                            {viewingTicket.followers && viewingTicket.followers.length > 0 ? (
                                viewingTicket.followers.map(email => (
                                    <Chip key={email} label={email} size="small" variant="outlined" color="primary" />
                                ))
                            ) : (
                                <Typography variant="body2" color="text.secondary">No followers</Typography>
                            )}
                        </Box>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="h6" gutterBottom>Audit Trail (Activity)</Typography>
                        <List sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            {history.length > 0 ? history.map(h => (
                                <ListItem key={h.id} dense divider>
                                    <ListItemText
                                        primary={h.action}
                                        secondary={`${h.details} • By ${h.performer} on ${new Date(h.timestamp).toLocaleString()}`}
                                    />
                                </ListItem>
                            )) : <Box p={2}><Typography variant="body2" color="text.secondary">No activity logged.</Typography></Box>}
                        </List>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="subtitle1" fontWeight="bold">Linked Requests ({linkedRequests?.length || 0})</Typography>
                        <List size="small">
                            {linkedRequests?.map(req => (
                                <LinkedRequestItem
                                    key={req.id}
                                    req={req}
                                    isAdmin={isAdmin}
                                    linkedRequestsLength={linkedRequests?.length || 0}
                                    onUnlink={handleUnlinkRequest}
                                    viewingTicketId={viewingTicket.id}
                                />
                            ))}
                        </List>

                        <Divider sx={{ my: 1 }} />
                        <Typography variant="h6" gutterBottom>Comments</Typography>
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
                        )) : null}
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
