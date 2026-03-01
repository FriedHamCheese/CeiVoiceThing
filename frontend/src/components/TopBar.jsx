import React from "react";
import { useAuth } from "../context/AuthContext";
import "../styles/main.css";
import logo from "../assets/cei.png";

export default function TopBar({ isSidebarOpen, toggleSidebar }) {
    const { user, updateUser, API_URL } = useAuth();

    return (
        <>
            <header className="top-bar">
                <button
                    type="button"
                    className="top-bar-burger"
                    onClick={toggleSidebar}
                    aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
                >
                    <span className="top-bar-burger-line" />
                    <span className="top-bar-burger-line" />
                    <span className="top-bar-burger-line" />
                </button>
                <div className="top-bar-logo-wrap">
                    <img src={logo} alt="" className="top-bar-logo" />
                    <div className="top-bar-brand-text">
                        <span className="top-bar-brand-title">CEiVoice</span>
                        <span className="top-bar-brand-tagline">AI Request & Ticket System</span>
                    </div>
                </div>
                {user && (
                    <div className="user-welcome-container">
                        <div className="role-buttons-container">
                        {[
                            { label: 'User', value: 1, color: '#2ed573' },
                            { label: 'Assignee', value: 2, color: '#ffa502' },
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
            {user && (
                <div className="user-welcome-floating-label" aria-label={`Welcome, ${user.email}`}>
                    Welcome, {user.email}
                </div>
            )}
        </>
    );
}