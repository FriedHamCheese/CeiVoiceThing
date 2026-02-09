import { useState, useEffect } from "react";
import Login from "./Login.jsx";
import Register from "./Register.jsx"; // Import the new component
import Newticket from "./MyRequestsPage.jsx";
import Dashboard from "./ViewTicketsPage.jsx";
import React from "react";

import "./style.css";

export default function HomePage() {
  const [view, setView] = useState('login');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // Track the logged-in user
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const API_HOST = import.meta.env.VITE_API_HOST || 'localhost';
        const API_PORT = import.meta.env.VITE_API_PORT || '3001';
        const API_URL = `http://${API_HOST}:${API_PORT}`;
  
        const response = await fetch(`${API_URL}/auth/session`, {
          credentials: 'include', // This is crucial to send the session cookie
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
    setView('dashboard'); // Redirect to dashboard upon entry
  };

  const renderPanelContent = () => {
    switch(view) {
      case 'login': 
        return <Login onLogin={handleAuthSuccess} />;
      case 'register': 
        return <Register onRegister={handleAuthSuccess} />;
      case 'newticket': 
        return <Newticket />;
      case 'dashboard': 
        return <Dashboard />;
      default: 
        return user ? <Dashboard /> : <Login onLogin={handleAuthSuccess} />;
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
              <button 
                className={view === 'dashboard' ? 'active' : ''} 
                onClick={() => setView('dashboard')}
              >
                View Ticket (Admin)
              </button>
              <button 
                onClick={() => { setUser(null); setView('login'); }}
                style={{ marginTop: 'auto', color: '#ff6b6b' }}
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
          {user && <span style={{ marginLeft: 'auto', paddingRight: '1rem' }}>Welcome, {user.email}</span>}
        </header>

        <main className="panel">
          {renderPanelContent()}
        </main>
      </div>
    </div>
  );
}