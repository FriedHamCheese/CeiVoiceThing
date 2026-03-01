
import React, { createContext, useState, useEffect, useContext, useMemo, useRef } from 'react';

const AuthContext = createContext(null);

// Construct API URL
const API_HOST = import.meta.env.VITE_API_HOST || 'localhost';
const API_PORT = import.meta.env.VITE_API_PORT || '5001';
const API_URL = (import.meta.env.VITE_USE_HTTPS_BACKEND === 'true') ?
    `https://${API_HOST}:${API_PORT}` : `http://${API_HOST}:${API_PORT}`;

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const hasCheckedSession = useRef(false);

    useEffect(() => {
        if (hasCheckedSession.current) return;
        hasCheckedSession.current = true;
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            const response = await fetch(`${API_URL}/auth/session`, {
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setUser(data.user);
                }
            }
        } catch (error) {
            console.error("Session check failed:", error);
        } finally {
            setLoading(false);
        }
    };

    const login = (userData) => {
        setUser(userData);
    };

    const logout = async () => {
        try {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'GET',
                credentials: 'include'
            }); // Or POST if changed
            setUser(null);
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const updateUser = (userData) => {
        setUser(userData);
    };

    const authValue = useMemo(() => ({
        user, loading, login, logout, updateUser, API_URL
    }), [user, loading, API_URL]);

    return (
        <AuthContext.Provider value={authValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
