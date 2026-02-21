import React, { useState, useMemo } from 'react';
import { NewTicketComponent } from './components/DashboardComponents.jsx';
import DashboardTicketView from './components/DashboardTicketView.jsx';
import {
    Container, Typography, Box, Button, Stack, CircularProgress, Alert, IconButton,
    FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import { Link } from 'react-router-dom';

import { useDashboardTicketsSpecialist } from './utils/dashboardLogicAssignee.js';

export default function SpecialistDashboard() {
    const {
        tickets, errorMessage, isLoading,
        viewingTicket, setViewingTicket,
        specialists,
        comments, history, linkedRequests,
        newComment, setNewComment,
        isCommentInternal, setIsCommentInternal,
        handleUpdateTicket, handleAddComment,
        handleToggleFollow, isFollowing,
        user
    } = useDashboardTicketsSpecialist();

    const redirectToHomePage = () => {
        window.location.href = '/';
    }

    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');

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

    const activeTickets = sortedTickets.filter(t =>
        t.status !== 'draft' &&
        t.status?.toLowerCase() !== 'solved' &&
        t.status?.toLowerCase() !== 'failed' &&
        t.assignees?.includes(user?.email)
    );

    return (
        <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="left" mb={3}>
                <Typography variant="h4" component="h1" fontWeight="bold">
                    Specialist Dashboard
                </Typography>
            </Box>

            {errorMessage && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>}

            {isLoading ? (
                <Box display="flex" justifyContent="center" my={4}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    <Box display="flex" justifyContent="flex-end" mb={2}>
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel id="sort-by-label-assignee">Sort By</InputLabel>
                            <Select
                                labelId="sort-by-label-assignee"
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
                assignees={specialists}
                isAdmin={false}
                user={user}
                handleUpdateTicket={handleUpdateTicket}
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
