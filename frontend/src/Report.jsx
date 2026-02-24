import React from 'react';
import {
  Box,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useReportLogic } from './utils/reportLogic';
import { MetricCard, BreakdownList, BreakdownPie } from './components/ReportComponents';

const SPACING = { xs: 1.5, sm: 2 };
const PADDING = { xs: 1.5, sm: 2, md: 3 };

export default function ReportingDashboard({ mode }) {
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
  const isLgUp = useMediaQuery(theme.breakpoints.up('lg'));

  const {
    data,
    isLoading,
    errorMessage,
    adminRange,
    setAdminRange,
    days,
    setDays,
    statusItems,
    categoryItems,
    workloadItems,
    isAdmin,
  } = useReportLogic(mode);

  const totalForStatus = statusItems.reduce((sum, item) => sum + item.count, 0);
  const totalForCategory = categoryItems.reduce((sum, item) => sum + item.count, 0);
  const totalForWorkload = workloadItems.reduce((sum, item) => sum + item.count, 0);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 200,
          width: '100%',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        px: PADDING,
        py: PADDING,
        pb: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
      }}
    >
      {/* ─── Header ─── */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="h4"
          component="h1"
          fontWeight="bold"
          sx={{
            fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem', lg: '2rem' },
            lineHeight: 1.3,
            mb: 0.5,
            wordBreak: 'break-word',
          }}
        >
          {isAdmin ? 'Admin Reporting Dashboard' : 'My Reporting Dashboard'}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}
        >
          {isAdmin
            ? 'Monitor ticket volume, resolution time, and current backlog.'
            : 'Track your workload and recent resolution activity.'}
        </Typography>
      </Box>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      {/* ─── Filters ─── */}
      <Stack spacing={SPACING} sx={{ width: '100%', minWidth: 0, mb: 2 }}>
        {isAdmin ? (
          <Grid container spacing={SPACING} sx={{ width: '100%', margin: 0 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size={isSmUp ? 'medium' : 'small'}
                label="Start date"
                type="date"
                value={adminRange.startDate}
                onChange={(e) =>
                  setAdminRange((prev) => ({ ...prev, startDate: e.target.value }))
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size={isSmUp ? 'medium' : 'small'}
                label="End date"
                type="date"
                value={adminRange.endDate}
                onChange={(e) =>
                  setAdminRange((prev) => ({ ...prev, endDate: e.target.value }))
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        ) : (
          <TextField
            fullWidth
            size={isSmUp ? 'medium' : 'small'}
            label="Lookback (days)"
            type="number"
            value={days}
            onChange={(e) => setDays(Number(e.target.value) || 1)}
            inputProps={{ min: 1, max: 365 }}
            sx={{ maxWidth: { xs: '100%', sm: 200 } }}
          />
        )}
        <Divider />
      </Stack>

      {/* ─── Admin: KPI cards (CSS Grid so they fill the row evenly) ─── */}
      {data && isAdmin && (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)',
              },
              gap: SPACING,
              width: '100%',
              minWidth: 0,
              mb: 2,
            }}
          >
            <MetricCard label="Total tickets" value={data.totals.totalTickets} />
            <MetricCard label="Solved tickets" value={data.totals.solvedCount} />
            <MetricCard
              label="Avg resolution (hrs)"
              value={Number(data.totals.avgResolutionHours).toFixed(1)}
            />
            <MetricCard label="Current backlog" value={data.totals.backlogCount} />
          </Box>

          {/* ─── Admin: Pie charts (fill width; side-by-side on lg) ─── */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
              gap: SPACING,
              width: '100%',
              minWidth: 0,
              alignItems: 'stretch',
            }}
          >
            <Box sx={{ minWidth: 0, minHeight: isLgUp ? 320 : 260 }}>
              <BreakdownPie
                title="Status breakdown"
                items={statusItems}
                total={totalForStatus}
              />
            </Box>
            <Box sx={{ minWidth: 0, minHeight: isLgUp ? 320 : 260 }}>
              <BreakdownPie
                title="Category breakdown"
                items={categoryItems}
                total={totalForCategory}
              />
            </Box>
          </Box>
        </>
      )}

      {/* ─── Assignee: workload cards + list (grid fills width) ─── */}
      {data && !isAdmin && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: SPACING,
            width: '100%',
            minWidth: 0,
            '& > :nth-of-type(4)': {
              gridColumn: { xs: '1', md: '1 / -1' },
            },
          }}
        >
          <MetricCard
            label="Current workload"
            value={data.totals.currentWorkload}
          />
          <MetricCard
            label={`Solved (last ${days} days)`}
            value={data.totals.solvedCount}
          />
          <MetricCard
            label={`Failed (last ${days} days)`}
            value={data.totals.failedCount}
          />
          <BreakdownList
            title="Workload by status"
            items={workloadItems}
            total={totalForWorkload}
          />
        </Box>
      )}
    </Box>
  );
}
