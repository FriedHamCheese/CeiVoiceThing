import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const useUserManagement = () => {
    const { API_URL } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_URL}/admin/users`, {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            const data = await response.json();
            if (response.ok) {
                setUsers(data.users);
            } else {
                setError(data.message || 'Failed to fetch users');
            }
        } catch (err) {
            setError('Network error: Could not connect to the server.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [API_URL]);

    const updateUserRole = async (email, newPerm) => {
        setError('');
        try {
            const response = await fetch(`${API_URL}/admin/users/${email}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ perm: newPerm }),
            });
            const data = await response.json();
            if (response.ok) {
                // Optimistically update the UI
                setUsers(prevUsers =>
                    prevUsers.map(user =>
                        user.email === email ? { ...user, perm: newPerm } : user
                    )
                );
                return { success: true };
            } else {
                setError(data.message || 'Failed to update role');
                return { success: false, message: data.message };
            }
        } catch (err) {
            setError('Network error: Could not connect to the server.');
            console.error(err);
            return { success: false, message: 'Network error' };
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    return {
        users,
        loading,
        error,
        fetchUsers,
        updateUserRole
    };
};
