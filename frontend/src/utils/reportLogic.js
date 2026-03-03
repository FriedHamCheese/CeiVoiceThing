import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const formatDateOnly = (date) => date.toISOString().slice(0, 10);

const getDefaultRange = (days = 30) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    return {
        startDate: formatDateOnly(start),
        endDate: formatDateOnly(end)
    };
};

export const useReportLogic = (mode) => {
    const { user, API_URL } = useAuth();
    const isAdmin = mode === 'admin';

    const [presetRange, setPresetRange] = useState('30'); // '7', '30', '90', 'all', 'custom'
    const [adminRange, setAdminRange] = useState(getDefaultRange(30));

    // Filters
    const [filterType, setFilterType] = useState('all'); // 'all', 'category', 'status'
    const [filterValue, setFilterValue] = useState('');

    const [days, setDays] = useState(30);
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    // Update adminRange when presetRange changes
    useEffect(() => {
        if (presetRange !== 'custom' && presetRange !== 'all') {
            setAdminRange(getDefaultRange(parseInt(presetRange, 10)));
        } else if (presetRange === 'all') {
            const end = new Date();
            const start = new Date(2000, 0, 1); // some old date
            setAdminRange({
                startDate: formatDateOnly(start),
                endDate: formatDateOnly(end)
            });
        }
    }, [presetRange]);

    const fetchAdminOverview = useCallback(async () => {
        const params = new URLSearchParams({
            startDate: adminRange.startDate,
            endDate: adminRange.endDate
        });

        if (filterType === 'category' && filterValue) {
            params.append('category', filterValue);
        } else if (filterType === 'status' && filterValue) {
            params.append('status', filterValue);
        }

        const response = await fetch(`${API_URL}/api/admin/reports?${params.toString()}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Server error (${response.status}): ${errorData}`);
        }

        return response.json();
    }, [API_URL, adminRange, filterType, filterValue]);

    const fetchAssigneeOverview = useCallback(async () => {
        if (!user?.email) throw new Error('Missing user email');

        const params = new URLSearchParams({
            email: user.email,
            days: String(days)
        });

        const response = await fetch(`${API_URL}/api/assignee/reports?${params.toString()}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Server error (${response.status}): ${errorData}`);
        }

        return response.json();
    }, [API_URL, user, days]);

    useEffect(() => {
        let isActive = true;
        const load = async () => {
            setIsLoading(true);
            setErrorMessage('');
            try {
                const result = isAdmin ? await fetchAdminOverview() : await fetchAssigneeOverview();
                if (isActive) setData(result);
            } catch (error) {
                if (isActive) setErrorMessage(error.message || 'Failed to load report.');
            } finally {
                if (isActive) setIsLoading(false);
            }
        };

        if (user) load();
        return () => { isActive = false; };
    }, [isAdmin, fetchAdminOverview, fetchAssigneeOverview, user]);

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

    return {
        data,
        isLoading,
        errorMessage,
        adminRange, setAdminRange,
        presetRange, setPresetRange,
        filterType, setFilterType,
        filterValue, setFilterValue,
        days, setDays,
        statusItems,
        categoryItems,
        workloadItems,
        isAdmin
    };
};
