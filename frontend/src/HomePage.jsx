import { useState } from "react";
import { Outlet } from "react-router-dom";
import React from "react";
import SideBar from "./components/SideBar";
import TopBar from "./components/TopBar";

import "./styles/main.css";

export default function HomePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className={`viewport ${!isSidebarOpen ? "sidebar-hidden" : ""}`}>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? "active" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>
      <SideBar toggleSidebar={toggleSidebar} />

      <div className="main-layout">
        <TopBar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

        <main className="panel">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
