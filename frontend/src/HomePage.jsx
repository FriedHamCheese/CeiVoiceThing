import { useState } from "react";
import { Outlet } from "react-router-dom";
import React from "react";
import SideBar from "./components/SideBar";
import TopBar from "./components/TopBar";

import "./styles/main.css";

export default function HomePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className={`viewport ${!isSidebarOpen ? "sidebar-hidden" : ""}`}>
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
