import React, { useState, useMemo } from 'react';
import { DraftTicketComponent, NewTicketComponent } from './components/DashboardComponents.jsx';
import DashboardMergeWindow from './components/DashboardMergeWindow.jsx';
import DashboardTicketView from './components/DashboardTicketView.jsx';
import {
    Container, Typography, Box, Button, Stack, CircularProgress, Alert,
    FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { useDashboardTickets } from './utils/dashboardLogicAdmin.js';

export default function AdminDashboard() {
    const {
        tickets, errorMessage, setErrorMessage, isLoading,
        selectedDraftIds, setSelectedDraftIds, handleToggleSelect,
        showMergeWindow, setShowMergeWindow,
        viewingTicket, setViewingTicket,
        recommendations,
        assignees, categories,
        comments, history, linkedRequests,
        newComment, setNewComment,
        isCommentInternal, setIsCommentInternal,
        fetchAllTickets,
        handleUpdateDraft, handleUnlinkRequest,
        handleUpdateTicket, handleAddComment,
        promoteTicket,
        handleToggleFollow, isFollowing
    } = useDashboardTickets();

    const redirectToHomePage = () => {
        window.location.href = '/';
    }

    const [sortBy, setSortBy] = useState('deadline');
    const [sortOrder, setSortOrder] = useState('asc');

    const sortedTickets = useMemo(() => {
        return [...tickets].sort((a, b) => {
            let valA = a[sortBy];
            let valB = b[sortBy];

            if (sortBy === 'deadline') {
                if (!valA && !valB) return 0;
                if (!valA) return 1; // Put nulls at the end
                if (!valB) return -1;
            } else {
                if (!valA && !valB) return 0;
                if (!valA) return 1;
                if (!valB) return -1;
            }

            valA = valA ? new Date(valA).getTime() : 0;
            valB = valB ? new Date(valB).getTime() : 0;

            if (sortOrder === 'asc') {
                return valA - valB;
            } else {
                return valB - valA;
            }
        });
    }, [tickets, sortBy, sortOrder]);

    const draftTickets = sortedTickets.filter(t => t.status === 'draft');
    const otherTickets = sortedTickets.filter(t => t.status !== 'draft');

    return (
        <Container maxWidth={false} sx={{ width: '100%', maxWidth: '100%', mt: 4, mb: 4, px: { xs: 1, sm: 2, md: 3 } }}>
            <Box display="flex" justifyContent="space-between" alignItems="left" mb={3}>
                <Typography variant="h4" component="h1" fontWeight="bold">
                    Admin Dashboard
                </Typography>
            </Box>

            {errorMessage && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>}

            {recommendations.length > 0 && (
                <Alert severity="info" sx={{ mt: 2, mb: 3 }} action={
                    <Button color="inherit" size="small" onClick={() => {
                        const selectedTickets = tickets.filter(t => recommendations[0].includes(t.id));
                        setShowMergeWindow(selectedTickets);
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
                    <Box display="flex" justifyContent="flex-end" mb={2}>
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel id="sort-by-label-admin">Sort By</InputLabel>
                            <Select
                                labelId="sort-by-label-admin"
                                value={`${sortBy}-${sortOrder}`}
                                label="Sort By"
                                onChange={(e) => {
                                    const [newSortBy, newSortOrder] = e.target.value.split('-');
                                    setSortBy(newSortBy);
                                    setSortOrder(newSortOrder);
                                }}
                            >
                                <MenuItem value="createdAt-desc">Creation Date (Newest)</MenuItem>
                                <MenuItem value="createdAt-asc">Creation Date (Oldest)</MenuItem>
                                <MenuItem value="deadline-asc">Deadline (Soonest)</MenuItem>
                                <MenuItem value="deadline-desc">Deadline (Latest)</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    <Typography variant="h5" sx={{ mb: 2 }}>Active Tickets</Typography>
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

                    <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2, mt: 4 }}>
                        <Typography variant="h5">Draft Tickets</Typography>
                        <Button
                            variant="contained"
                            onClick={() => {
                                const selectedTickets = tickets.filter(t => selectedDraftIds.has(t.id));
                                setShowMergeWindow(selectedTickets);
                            }}
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
                                    userRole={4}
                                />
                            ))}
                        </Stack>
                    ) : (
                        <Typography color="text.secondary" fontStyle="italic">No draft tickets.</Typography>
                    )}
                </>
            )}

            {showMergeWindow && (
                <DashboardMergeWindow
                    closeWindow={() => setShowMergeWindow(null)}
                    selectedDraftTickets={showMergeWindow}
                    refreshData={() => window.location.reload()}
                    clearSelection={() => setSelectedDraftIds(new Set())}
                    assignees={assignees}
                />
            )}

            {/* View/Edit Ticket Dialog */}
            <DashboardTicketView
                viewingTicket={viewingTicket}
                setViewingTicket={setViewingTicket}
                assignees={assignees}
                categories={categories}
                isAdmin={true}
                handleUpdateDraft={handleUpdateDraft}
                handleUpdateTicket={handleUpdateTicket}
                handleUnlinkRequest={handleUnlinkRequest}
                linkedRequests={linkedRequests}
                comments={comments}
                newComment={newComment}
                setNewComment={setNewComment}
                handleAddComment={handleAddComment}
                isCommentInternal={isCommentInternal}
                setIsCommentInternal={setIsCommentInternal}
                history={history}
                promoteTicket={promoteTicket}
                handleToggleFollow={handleToggleFollow}
                isFollowing={isFollowing}
            />
        </Container>
    );
}
