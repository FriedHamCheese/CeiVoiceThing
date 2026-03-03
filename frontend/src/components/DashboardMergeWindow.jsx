import { useState, useEffect, useRef } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Stack, Chip, Typography, Box,
    Accordion, AccordionSummary, AccordionDetails,
    Alert, Autocomplete
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
                <Typography variant="body2" color="text.secondary">{draftTicket.solution}</Typography>
            </AccordionDetails>
        </Accordion>
    );
}

export default function DashboardMergeWindow({ closeWindow, selectedDraftTickets, refreshData, clearSelection, assignees }) {
    const [contentText, setContentText] = useState("");
    const [suggestedSolutionsText, setSuggestedSolutionsText] = useState("");
    const [titleText, setTitleText] = useState("");
    const [categories, setCategories] = useState([]);
    const [mergingDraftTickets, setMergingDraftTickets] = useState(selectedDraftTickets || []);
    const [deadline, setDeadline] = useState("");
    const [assigneeEmails, setAssigneeEmails] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");

    const MAX_TITLE = 128;
    const MAX_BODY = 2048;

    // Helper to get category as array
    const getCategoriesArray = (categories) => {
        if (!categories) return [];
        if (Array.isArray(categories)) return categories;
        return categories.split(',').map(s => s.trim()).filter(Boolean);
    };

    // Initialization effect
    useEffect(() => {
        if (selectedDraftTickets && selectedDraftTickets.length > 0) {
            const primary = selectedDraftTickets[0];
            setContentText(primary.requestContents || primary.summary || "");
            setTitleText(primary.title || "");
            setSuggestedSolutionsText(primary.solution || "");
            setCategories(getCategoriesArray(primary.categories));
            setDeadline(primary.deadline ? primary.deadline.split('T')[0] : "");
            setAssigneeEmails(primary.assignees || []);

            // Handle multiple assignees from primary if possible
            const initialEmails = primary.assignees ?
                (Array.isArray(primary.assignees) ? primary.assignees : primary.assignees.split(',').map(s => s.trim())) :
                [];
            setAssigneeEmails(initialEmails);
            setMergingDraftTickets(selectedDraftTickets);
        }
    }, [selectedDraftTickets]);

    async function sendMergeRequest() {
        let response = null;
        try {
            response = await fetch(`${API_URL}/api/admin/tickets/merge`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    draftTicketIDs: mergingDraftTickets.map(dt => dt.id),
                    title: titleText,
                    summary: contentText,
                    categories: categories,
                    suggestedSolutions: suggestedSolutionsText,
                    deadline: deadline,
                    assigneeEmails: assigneeEmails
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
                        label="Title"
                        value={titleText}
                        onChange={e => setTitleText(e.target.value.slice(0, MAX_TITLE))}
                        placeholder="Ticket Title"
                    />

                    <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Summary"
                        value={contentText}
                        onChange={e => setContentText(e.target.value.slice(0, MAX_BODY))}
                        placeholder="Summary of the merged request..."
                    />

                    <Autocomplete
                        multiple
                        fullWidth
                        options={[]}
                        value={categories}
                        onChange={(event, newValue) => {
                            setCategories(newValue);
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

                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'stretch' }}>
                        <TextField
                            fullWidth
                            rows={10}
                            multiline
                            label="Solutions"
                            value={suggestedSolutionsText}
                            onChange={(e) => setSuggestedSolutionsText(e.target.value.slice(0, MAX_BODY))}
                            placeholder="Proposed solutions..."
                            sx={{
                                flex: 1,
                            }}
                        />
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField
                                fullWidth
                                label="Deadline"
                                type="date"
                                InputLabelProps={{ shrink: true }}
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                            />

                            <Autocomplete
                                multiple
                                fullWidth
                                options={assignees || []}
                                getOptionLabel={(option) => typeof option === 'string' ? option : `${option.name} (${option.email})`}
                                value={assigneeEmails.map(email => (assignees && assignees.find(a => a.email === email)) || email)}
                                onChange={(event, newValue) => {
                                    const emails = newValue.map(val => typeof val === 'string' ? val : val.email);
                                    setAssigneeEmails(emails);
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
