import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Container, Typography } from '@mui/material';
import { useTrackTicket } from './utils/trackLogic';
import { TrackSearch, TrackList, TrackDetails } from './components/TrackComponents';

export default function TrackTicket({ token: propToken }) {
    const { token: urlToken } = useParams();
    const [searchParams] = useSearchParams();

    const {
        inputToken, setInputToken,
        email, setEmail,
        ticketStatus, setTicketStatus,
        userTickets,
        loading,
        error,
        newComment, setNewComment,
        commentError,
        viewMode, setViewMode,
        fetchStatus,
        handleAddComment,
        getStep,
        user
    } = useTrackTicket(propToken, urlToken, searchParams.get('email'));

    const steps = ['Received', 'Review', 'Active', 'Resolving', 'Finished'];

    const handleViewDetails = (ticket) => {
        if (ticket.tracking_token) {
            setInputToken(ticket.tracking_token);
            fetchStatus(null, ticket.tracking_token, user.email);
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: 2 }}>
            <Typography variant="h4" align='center' component="h1" gutterBottom fontWeight="bold" color="primary">
                Track Your Request
            </Typography>

            {viewMode === 'search' && (
                <TrackSearch
                    inputToken={inputToken}
                    setInputToken={setInputToken}
                    email={email}
                    setEmail={setEmail}
                    error={error}
                    loading={loading}
                    user={user}
                    fetchStatus={fetchStatus}
                    setViewMode={setViewMode}
                />
            )}

            {viewMode === 'list' && (
                <TrackList
                    userTickets={userTickets}
                    handleViewDetails={handleViewDetails}
                />
            )}

            {viewMode === 'details' && ticketStatus && (
                <TrackDetails
                    ticketStatus={ticketStatus}
                    getStep={getStep}
                    steps={steps}
                    user={user}
                    setTicketStatus={setTicketStatus}
                    setViewMode={setViewMode}
                    newComment={newComment}
                    setNewComment={setNewComment}
                    commentError={commentError}
                    handleAddComment={handleAddComment}
                />
            )}
        </Container>
    );
}
