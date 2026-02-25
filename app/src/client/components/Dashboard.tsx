import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { networksAPI, ipAddressesAPI, APIError } from '../api'
import { Network, IPAddress } from '../types'
import Card from './Card'

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

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="summary-grid">
          <Card title="Networks" value={networks.length} subtitle="Total networks">
            <Link to="/networks" className="link-button">Manage</Link>
          </Card>
          <Card title="Total IP Addresses" value={ipAddresses.length} subtitle="Across all networks" />
          <Card title="Available IPs" value={availableIPs} subtitle="Ready to assign" />
          <Card title="In Use" value={usedIPs} subtitle="Currently assigned" />
        </div>
      )}
    </div>
  )
}
