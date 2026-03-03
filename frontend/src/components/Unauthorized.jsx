import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import LockPersonIcon from '@mui/icons-material/LockPerson';

const Unauthorized = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate('/track-request');
        }, 5000); // Redirect after 5 seconds

        return () => clearTimeout(timer); // Cleanup timer on unmount
    }, [navigate]);

    return (
        <Container component="main" maxWidth="sm">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Paper
                    elevation={3}
                    sx={{
                        p: 5,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        borderRadius: 3,
                        bgcolor: 'background.paper',
                    }}
                >
                    <LockPersonIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                    <Typography component="h1" variant="h3" color="error" fontWeight="bold" gutterBottom>
                        403
                    </Typography>
                    <Typography variant="h5" color="text.primary" gutterBottom>
                        Unauthorized Access
                    </Typography>
                    <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 1 }}>
                        You do not have permission to view this page.
                    </Typography>
                    <Typography variant="body2" color="text.disabled" sx={{ mb: 4 }}>
                        Redirecting to home in 5 seconds...
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => navigate('/track-request')}
                        size="large"
                        sx={{ borderRadius: 2, px: 4 }}
                    >
                        Go to Home
                    </Button>
                </Paper>
            </Box>
        </Container>
    );
};

export default Unauthorized;
