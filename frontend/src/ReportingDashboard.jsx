import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
  Alert
} from '@mui/material';

const API_HOST = import.meta.env.VITE_API_HOST || 'localhost';
const API_PORT = import.meta.env.VITE_API_PORT || '3001';
const API_URL = `http://${API_HOST}:${API_PORT}`;

const formatDateOnly = (date) => date.toISOString().slice(0, 10);

const getDefaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return {
    startDate: formatDateOnly(start),
    endDate: formatDateOnly(end)
  };
};

const MetricCard = ({ label, value }) => (
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

const BreakdownList = ({ title, items, total }) => (
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

export default function ReportingDashboard({ user, mode }) {
  const [adminRange, setAdminRange] = useState(getDefaultRange());
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const isAdmin = mode === 'admin';

  const fetchAdminOverview = async () => {
    const params = new URLSearchParams({
      startDate: adminRange.startDate,
      endDate: adminRange.endDate
    });

    const response = await fetch(`${API_URL}/reports/admin/overview?${params.toString()}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Admin report error:', errorData);
      throw new Error(`Server error (${response.status}): ${errorData}`);
    }

    return response.json();
  };

  const fetchAssigneeOverview = async () => {
    if (!user?.email) {
      throw new Error('Missing user email');
    }

    const params = new URLSearchParams({
      email: user.email,
      days: String(days)
    });

    const response = await fetch(`${API_URL}/reports/assignee/overview?${params.toString()}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Assignee report error:', errorData);
      throw new Error(`Server error (${response.status}): ${errorData}`);
    }

    return response.json();
  };

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const result = isAdmin ? await fetchAdminOverview() : await fetchAssigneeOverview();
        if (isActive) {
          setData(result);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(error.message || 'Failed to load report.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      isActive = false;
    };
  }, [isAdmin, adminRange, days, user?.email]);

  const statusItems = useMemo(() => {
    if (!data?.statusBreakdown) return [];
    return data.statusBreakdown.map((row) => ({
      label: row.status,
      count: row.count
    }));
  }, [data]);

  const categoryItems = useMemo(() => {
    if (!data?.volumeByCategory) return [];
    return data.volumeByCategory.map((row) => ({
      label: row.category,
      count: row.count
    }));
  }, [data]);

  const workloadItems = useMemo(() => {
    if (!data?.workloadByStatus) return [];
    return data.workloadByStatus.map((row) => ({
      label: row.status,
      count: row.count
    }));
  }, [data]);

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
