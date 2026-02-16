import { useState, useEffect, useRef } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Stack, Chip, Typography, Box,
    Accordion, AccordionSummary, AccordionDetails,
    Alert
} from '@mui/material';

// Construct API URL
const API_HOST = import.meta.env.VITE_API_HOST || 'localhost';
const API_PORT = import.meta.env.VITE_API_PORT || '5001';
const API_URL = `http://${API_HOST}:${API_PORT}`;

function DraftTicketComponent({ draftTicket, removeSelf }) {
    return (
        <Accordion disableGutters elevation={1} sx={{ mb: 1, '&:before': { display: 'none' } }}>
            <AccordionSummary
                expandIcon={<span>▼</span>}
                aria-controls={`panel-${draftTicket.id}-content`}
                id={`panel-${draftTicket.id}-header`}
                sx={{ flexDirection: 'row-reverse', '& .MuiAccordionSummary-content': { marginLeft: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' } }}
            >
                <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>#{draftTicket.id}</Typography>
                    <Typography variant="subtitle2">{draftTicket.title}</Typography>
                </Box>
                <Button
                    size="small"
                    color="error"
                    onClick={(e) => {
                        e.stopPropagation();
                        removeSelf(draftTicket.id);
                    }}
                    sx={{ minWidth: 'auto' }}
                >
                    UNLINK
                </Button>
            </AccordionSummary>
            <AccordionDetails>
                <Typography variant="subtitle2" gutterBottom>Content/Summary</Typography>
                <Typography variant="body2" paragraph color="text.secondary">{draftTicket.summary}</Typography>

                <Typography variant="subtitle2" gutterBottom>Suggested solutions</Typography>
                <Typography variant="body2" color="text.secondary">{draftTicket.suggestedSolutions}</Typography>
            </AccordionDetails>
        </Accordion>
    );
}

export default function DashboardMergeWindow({ closeWindow, selectedDraftTickets, refreshData, clearSelection }) {
    const [contentText, setContentText] = useState("");
    const [suggestedSolutionsText, setSuggestedSolutionsText] = useState("");
    const [titleText, setTitleText] = useState("");
    const [categories, setCategories] = useState([]);
    const [mergingDraftTickets, setMergingDraftTickets] = useState(selectedDraftTickets || []);
    const [deadline, setDeadline] = useState("");
    const [assigneeEmail, setAssigneeEmail] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const MAX_TITLE = 128;
    const MAX_BODY = 2048;

    // Initialization effect
    useEffect(() => {
        if (selectedDraftTickets && selectedDraftTickets.length > 0) {
            const primary = selectedDraftTickets[0];
            setContentText(primary.requestContents || primary.summary || "");
            setTitleText(primary.title || "");
            setSuggestedSolutionsText(primary.suggestedSolutions || "");
            setCategories(primary.categories || []);
            setDeadline(primary.deadline ? primary.deadline.split('T')[0] : "");
            setAssigneeEmail(primary.assigneeEmail || "");
            setMergingDraftTickets(selectedDraftTickets);
        }
    }, [selectedDraftTickets]);

    async function sendMergeRequest() {
        let response = null;
        try {
            response = await fetch(`${API_URL}/admin/tickets/merge/`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    draftTicketIDs: mergingDraftTickets.map(dt => dt.id),
                    title: titleText,
                    summary: contentText,
                    categories: categories,
                    suggestedSolutions: suggestedSolutionsText,
                    deadline: deadline,
                    assigneeEmail: assigneeEmail
                }),
                credentials: 'include'
            });
        } catch (err) {
            if (err instanceof TypeError)
                return setErrorMessage("Couldn't connect to the server (fetch: TypeError).");
            else throw err;
        }

        if (response.ok) {
            if (refreshData) await refreshData(); // wait for tickets to refresh
            if (clearSelection) clearSelection(); // clear the count
            closeWindow();
            return;
        }

        let objectFromResponse = null;
        try {
            objectFromResponse = await response.json();
            setErrorMessage(objectFromResponse.error);
        } catch (err) {
            if (err instanceof TypeError) setErrorMessage("Could read the request body from the server.");
            if (err instanceof SyntaxError) setErrorMessage("Could parse the request from the server.");
            else throw err;
        }
    }

    function removeDraftFromMerge(id) {
        const newDrafts = mergingDraftTickets.filter(dt => dt.id !== id);
        if (newDrafts.length < 2) {
            closeWindow();
            return;
        }
        setMergingDraftTickets(newDrafts);
    }

    const handleClose = () => {
        closeWindow();
    };

    return (
        <Dialog open={true} onClose={handleClose} fullWidth maxWidth="md">
            <DialogTitle>
                Merge Tickets
            </DialogTitle>
            <DialogContent dividers>
                {errorMessage && (
                    <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>
                )}

                <Stack spacing={3}>
                    <TextField
                        fullWidth
                        label="Ticket Title"
                        value={titleText}
                        onChange={e => setTitleText(e.target.value.slice(0, MAX_TITLE))}
                        placeholder="Ticket Title"
                    />

                    <Box>
                        <Typography variant="subtitle2" gutterBottom>Categories</Typography>
                        <Stack direction="row" flexWrap="wrap" gap={1}>
                            {categories.map(cat => (
                                <Chip
                                    key={cat}
                                    label={cat}
                                    onDelete={() => setCategories(prev => prev.filter(i => i !== cat))}
                                />
                            ))}
                            {categories.length === 0 && <Typography variant="body2" color="text.secondary">No categories</Typography>}
                        </Stack>
                    </Box>

                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        label="Content / Summary"
                        value={contentText}
                        onChange={e => setContentText(e.target.value.slice(0, MAX_BODY))}
                        placeholder="Summary of the merged request..."
                    />

                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        label="Suggested Solutions"
                        value={suggestedSolutionsText}
                        onChange={e => setSuggestedSolutionsText(e.target.value.slice(0, MAX_BODY))}
                        placeholder="Proposed solutions..."
                    />

                    <Box>
                        <Typography variant="subtitle2" gutterBottom>Merging From ({mergingDraftTickets.length})</Typography>
                        {mergingDraftTickets.map(dt => (
                            <DraftTicketComponent key={dt.id} draftTicket={dt} removeSelf={removeDraftFromMerge} />
                        ))}
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button variant="contained" onClick={sendMergeRequest}>Confirm Merge</Button>
            </DialogActions>
        </Dialog>
    );
}
