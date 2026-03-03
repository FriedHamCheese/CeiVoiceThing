import React, { useCallback } from 'react';
import { Card, Box, Typography, Button, Checkbox, Chip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';

// Construct API URL
const API_HOST = import.meta.env.VITE_API_HOST || 'localhost';
const API_PORT = import.meta.env.VITE_API_PORT || '5001';
const API_URL = `http://${API_HOST}:${API_PORT}`;

/**
 * Service function to handle the API request.
 * Decoupling this makes it easier to test and reuse.
 */
async function promoteTicketToNew(ticketID, userEmail) {
    const url = `${API_URL}/api/admin/tickets/${ticketID}`;

    const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ticketID: ticketID,
            adminEmail: userEmail,
            status: 'New'
        }),
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
    }

    return response;
}

export function DraftTicketComponent({ ticket, setErrorMessage, isSelected, onToggleSelect, onView, onSuccess, userRole }) {

    const handleRequestChange = useCallback(async (e) => {
        e.stopPropagation(); // Prevent card click
        try {
            await promoteTicketToNew(ticket.id);
            setErrorMessage(''); // Clear errors on success
            if (onSuccess) onSuccess();
        } catch (err) {
            if (err instanceof TypeError) {
                setErrorMessage("Network error: Could not connect to the server.");
            }
            else if (err.message.includes('HTTP Error')) {
                setErrorMessage(`Server error: ${err.message}`);
            }
            else {
                setErrorMessage("An unexpected error occurred.");
                console.error("DraftTicketComponent Error:", err);
            }
        }
    }, [ticket.id, setErrorMessage, onSuccess]);

    return (
        <Card variant="outlined" sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
            {onToggleSelect && (
                <Checkbox
                    checked={isSelected || false}
                    onChange={onToggleSelect}
                    onClick={(e) => e.stopPropagation()}
                />
            )}

            <Box sx={{ flexGrow: 1, ml: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, gap: { xs: 0.5, md: 2 } }}>
                <Typography variant="subtitle1" component="div" sx={{ fontWeight: 500 }}>
                    {ticket.title}
                </Typography>
                {ticket.requestCount > 1 && (
                    <Chip
                        label={`${ticket.requestCount} Requests`}
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
                <Button
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={() => onView(ticket)}
                >
                    View
                </Button>
                {userRole >= 4 && (
                    <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<ArrowUpwardIcon />}
                        onClick={handleRequestChange}
                    >
                        Submit
                    </Button>
                )}
            </Box>
        </Card>
    );
}

export const NewTicketComponent = ({ ticket, onView }) => (
    <Card variant="outlined" sx={{ display: 'flex', alignItems: 'center', p: 1, pl: 2 }}>
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>{ticket.title}</Typography>
            <Chip
                label={ticket.status}
                size="small"
                color={ticket.status === 'New' ? 'primary' : 'default'}
                variant={ticket.status === 'New' ? 'filled' : 'outlined'}
            />
        </Box>
        <Button size="small" startIcon={<VisibilityIcon />} onClick={() => onView(ticket)}>
            View
        </Button>
    </Card>
);
