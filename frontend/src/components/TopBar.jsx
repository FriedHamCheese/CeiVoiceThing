import React from "react";
import { useAuth } from "../context/AuthContext";
import "../styles/main.css";

export default function TopBar({ isSidebarOpen, toggleSidebar }) {
    const { user, updateUser, API_URL } = useAuth();

    return (
        <header className="top-bar">
            {!isSidebarOpen && (
                <img
                    src="cei.png"
                    alt="logo"
                    onClick={toggleSidebar}
                    className="top-bar-logo-toggle"
                />
            )}
            {user && (
                <div style={{ marginLeft: 'auto', paddingRight: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>Welcome, {user.email}</span>
                    <div className="role-buttons-container">
                        {[
                            { label: 'User', value: 1, color: '#2ed573' },
                            { label: 'Specialist', value: 2, color: '#ffa502' },
                            { label: 'Admin', value: 4, color: '#ff4757' }
                        ].map(role => (
                            <button
                                key={role.value}
                                onClick={async () => {
                                    if (user.perm === role.value) return; // No change needed
                                    try {
                                        const response = await fetch(`${API_URL}/auth/role`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ role: role.value }),
                                            credentials: 'include',
                                        });
                                        if (response.ok) {
                                            const data = await response.json();
                                            if (data.success) {
                                                updateUser(data.user);
                                            }
                                        }
                                    } catch (error) {
                                        console.error("Failed to update role:", error);
                                    }
                                }}
                                className="role-btn"
                                style={{
                                    backgroundColor: user.perm === role.value ? role.color : '#ccc',
                                    opacity: user.perm === role.value ? 1 : 0.7
                                }}
                            >
                                {role.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </header>
    );
}
