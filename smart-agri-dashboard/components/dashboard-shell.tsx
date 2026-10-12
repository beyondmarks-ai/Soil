"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "./icons";

const navigation = [
  { href: "/", label: "Overview", icon: "overview" },
  { href: "/sensors", label: "Live sensors", icon: "sensors" },
  { href: "/irrigation", label: "Irrigation", icon: "irrigation" },
  { href: "/blockchain", label: "Blockchain", icon: "blockchain" },
  { href: "/devices", label: "Devices", icon: "devices" },
  { href: "/alerts", label: "Alerts", icon: "alerts" },
  { href: "/reports", label: "Reports", icon: "reports" },
];

export function DashboardShell({ children, title, subtitle, hardwareConnected = false, hardwarePort = "COM3" }: { children: React.ReactNode; title: string; subtitle: string; hardwareConnected?: boolean; hardwarePort?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      {open && <button className="scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark"><Icon name="leaf" size={23} /></span>
          <span><strong>TerraLedger</strong><small>Smart agriculture</small></span>
          <button className="icon-button sidebar-close" onClick={() => setOpen(false)}><Icon name="close" /></button>
        </div>

        <div className="farm-switcher">
          <span className="farm-avatar">GF</span>
          <span><small>Active farm</small><strong>Greenfield Farm</strong></span>
          <Icon name="arrow" size={16} />
        </div>

        <nav className="main-nav">
          <span className="nav-label">Workspace</span>
          {navigation.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={active ? "nav-item active" : "nav-item"} onClick={() => setOpen(false)}><Icon name={item.icon} /><span>{item.label}</span></Link>;
          })}
          <span className="nav-label secondary-label">System</span>
          <Link href="/settings" className={pathname === "/settings" ? "nav-item active" : "nav-item"} onClick={() => setOpen(false)}><Icon name="settings" /><span>Settings</span></Link>
        </nav>

        <div className="sidebar-footer">
          <div className="network-status"><span className={hardwareConnected ? "pulse-dot connected-dot" : "pulse-dot"} /><span><strong>Arduino gateway</strong><small>{hardwareConnected ? `Connected on ${hardwarePort}` : "Awaiting serial connection"}</small></span></div>
          <div className="profile"><span className="profile-avatar">AP</span><span><strong>Project team</strong><small>Administrator</small></span><Icon name="arrow" size={16} /></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setOpen(true)}><Icon name="menu" /></button>
          <div className="page-heading"><h1>{title}</h1><p>{subtitle}</p></div>
          <div className="top-actions">
            <label className="search-box"><Icon name="search" size={18} /><input aria-label="Search dashboard" placeholder="Search" /></label>
            <span className={hardwareConnected ? "demo-badge live-data-badge" : "demo-badge"}>{hardwareConnected ? "Live data" : "Hardware offline"}</span>
            <button className="icon-button notification" aria-label="Notifications"><Icon name="alerts" /><span /></button>
          </div>
        </header>
        <div className="content-wrap">{children}</div>
      </main>
    </div>
  );
}
