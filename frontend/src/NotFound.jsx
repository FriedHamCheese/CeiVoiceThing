import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { useAuth } from './context/AuthContext';

export default function NotFound() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [seconds, setSeconds] = useState(4);

    useEffect(() => {
        // Wait for auth to finish loading before starting countdown/redirect
        if (loading) return;

        const interval = setInterval(() => {
            setSeconds((prev) => prev - 1);
        }, 1000);

        const timeout = setTimeout(() => {
            if (user) {
                navigate('/track-request', { replace: true });
            } else {
                navigate('/login', { replace: true });
            }
        }, 4000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [user, loading, navigate]);

    return (
        <Box
            sx={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                p: 3,
                bgcolor: '#f5f5f5'
            }}
        >
            <Typography variant="h2" color="error" fontWeight="bold" gutterBottom>
                404
            </Typography>
            <Typography variant="h5" gutterBottom>
                Page Not Found
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                Redirecting in {seconds} second{seconds !== 1 ? 's' : ''}...
            </Typography>
        </Box>
    );
}
