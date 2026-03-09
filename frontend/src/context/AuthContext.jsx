import React, { createContext, useState, useEffect, useContext, useMemo, useRef } from 'react';
import { API_URL } from '../config';

const AuthContext = createContext(null);

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
            const response = await fetch(`${API_URL}/api/auth/session`, {
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
            await fetch(`${API_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            }); // Or POST if changed
            setUser(null);
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
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
