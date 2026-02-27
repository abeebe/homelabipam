import { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'nav-item active' : 'nav-item'

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">IP</div>
          Homelab IPAM
        </div>
        <nav className="sidebar-nav">
          <span className="sidebar-section">Overview</span>
          <NavLink to="/" end className={navClass}>
            <span className="nav-icon">◈</span>
            Dashboard
          </NavLink>

          <span className="sidebar-section">Management</span>
          <NavLink to="/networks" className={navClass}>
            <span className="nav-icon">⬡</span>
            Networks
          </NavLink>
          <NavLink to="/ips" className={navClass}>
            <span className="nav-icon">◉</span>
            IP Addresses
          </NavLink>
          <NavLink to="/devices" className={navClass}>
            <span className="nav-icon">▣</span>
            Devices
          </NavLink>

          <span className="sidebar-section">System</span>
          <NavLink to="/auditlog" className={navClass}>
            <span className="nav-icon">📋</span>
            Audit Log
          </NavLink>

          <div className="sidebar-spacer" />
          <NavLink to="/settings" className={navClass}>
            <span className="nav-icon">⚙</span>
            Settings
          </NavLink>
        </nav>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  )
}
