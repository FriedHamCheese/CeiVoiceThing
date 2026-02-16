import React from 'react';
import { Card, CardContent, Typography, Box, Stack } from '@mui/material';

export const MetricCard = ({ label, value }) => (
    <Card variant="outlined" sx={{ height: '100%' }}>
        <CardContent>
            <Typography variant="overline" color="text.secondary">
                {label}
            </Typography>
            <Typography variant="h4" sx={{ mt: 1 }}>
                {value}
            </Typography>
        </CardContent>
    </Card>
);

export const BreakdownList = ({ title, items, total }) => (
    <Card variant="outlined">
        <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
                {title}
            </Typography>
            <Stack spacing={1.5}>
                {items.length === 0 && (
                    <Typography color="text.secondary">No data available.</Typography>
                )}
                {items.map((item) => {
                    const count = item.count || 0;
                    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                        <Box key={item.label}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="body2">{item.label}</Typography>
                                <Typography variant="body2" color="text.secondary">{count} ({percent}%)</Typography>
                            </Box>
                            <Box sx={{ height: 8, backgroundColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                                <Box
                                    sx={{
                                        height: '100%',
                                        width: `${percent}%`,
                                        backgroundColor: '#1a73e8'
                                    }}
                                />
                            </Box>
                        </Box>
                    );
                })}
            </Stack>
        </CardContent>
    </Card>
);
