import { useState, useEffect } from 'react';
import { DraftTicketComponent } from './ViewTicketsPage_components.jsx';
import MergeWindow from './ViewTicketsPage_MergeWindow.jsx';
import {
  Container, Typography, Box, Button, Stack, Dialog,
  DialogTitle, DialogContent, DialogContentText, DialogActions,
  Card, CardContent, CardActions, Chip, CircularProgress, Alert,
  Divider, TextField, MenuItem, Select, FormControl, InputLabel,
  List, ListItem, ListItemText, Tab, Tabs
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Construct API URL
const API_HOST = import.meta.env.VITE_API_HOST || 'localhost';
const API_PORT = import.meta.env.VITE_API_PORT || '3001';
const API_URL = `http://${API_HOST}:${API_PORT}`;

// Move sub-components outside to prevent re-creation on every render
const NewTicketComponent = ({ ticket, onView }) => (
  <Card variant="outlined" sx={{ display: 'flex', alignItems: 'center', p: 1, pl: 2 }}>
    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>{ticket.title}</Typography>
    </Box>
    <Button size="small" startIcon={<VisibilityIcon />} onClick={() => onView(ticket)}>
      View
    </Button>
  </Card>
);

export default function ViewTicketsPage({ redirectToHomePage, user }) {
  const [tickets, setTickets] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDraftIds, setSelectedDraftIds] = useState(new Set());
  const [showMergeWindow, setShowMergeWindow] = useState(false);
  const [viewingTicket, setViewingTicket] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [isRecommending, setIsRecommending] = useState(false);

  const [specialists, setSpecialists] = useState([]);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [linkedRequests, setLinkedRequests] = useState([]);
  const [isCommentInternal, setIsCommentInternal] = useState(false);

  const fetchSpecialists = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/tickets/specialists`);
      if (response.ok) setSpecialists(await response.json());
    } catch (err) { console.error("Failed to fetch specialists", err); }
  };

  const fetchComments = async (id) => {
    try {
      const response = await fetch(`${API_URL}/admin/tickets/${id}/comments`);
      if (response.ok) setComments(await response.json());
    } catch (err) { console.error("Failed to fetch comments", err); }
  };

  const fetchHistory = async (id) => {
    try {
      const response = await fetch(`${API_URL}/admin/tickets/${id}/history`);
      if (response.ok) setHistory(await response.json());
    } catch (err) { console.error("Failed to fetch history", err); }
  };

  const fetchLinkedRequests = async (id) => {
    try {
      const response = await fetch(`${API_URL}/admin/tickets/draft/${id}/requests`);
      if (response.ok) setLinkedRequests(await response.json());
    } catch (err) { console.error("Failed to fetch linked requests", err); }
  };

  const handleUpdateDraft = async (id, updates) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`${API_URL}/admin/tickets/draft/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (response.ok) {
        fetchAllTickets();
        const updatedTicket = { ...viewingTicket, ...updates };
        setViewingTicket(updatedTicket);
      }
    } catch (err) { console.error("Failed to update draft", err); }
    setIsUpdating(false);
  };

  const handleUnlinkRequest = async (draftId, requestId) => {
    try {
      const response = await fetch(`${API_URL}/admin/tickets/draft/${draftId}/unlink/${requestId}`, {
        method: 'POST'
      });
      if (response.ok) {
        fetchAllTickets();
        fetchLinkedRequests(draftId);
        // If unlinked, the current view might be stale, but the list of requests will update
      } else {
        const error = await response.json();
        setErrorMessage(error.error || "Failed to unlink");
      }
    } catch (err) { console.error("Failed to unlink", err); }
  };

  const handleUpdateTicket = async (id, updates) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`${API_URL}/admin/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (response.ok) {
        fetchAllTickets();
        fetchHistory(id);
        if (viewingTicket?.id === id) {
          setViewingTicket({ ...viewingTicket, ...updates });
        }
      }
    } catch (err) { console.error("Failed to update ticket", err); }
    setIsUpdating(false);
  };

  const handleAddComment = async (id) => {
    if (!newComment.trim()) return;
    try {
      const response = await fetch(`${API_URL}/admin/tickets/${id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newComment,
          authorEmail: user?.email,
          isInternal: isCommentInternal
        })
      });
      if (response.ok) {
        setNewComment('');
        setIsCommentInternal(false);
        fetchComments(id);
      }
    } catch (err) { console.error("Failed to add comment", err); }
  };

  const fetchRecommendations = async () => {
    setIsRecommending(true);
    try {
      const response = await fetch(`${API_URL}/admin/tickets/recommend-merges`);
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (err) {
      console.error("Recommendations fetch failed:", err);
    } finally {
      setIsRecommending(false);
    }
  };

  const fetchAllTickets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/tickets`);

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data.tickets)) {
        throw new Error("Invalid data format: .tickets is not an array.");
      }

      setTickets(data.tickets);
      setErrorMessage('');
    } catch (err) {
      // Friendly mapping of technical errors
      if (err instanceof TypeError) {
        setErrorMessage("Network error: Could not connect to server.");
      } else if (err instanceof SyntaxError) {
        setErrorMessage("Parse error: Received invalid JSON from server.");
      } else {
        setErrorMessage(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTickets();
    fetchRecommendations();
    fetchSpecialists();
  }, []);

  useEffect(() => {
    if (viewingTicket) {
      if (viewingTicket.type === 'draft') {
        fetchLinkedRequests(viewingTicket.id);
      } else {
        fetchComments(viewingTicket.id);
        fetchHistory(viewingTicket.id);
      }
    }
  }, [viewingTicket]);

  const handleToggleSelect = (id) => {
    const newSet = new Set(selectedDraftIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedDraftIds(newSet);
  };

  // Derive filtered lists during render rather than storing them in state
  const draftTickets = tickets.filter(t => t.type === 'draft');
  const otherTickets = tickets.filter(t => t.type !== 'draft');

  return (
    <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="left" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          {user?.perm >= 4 ? "Admin Dashboard" : "Specialist Dashboard"}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={redirectToHomePage}
        >
          Back to Home
        </Button>
      </Box>

      {errorMessage && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>}

      {recommendations.length > 0 && (
        <Alert severity="info" sx={{ mt: 2, mb: 3 }} action={
          <Button color="inherit" size="small" onClick={() => {
            setSelectedDraftIds(new Set(recommendations[0]));
            setShowMergeWindow(true);
          }}>
            Review Recommended Merge
          </Button>
        }>
          AI has identified {recommendations.length} group(s) of similar requests that could be merged.
        </Alert>
      )}


      {isLoading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Typography variant="h5" sx={{ mb: 2, mt: 4 }}>Active Tickets</Typography>
          {otherTickets.length > 0 ? (
            <Stack spacing={2}>
              {otherTickets.map(ticket => (
                <NewTicketComponent
                  key={ticket.id}
                  ticket={ticket}
                  onView={setViewingTicket}
                />
              ))}
            </Stack>
          ) : (
            <Typography color="text.secondary" fontStyle="italic">No active tickets.</Typography>
          )}

          {user?.perm >= 4 && (
            <>
              <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2, mt: 4 }}>
                <Typography variant="h5">Draft Tickets (Review Queue)</Typography>
                <Button
                  variant="contained"
                  onClick={() => setShowMergeWindow(true)}
                  disabled={selectedDraftIds.size < 2}
                >
                  Merge Selected ({selectedDraftIds.size})
                </Button>
              </Box>

              {draftTickets.length > 0 ? (
                <Stack spacing={2}>
                  {draftTickets.map(ticket => (
                    <DraftTicketComponent
                      key={ticket.id}
                      ticket={ticket}
                      setErrorMessage={setErrorMessage}
                      isSelected={selectedDraftIds.has(ticket.id)}
                      onToggleSelect={() => handleToggleSelect(ticket.id)}
                      onView={setViewingTicket}
                      onSuccess={fetchAllTickets}
                      userRole={user?.perm}
                    />
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary" fontStyle="italic">No draft tickets.</Typography>
              )}
            </>
          )}
        </>
      )}

      {showMergeWindow && (
        <MergeWindow
          closeWindow={setShowMergeWindow}
          draftTicketIDsForMerging={Array.from(selectedDraftIds)}
          refreshData={fetchAllTickets}
        />
      )}

      {/* View/Edit Ticket Dialog */}
      <Dialog open={!!viewingTicket} onClose={() => setViewingTicket(null)} fullWidth maxWidth="sm">
        {viewingTicket && (
          <>
            <DialogTitle>
              {viewingTicket.type === 'draft' ? 'Edit Draft Ticket' : viewingTicket.title}
            </DialogTitle>
            <DialogContent dividers>
              {viewingTicket.type === 'draft' ? (
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
                      disabled={user?.perm < 4}
                      InputLabelProps={{ shrink: true }}
                      value={viewingTicket.deadline ? viewingTicket.deadline.split('T')[0] : ''}
                      onChange={(e) => handleUpdateDraft(viewingTicket.id, { deadline: e.target.value })}
                    />
                    <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                      <InputLabel>Specialist</InputLabel>
                      <Select
                        value={viewingTicket.assigneeEmail || ''}
                        label="Specialist"
                        disabled={user?.perm < 4}
                        onChange={(e) => handleUpdateDraft(viewingTicket.id, { assigneeEmail: e.target.value })}
                      >
                        <MenuItem value=""><em>None</em></MenuItem>
                        {specialists.map(s => (
                          <MenuItem key={s.email} value={s.email}>{s.name} ({s.scope})</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
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
                <>
                  <DialogContentText sx={{ color: 'text.primary', mb: 1 }}>
                    <strong>Content:</strong>
                  </DialogContentText>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
                    {viewingTicket.summary || viewingTicket.requestContents || "No content available."}
                  </Typography>

                  {viewingTicket.suggestedSolutions && (
                    <>
                      <DialogContentText sx={{ color: 'text.primary', mb: 1 }}>
                        <strong>Suggested Solutions:</strong>
                      </DialogContentText>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
                        {viewingTicket.suggestedSolutions}
                      </Typography>
                    </>
                  )}

                  {viewingTicket.suggestedAssignee && (
                    <>
                      <DialogContentText sx={{ color: 'text.primary', mb: 1 }}>
                        <strong>AI Suggested Assignee:</strong>
                      </DialogContentText>
                      <Chip label={viewingTicket.suggestedAssignee} color="primary" variant="outlined" sx={{ mb: 2 }} />
                    </>
                  )}

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

                    <FormControl fullWidth size="small">
                      <InputLabel>Specialist</InputLabel>
                      <Select
                        value={viewingTicket.assigneeEmail || ''}
                        label="Specialist"
                        disabled={user?.perm < 4}
                        onChange={(e) => handleUpdateTicket(viewingTicket.id, { assigneeEmail: e.target.value })}
                      >
                        <MenuItem value=""><em>None</em></MenuItem>
                        {specialists.map(s => (
                          <MenuItem key={s.email} value={s.email}>{s.name} ({s.scope})</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>

                  <TextField
                    fullWidth
                    label="Deadline"
                    type="date"
                    size="small"
                    disabled={user?.perm < 4}
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
                      <label htmlFor="internal" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>Mark as Internal</label>
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
              {(viewingTicket.type === 'draft' && user?.perm >= 4) && (
                <Button
                  color="success"
                  variant="contained"
                  onClick={async () => {
                    try {
                      const response = await fetch(`${API_URL}/admin/tickets/toNewTicket`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ticketID: viewingTicket.id })
                      });
                      if (response.ok) {
                        setViewingTicket(null);
                        fetchAllTickets();
                      }
                    } catch (err) { console.error(err); }
                  }}
                >
                  Confirm and Promote
                </Button>
              )}
              <Button onClick={() => setViewingTicket(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
}