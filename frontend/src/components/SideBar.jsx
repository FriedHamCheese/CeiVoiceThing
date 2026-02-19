import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/main.css";

export default function SideBar({ toggleSidebar }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path) => location.pathname === path ? 'active' : '';

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <img
                    src="cei.png"
                    alt="logo"
                    onClick={toggleSidebar}
                    style={{ cursor: 'pointer' }}
                />
                <div>
                    <h1>CEiVoice</h1>
                    <h2>AI Request & Ticket System</h2>
                </div>
            </div>

            <nav className="sidebar-nav">
                {/* --- AUTH BUTTONS: Only show if NOT logged in --- */}
                {!user && (
                    <>
                        <button
                            className={isActive('/login')}
                            onClick={() => navigate('/login')}
                        >
                            Login
                        </button>
                        <button
                            className={isActive('/register')}
                            onClick={() => navigate('/register')}
                        >
                            Register
                        </button>
                        <button
                            className={isActive('/track-request')}
                            onClick={() => navigate('/track-request')}
                        >
                            Track Request
                        </button>
                    </>
                )}

                {/* --- PROTECTED BUTTONS: Only show if logged in --- */}
                {user && (
                    <>
                        <button
                            className={isActive('/')}
                            onClick={() => navigate('/')}
                        >
                            Create new ticket
                        </button>
                        {user.perm === 4 && (
                            <button
                                className={isActive('/admin/dashboard')}
                                onClick={() => navigate('/admin/dashboard')}
                            >
                                Admin Dashboard
                            </button>
                        )}
                        {user.perm === 2 && (
                            <button
                                className={isActive('/dashboard')}
                                onClick={() => navigate('/dashboard')}
                            >
                                Assignee Dashboard
                            </button>
                        )}
                        {user.perm === 2 && (
                            <button
                                className={isActive('/reports')}
                                onClick={() => navigate('/reports')}
                            >
                                Assignee Reports
                            </button>
                        )}
                        {user.perm === 4 && (
                            <button
                                className={isActive('/admin/reports')}
                                onClick={() => navigate('/admin/reports')}
                            >
                                Admin Reports
                            </button>
                        )}
                        <button
                            className={isActive('/track-request')}
                            onClick={() => navigate('/track-request')}
                        >
                            Track Request
                        </button>
                        <button
                            onClick={async () => {
                                await logout();
                                window.location.href = '/login';
                            }}
                            style={{ marginTop: 'auto', color: '#ff6b6b' }}
                        >
                            Logout
                        </button>
                    </>
                )}
            </nav>
        </aside>
    );
}
