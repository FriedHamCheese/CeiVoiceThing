import React from 'react';
import {
  Box, CircularProgress, Divider, Grid, Stack, TextField, Typography, Alert
} from '@mui/material';
import { useReportLogic } from './utils/reportLogic';
import { MetricCard, BreakdownList } from './components/ReportComponents';

export default function ReportingDashboard({ mode }) {
  const {
    data,
    isLoading,
    errorMessage,
    adminRange, setAdminRange,
    days, setDays,
    statusItems,
    categoryItems,
    workloadItems,
    isAdmin
  } = useReportLogic(mode);

  const totalForStatus = statusItems.reduce((sum, item) => sum + item.count, 0);
  const totalForCategory = categoryItems.reduce((sum, item) => sum + item.count, 0);
  const totalForWorkload = workloadItems.reduce((sum, item) => sum + item.count, 0);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ mb: 1 }}>
          {isAdmin ? 'Admin Reporting Dashboard' : 'My Reporting Dashboard'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isAdmin
            ? 'Monitor ticket volume, resolution time, and current backlog.'
            : 'Track your workload and recent resolution activity.'}
        </Typography>
      </Box>

      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

      {isAdmin ? (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Start date"
              type="date"
              value={adminRange.startDate}
              onChange={(event) => setAdminRange((prev) => ({ ...prev, startDate: event.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="End date"
              type="date"
              value={adminRange.endDate}
              onChange={(event) => setAdminRange((prev) => ({ ...prev, endDate: event.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      ) : (
        <TextField
          label="Lookback (days)"
          type="number"
          value={days}
          onChange={(event) => setDays(Number(event.target.value) || 1)}
          inputProps={{ min: 1, max: 365 }}
        />
      )}

      <Divider />

      {data && isAdmin && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <MetricCard label="Total tickets" value={data.totals.totalTickets} />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard label="Solved tickets" value={data.totals.solvedCount} />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard label="Avg resolution (hrs)" value={Number(data.totals.avgResolutionHours).toFixed(1)} />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard label="Current backlog" value={data.totals.backlogCount} />
          </Grid>
          <Grid item xs={12} md={6}>
            <BreakdownList title="Status breakdown" items={statusItems} total={totalForStatus} />
          </Grid>
          <Grid item xs={12} md={6}>
            <BreakdownList title="Category breakdown" items={categoryItems} total={totalForCategory} />
          </Grid>
        </Grid>
      )}

      {data && !isAdmin && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <MetricCard label="Current workload" value={data.totals.currentWorkload} />
          </Grid>
          <Grid item xs={12} md={4}>
            <MetricCard label={`Solved (last ${days} days)`} value={data.totals.solvedCount} />
          </Grid>
          <Grid item xs={12} md={4}>
            <MetricCard label={`Failed (last ${days} days)`} value={data.totals.failedCount} />
          </Grid>
          <Grid item xs={12} md={6}>
            <BreakdownList title="Workload by status" items={workloadItems} total={totalForWorkload} />
          </Grid>
        </Grid>
      )}
    </Stack>
  );
}
