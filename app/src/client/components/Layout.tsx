import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <h1><Link to="/">🏠 Homelab IPAM</Link></h1>
          <nav className="nav">
            <Link to="/">Dashboard</Link>
            <Link to="/networks">Networks</Link>
            <Link to="/ips">IP Addresses</Link>
            <Link to="/devices">Devices</Link>
          </nav>
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  )
}
