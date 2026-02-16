import React from 'react';
import { NewTicketComponent } from './components/DashboardComponents.jsx';
import DashboardTicketView from './components/DashboardTicketView.jsx';
import {
    Container, Typography, Box, Button, Stack, CircularProgress, Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { useDashboardTickets } from './utils/dashboardLogic.js';

export default function SpecialistDashboard() {
    const {
        tickets, errorMessage, isLoading,
        viewingTicket, setViewingTicket,
        specialists,
        comments, history, linkedRequests,
        newComment, setNewComment,
        isCommentInternal, setIsCommentInternal,
        handleUpdateTicket, handleAddComment,
        handleToggleFollow, isFollowing
    } = useDashboardTickets();

    const redirectToHomePage = () => {
        window.location.href = '/';
    }

    // Specialist only sees active tickets?
    // The query returns active tickets mostly, but let's filter just in case
    const activeTickets = tickets.filter(t => t.type !== 'draft');

    return (
        <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="left" mb={3}>
                <Typography variant="h4" component="h1" fontWeight="bold">
                    Specialist Dashboard
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

            {isLoading ? (
                <Box display="flex" justifyContent="center" my={4}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    <Typography variant="h5" sx={{ mb: 2, mt: 4 }}>Active Tickets</Typography>
                    {activeTickets.length > 0 ? (
                        <Stack spacing={2}>
                            {activeTickets.map(ticket => (
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
                </>
            )}

            {/* View/Edit Ticket Dialog */}
            <DashboardTicketView
                viewingTicket={viewingTicket}
                setViewingTicket={setViewingTicket}
                specialists={specialists}
                isAdmin={false}
                handleUpdateTicket={handleUpdateTicket}
                // Specialists probably shouldn't edit drafts or unlink requests, so we don't pass those handlers or pass no-ops
                linkedRequests={linkedRequests}
                comments={comments}
                newComment={newComment}
                setNewComment={setNewComment}
                handleAddComment={handleAddComment}
                isCommentInternal={isCommentInternal}
                setIsCommentInternal={setIsCommentInternal}
                history={history}
                handleToggleFollow={handleToggleFollow}
                isFollowing={isFollowing}
            />
        </Container>
    );
}
