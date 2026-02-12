import { useState, useEffect } from "react";
import Login from "./Login.jsx";
import Register from "./Register.jsx"; // Import the new component
import Newticket from "./NewTicket.jsx";
import Dashboard from "./ViewTicketsPage.jsx";
import MergeWindow from "./ViewTicketsPage_MergeWindow.jsx";
import TrackTicket from "./TrackTicket.jsx";
import React from "react";

import "./style.css";

// Construct API URL
const API_HOST = import.meta.env.VITE_API_HOST || 'localhost';
const API_PORT = import.meta.env.VITE_API_PORT || '3001';
const API_URL = `http://${API_HOST}:${API_PORT}`;

export default function HomePage() {
  const [view, setView] = useState('login');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // Track the logged-in user
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/session`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Use the existing handler to set user and view
            handleAuthSuccess(data.user);
          }
        }
      } catch (error) {
        console.error("Session check failed:", error);
      }
    };

    checkSession();
  }, []); // The empty array ensures this runs only once on component mount

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Handle successful login or registration
  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setView('newticket');
  };


  const renderPanelContent = () => {
    switch (view) {
      case 'login':
        return <Login onLogin={handleAuthSuccess} />;
      case 'register':
        return <Register onRegister={handleAuthSuccess} />;
      case 'newticket':
        return <Newticket user={user} />;
      case 'dashboard':
        return <Dashboard user={user} />;
      case 'track':
        return <TrackTicket user={user} />;
      default:
        return user ? <Dashboard user={user} /> : <Login onLogin={handleAuthSuccess} />;
    }
  };

  return (
    <div className={`viewport ${!isSidebarOpen ? "sidebar-hidden" : ""}`}>

      <aside className="sidebar">
        <div className="sidebar-brand">
          <img
            src="cei.png"
            alt="logo"
            onClick={toggleSidebar}
            className="cursor-pointer"
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
                className={view === 'login' ? 'active' : ''}
                onClick={() => setView('login')}
              >
                Login
              </button>
              <button
                className={view === 'register' ? 'active' : ''}
                onClick={() => setView('register')}
              >
                Register
              </button>
              <button
                className={view === 'track' ? 'active' : ''}
                onClick={() => setView('track')}
              >
                Track Request
              </button>
            </>
          )}

          {/* --- PROTECTED BUTTONS: Only show if logged in --- */}
          {user && (
            <>
              <button
                className={view === 'newticket' ? 'active' : ''}
                onClick={() => setView('newticket')}
              >
                Create new ticket
              </button>
              {user.perm >= 2 && (
                <button
                  className={view === 'dashboard' ? 'active' : ''}
                  onClick={() => setView('dashboard')}
                >
                  Tickets Dashboard
                </button>
              )}
              <button
                className={view === 'track' ? 'active' : ''}
                onClick={() => setView('track')}
              >
                Track Request
              </button>
              <button
                onClick={() => { setUser(null); setView('login'); }}
                className="logout-btn"
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </aside>

      <div className="main-layout">
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
            <div className="user-welcome-container">
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
                            setUser(data.user);
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

        <main className="panel">
          {renderPanelContent()}
        </main>
      </div>
    </div>
  );
}