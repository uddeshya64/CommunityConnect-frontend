"use client";

import { useState } from "react";
import Sidebar from "@/app/home/SideBar";
import Navbar from "@/components/layout/Navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <Navbar
          collapsed={collapsed}
          onToggleMobile={() => setMobileOpen(true)}
        />
        {children}
      </div>
    </div>
  );
}
