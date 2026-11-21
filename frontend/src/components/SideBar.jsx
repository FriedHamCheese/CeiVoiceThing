import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SearchIcon from "@mui/icons-material/Search";
import LoginIcon from "@mui/icons-material/Login";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PostAddIcon from "@mui/icons-material/PostAdd";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PeopleIcon from "@mui/icons-material/People";
import LogoutIcon from "@mui/icons-material/Logout";
import "../styles/main.css";

export default function SideBar({ toggleSidebar }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path) => location.pathname === path ? 'active' : '';

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <button
                    type="button"
                    className="top-bar-burger sidebar-burger"
                    onClick={toggleSidebar}
                    aria-label="Close menu"
                >
                    <span className="top-bar-burger-line" />
                    <span className="top-bar-burger-line" />
                    <span className="top-bar-burger-line" />
                </button>
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
                            className={isActive('/request')}
                            onClick={() => navigate('/request')}
                        >
                            <span className="sidebar-btn-content">
                                <PostAddIcon sx={{ fontSize: 20 }} />
                                Submit Request
                            </span>
                        </button>
                        <button
                            className={isActive('/track-request')}
                            onClick={() => navigate('/track-request')}
                        >
                            <span className="sidebar-btn-content">
                                <SearchIcon sx={{ fontSize: 20 }} />
                                Track Request
                            </span>
                        </button>
                        <button
                            className={isActive('/login')}
                            onClick={() => navigate('/login')}
                        >
                            <span className="sidebar-btn-content">
                                <LoginIcon sx={{ fontSize: 20 }} />
                                Login
                            </span>
                        </button>
                        <button
                            className={isActive('/register')}
                            onClick={() => navigate('/register')}
                        >
                            <span className="sidebar-btn-content">
                                <PersonAddIcon sx={{ fontSize: 20 }} />
                                Register
                            </span>
                        </button>
                    </>
                )}

                {/* --- PROTECTED BUTTONS: Only show if logged in --- */}
                {user && (
                    <>
                        <button
                            className={isActive('/track-request')}
                            onClick={() => navigate('/track-request')}
                        >
                            <span className="sidebar-btn-content">
                                <SearchIcon sx={{ fontSize: 20 }} />
                                Track Request
                            </span>
                        </button>
                        <button
                            className={isActive('/request-authed')}
                            onClick={() => navigate('/request-authed')}
                        >
                            <span className="sidebar-btn-content">
                                <PostAddIcon sx={{ fontSize: 20 }} />
                                Submit Request
                            </span>
                        </button>
                        {user.perm === 4 && (
                            <button
                                className={isActive('/admin/dashboard')}
                                onClick={() => navigate('/admin/dashboard')}
                            >
                                <span className="sidebar-btn-content">
                                    <DashboardIcon sx={{ fontSize: 20 }} />
                                    Admin Dashboard
                                </span>
                            </button>
                        )}
                        {user.perm === 2 && (
                            <button
                                className={isActive('/dashboard')}
                                onClick={() => navigate('/dashboard')}
                            >
                                <span className="sidebar-btn-content">
                                    <DashboardIcon sx={{ fontSize: 20 }} />
                                    Assignee Dashboard
                                </span>
                            </button>
                        )}
                        {user.perm === 2 && (
                            <button
                                className={isActive('/reports')}
                                onClick={() => navigate('/reports')}
                            >
                                <span className="sidebar-btn-content">
                                    <AssessmentIcon sx={{ fontSize: 20 }} />
                                    Assignee Reports
                                </span>
                            </button>
                        )}
                        {user.perm === 4 && (
                            <button
                                className={isActive('/admin/reports')}
                                onClick={() => navigate('/admin/reports')}
                            >
                                <span className="sidebar-btn-content">
                                    <AssessmentIcon sx={{ fontSize: 20 }} />
                                    Admin Reports
                                </span>
                            </button>
                        )}
                        {user.perm === 4 && (
                            <button
                                className={isActive('/admin/users')}
                                onClick={() => navigate('/admin/users')}
                            >
                                <span className="sidebar-btn-content">
                                    <PeopleIcon sx={{ fontSize: 20 }} />
                                    User Management
                                </span>
                            </button>
                        )}
                        <button
                            className="logout-btn"
                            onClick={async () => {
                                await logout();
                                window.location.href = '/login';
                            }}
                        >
                            <span className="sidebar-btn-content">
                                <LogoutIcon sx={{ fontSize: 20 }} />
                                Logout
                            </span>
                        </button>
                    </>
                )}
            </nav>
        </aside>
    );
}
