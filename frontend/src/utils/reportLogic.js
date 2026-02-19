import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

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

export const useReportLogic = (mode) => {
    const { user, API_URL } = useAuth();
    const isAdmin = mode === 'admin';

    const [adminRange, setAdminRange] = useState(getDefaultRange());
    const [days, setDays] = useState(30);
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    const fetchAdminOverview = useCallback(async () => {
        const params = new URLSearchParams({
            startDate: adminRange.startDate,
            endDate: adminRange.endDate
        });

        const response = await fetch(`${API_URL}/admin/reports?${params.toString()}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Server error (${response.status}): ${errorData}`);
        }

        return response.json();
    }, [API_URL, adminRange]);

    const fetchAssigneeOverview = useCallback(async () => {
        if (!user?.email) throw new Error('Missing user email');

        const params = new URLSearchParams({
            email: user.email,
            days: String(days)
        });

        const response = await fetch(`${API_URL}/assignee/reports?${params.toString()}`, {
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
        days, setDays,
        statusItems,
        categoryItems,
        workloadItems,
        isAdmin
    };
};
