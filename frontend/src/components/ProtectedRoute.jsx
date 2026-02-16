
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ minRole = 1 }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div>Loading...</div>; // Replace with a proper loading spinner if available
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.perm < minRole) {
        return <Navigate to="/unauthorized" replace />; // or a dedicated /unauthorized page
    }

    return <Outlet />;
};

export default ProtectedRoute;
