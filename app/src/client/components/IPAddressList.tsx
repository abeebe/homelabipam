import { useEffect, useState } from 'react'
import { ipAddressesAPI, APIError, networksAPI } from '../api'
import { IPAddress, Network } from '../types'
import CreateIPAddressForm from './CreateIPAddressForm'

export default function IPAddressList() {
  const [ipAddresses, setIpAddresses] = useState<IPAddress[]>([])
  const [allNetworks, setAllNetworks] = useState<Network[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterNetwork, setFilterNetwork] = useState<string>('')
  const [showForm, setShowForm] = useState(false)

  async function loadIPAddresses() {
    try {
      setLoading(true)
      setError(null)
      const [ips, networks] = await Promise.all([
        ipAddressesAPI.getAll(),
        networksAPI.getAll()
      ])
      setIpAddresses(ips)
      setAllNetworks(networks)
    } catch (err) {
      if (err instanceof APIError) {
        setError(`Error: ${err.message}`)
      } else {
        setError('Failed to load IP addresses')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleIPCreated = () => {
    setShowForm(false)
    loadIPAddresses()
  }

  useEffect(() => {
    loadIPAddresses()
  }, [])

  const filteredIPs = filterNetwork
    ? ipAddresses.filter(ip => ip.network.id === filterNetwork)
    : ipAddresses

  const statusColor = (status: string) => {
    switch (status) {
      case 'IN_USE':
        return 'status-in-use'
      case 'RESERVED':
        return 'status-reserved'
      default:
        return 'status-available'
    }
  }

  const networks = Array.from(
    new Map(ipAddresses.map(ip => [ip.network.id, ip.network])).values()
  )

  return (
    <div className="ipaddresses-page">
      <div className="page-header">
        <h2>IP Addresses</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ New IP Address'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && <CreateIPAddressForm networks={allNetworks} onSuccess={handleIPCreated} />}

      {!loading && (
        <div className="filters">
          <label htmlFor="filter-network">Filter by Network:</label>
          <select
            id="filter-network"
            value={filterNetwork}
            onChange={(e) => setFilterNetwork(e.target.value)}
          >
            <option value="">All Networks</option>
            {networks.map(net => (
              <option key={net.id} value={net.id}>
                {net.name} ({net.cidr})
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <p>Loading IP addresses...</p>
      ) : filteredIPs.length === 0 ? (
        <p className="empty-state">No IP addresses found.</p>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>IP Address</th>
                <th>Network</th>
                <th>Status</th>
                <th>Device</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {filteredIPs.map(ip => (
                <tr key={ip.id}>
                  <td><code>{ip.address}</code></td>
                  <td>
                    <span className="badge">{ip.network.name}</span>
                  </td>
                  <td>
                    <span className={`status ${statusColor(ip.status)}`}>
                      {ip.status}
                    </span>
                  </td>
                  <td>
                    {ip.device ? (
                      <>
                        <strong>{ip.device.name}</strong>
                        {ip.device.hostname && <br />}
                        {ip.device.hostname && <small>{ip.device.hostname}</small>}
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{ip.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
