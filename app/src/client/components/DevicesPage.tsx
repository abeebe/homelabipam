import { useEffect, useState } from 'react'
import { unifiAPI, APIError } from '../api'
import { Device } from '../types'

interface UnifiStatus {
  connected: boolean
  url: string
  siteCount?: number
  error?: string
}

interface SyncResult {
  sites: number
  networks: { created: number; updated: number }
  ipAddresses: { created: number; updated: number }
  devices: { synced: number }
  errors: string[]
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [status, setStatus] = useState<UnifiStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<SyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    try {
      setLoading(true)
      setError(null)
      const [devs, stat] = await Promise.all([
        unifiAPI.getDevices(),
        unifiAPI.getStatus(),
      ])
      setDevices(devs)
      setStatus(stat)
    } catch (err) {
      if (err instanceof APIError) {
        setError(`Error: ${err.message}`)
      } else {
        setError('Failed to load devices')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setError(null)
    try {
      const result = await unifiAPI.sync()
      setLastSync(result)
      await loadData()
    } catch (err) {
      if (err instanceof APIError) {
        setError(`Sync failed: ${err.message}`)
      } else {
        setError('Sync failed')
      }
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function formatLastSeen(lastSeen: string | null): string {
    if (!lastSeen) return '-'
    const date = new Date(lastSeen)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }

  return (
    <div className="devices-page">
      <div className="page-header">
        <h2>Devices</h2>
        <button
          className="btn btn-primary"
          onClick={handleSync}
          disabled={syncing || (status !== null && !status.connected)}
        >
          {syncing ? 'Syncing...' : '↻ Sync from UniFi'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="status-card">
        <strong>UniFi Controller</strong>
        {status === null ? (
          <span className="status status-available">Checking...</span>
        ) : status.connected ? (
          <>
            <span className="status status-in-use">Connected</span>
            <span className="text-muted"> — {status.url}</span>
            {status.siteCount !== undefined && (
              <span className="text-muted"> ({status.siteCount} site{status.siteCount !== 1 ? 's' : ''})</span>
            )}
          </>
        ) : (
          <>
            <span className="status status-reserved">Disconnected</span>
            {status.error && <span className="text-muted"> — {status.error}</span>}
          </>
        )}
      </div>

      {lastSync && (
        <div className="sync-result">
          Last sync from {lastSync.sites} site(s) —{' '}
          {lastSync.networks.created > 0 && <span>{lastSync.networks.created} networks created, </span>}
          {lastSync.networks.updated > 0 && <span>{lastSync.networks.updated} networks updated, </span>}
          {lastSync.ipAddresses.created > 0 && <span>{lastSync.ipAddresses.created} IPs added, </span>}
          {lastSync.ipAddresses.updated > 0 && <span>{lastSync.ipAddresses.updated} IPs updated, </span>}
          {lastSync.devices.synced} devices synced
          {lastSync.errors.length > 0 && (
            <span className="text-muted"> ({lastSync.errors.length} error{lastSync.errors.length !== 1 ? 's' : ''})</span>
          )}
        </div>
      )}

      {loading ? (
        <p>Loading devices...</p>
      ) : devices.length === 0 ? (
        <p className="empty-state">No devices found. Click "Sync from UniFi" to discover devices.</p>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>MAC Address</th>
                <th>IP Address</th>
                <th>Network</th>
                <th>Hostname</th>
                <th>Vendor</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(device => (
                <tr key={device.id}>
                  <td><strong>{device.name}</strong></td>
                  <td><code>{device.macAddress || '-'}</code></td>
                  <td>
                    {device.ipAddress ? (
                      <code>{device.ipAddress.address}</code>
                    ) : '-'}
                  </td>
                  <td>
                    {device.ipAddress?.network ? (
                      <span className="badge">{device.ipAddress.network.name}</span>
                    ) : '-'}
                  </td>
                  <td>{device.hostname || '-'}</td>
                  <td>{device.vendor || '-'}</td>
                  <td>{formatLastSeen(device.lastSeen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
