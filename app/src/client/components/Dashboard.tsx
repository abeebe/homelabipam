import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { networksAPI, ipAddressesAPI, APIError } from '../api'
import { Network, IPAddress } from '../types'

export default function Dashboard() {
  const [networks, setNetworks] = useState<Network[]>([])
  const [ipAddresses, setIpAddresses] = useState<IPAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        const [nets, ips] = await Promise.all([
          networksAPI.getAll(),
          ipAddressesAPI.getAll()
        ])
        setNetworks(nets)
        setIpAddresses(ips)
      } catch (err) {
        if (err instanceof APIError) {
          setError(`Error: ${err.message}`)
        } else {
          setError('Failed to load data')
        }
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const availableIPs = ipAddresses.filter(ip => ip.status === 'AVAILABLE').length
  const usedIPs = ipAddresses.filter(ip => ip.status === 'IN_USE').length
  const reservedIPs = ipAddresses.filter(ip => ip.status === 'RESERVED').length

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : (
        <div className="stat-grid">
          <Link to="/networks" className="stat-card">
            <div className="stat-label">Networks</div>
            <div className="stat-value">{networks.length}</div>
            <div className="stat-sub">Configured subnets</div>
          </Link>
          <Link to="/ips" className="stat-card">
            <div className="stat-label">Total IPs</div>
            <div className="stat-value">{ipAddresses.length}</div>
            <div className="stat-sub">Across all networks</div>
          </Link>
          <Link to="/ips" className="stat-card">
            <div className="stat-label">In Use</div>
            <div className="stat-value">{usedIPs}</div>
            <div className="stat-sub">Currently assigned</div>
          </Link>
          <Link to="/ips" className="stat-card">
            <div className="stat-label">Available</div>
            <div className="stat-value">{availableIPs}</div>
            <div className="stat-sub">Ready to assign</div>
          </Link>
          {reservedIPs > 0 && (
            <Link to="/ips" className="stat-card">
              <div className="stat-label">Reserved</div>
              <div className="stat-value">{reservedIPs}</div>
              <div className="stat-sub">Held for future use</div>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
