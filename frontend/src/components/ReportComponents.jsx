import React from 'react';
import { Card, CardContent, Typography, Box, Stack } from '@mui/material';
import {
    PieChart,
    Pie,
    Cell,
    Legend,
    ResponsiveContainer,
    Tooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
} from 'recharts';

const CHART_COLORS = ['#1a73e8', '#34a853', '#f9ab00', '#ea4335', '#9334e6', '#e37400', '#00acc1', '#5e35b1'];

export const MetricCard = ({ label, value }) => (
    <Card
        variant="outlined"
        sx={{
            width: '100%',
            minWidth: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignSelf: 'stretch',
            boxSizing: 'border-box',
        }}
    >
        <CardContent
            sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                py: { xs: 1.5, sm: 2 },
                px: { xs: 1.5, sm: 2 },
                '&:last-child': { pb: { xs: 1.5, sm: 2 } },
            }}
        >
            <Typography
                variant="overline"
                color="text.secondary"
                sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
            >
                {label}
            </Typography>
            <Typography
                variant="h4"
                fontWeight="bold"
                sx={{
                    mt: 0.5,
                    fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                    lineHeight: 1.2,
                }}
            >
                {value}
            </Typography>
        </CardContent>
    </Card>
);

export const BreakdownPie = ({ title, items, total }) => {
    const chartData = items.map((item, i) => ({
        name: item.label,
        value: item.count || 0,
        fill: CHART_COLORS[i % CHART_COLORS.length]
    })).filter(d => d.value > 0);

    return (
        <Card
            variant="outlined"
            sx={{
                width: '100%',
                minWidth: 0,
                height: '100%',
                minHeight: 220,
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
            }}
        >
            <CardContent
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 180,
                    py: { xs: 1.5, sm: 2 },
                    px: { xs: 1.5, sm: 2 },
                    '&:last-child': { pb: { xs: 1.5, sm: 2 } },
                }}
            >
                <Typography
                    variant="h6"
                    sx={{
                        mb: 1,
                        flexShrink: 0,
                        fontSize: { xs: '0.95rem', sm: '1rem' },
                        wordBreak: 'break-word',
                    }}
                >
                    {title}
                </Typography>
                {chartData.length === 0 ? (
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 100 }}>
                        <Typography color="text.secondary" sx={{ fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}>
                            No data available.
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ flex: 1, minHeight: 160, minWidth: 0 }}>
                        <ResponsiveContainer width="100%" height="100%" minHeight={160}>
                            <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius="65%"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => [value, total > 0 ? `${Math.round((value / total) * 100)}%` : '']}
                                    contentStyle={{ fontSize: '12px' }}
                                />
                                <Legend
                                    wrapperStyle={{ fontSize: '12px' }}
                                    iconSize={10}
                                    layout="horizontal"
                                    verticalAlign="bottom"
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export const BreakdownBar = ({ title, items, total }) => {
    const chartData = items.map((item, i) => ({
        name: item.label,
        value: item.count || 0,
        fill: CHART_COLORS[i % CHART_COLORS.length]
    })).filter(d => d.value > 0);

    return (
        <Card
            variant="outlined"
            sx={{
                width: '100%',
                minWidth: 0,
                height: '100%',
                minHeight: 220,
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
            }}
        >
            <CardContent
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 180,
                    py: { xs: 1.5, sm: 2 },
                    px: { xs: 1.5, sm: 2 },
                    '&:last-child': { pb: { xs: 1.5, sm: 2 } },
                }}
            >
                <Typography
                    variant="h6"
                    sx={{
                        mb: 1,
                        flexShrink: 0,
                        fontSize: { xs: '0.95rem', sm: '1rem' },
                        wordBreak: 'break-word',
                    }}
                >
                    {title}
                </Typography>
                {chartData.length === 0 ? (
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 100 }}>
                        <Typography color="text.secondary" sx={{ fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}>
                            No data available.
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ flex: 1, minHeight: 160, minWidth: 0 }}>
                        <ResponsiveContainer width="100%" height="100%" minHeight={160}>
                            <BarChart
                                data={chartData}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={80}
                                    tick={{ fontSize: 10 }}
                                    interval={0}
                                />
                                <Tooltip
                                    formatter={(value) => [value, total > 0 ? `${Math.round((value / total) * 100)}%` : '']}
                                    contentStyle={{ fontSize: '11px' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export const BreakdownList = ({ title, items, total }) => (
    <Card
        variant="outlined"
        sx={{
            height: '100%',
            width: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
            aspectRatio: { xs: 'auto', sm: '16/10' },
            maxHeight: { sm: '42vh' },
        }}
    >
        <CardContent sx={{ px: { xs: 1.5, sm: 2 }, py: { xs: 1.5, sm: 2 } }}>
            <Typography
                variant="h6"
                sx={{
                    mb: { xs: 1.5, sm: 2 },
                    fontSize: { xs: '0.95rem', sm: '1rem' },
                    wordBreak: 'break-word',
                }}
            >
                {title}
            </Typography>
            <Stack spacing={1.5}>
                {items.length === 0 && (
                    <Typography color="text.secondary" sx={{ fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}>
                        No data available.
                    </Typography>
                )}
                {items.map((item) => {
                    const count = item.count || 0;
                    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                        <Box key={item.label}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography variant="body2" sx={{ fontSize: { xs: '0.8125rem', sm: '0.875rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.label}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8125rem', sm: '0.875rem' }, flexShrink: 0 }}>
                                    {count} ({percent}%)
                                </Typography>
                            </Box>
                            <Box sx={{ height: 6, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                                <Box
                                    sx={{
                                        height: '100%',
                                        width: `${percent}%`,
                                        backgroundColor: '#1a73e8',
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
