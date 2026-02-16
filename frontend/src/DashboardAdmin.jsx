import React from 'react';
import { DraftTicketComponent, NewTicketComponent } from './components/DashboardComponents.jsx';
import DashboardMergeWindow from './components/DashboardMergeWindow.jsx';
import DashboardTicketView from './components/DashboardTicketView.jsx';
import {
    Container, Typography, Box, Button, Stack, CircularProgress, Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { useDashboardTickets } from './utils/dashboardLogic.js';

export default function AdminDashboard() {
    const {
        tickets, errorMessage, setErrorMessage, isLoading,
        selectedDraftIds, setSelectedDraftIds, handleToggleSelect,
        showMergeWindow, setShowMergeWindow,
        viewingTicket, setViewingTicket,
        recommendations,
        specialists,
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

    const draftTickets = tickets.filter(t => t.type === 'draft');
    const otherTickets = tickets.filter(t => t.type !== 'draft');

    return (
        <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="left" mb={3}>
                <Typography variant="h4" component="h1" fontWeight="bold">
                    Admin Dashboard
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

                    <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2, mt: 4 }}>
                        <Typography variant="h5">Draft Tickets (Review Queue)</Typography>
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
                    refreshData={fetchAllTickets}
                    clearSelection={() => setSelectedDraftIds(new Set())}
                />
            )}

            {/* View/Edit Ticket Dialog */}
            <DashboardTicketView
                viewingTicket={viewingTicket}
                setViewingTicket={setViewingTicket}
                specialists={specialists}
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
