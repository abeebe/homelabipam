import { Fragment, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ipAddressesAPI, APIError, networksAPI } from '../api'
import { IPAddress, Network } from '../types'
import CreateIPAddressForm from './CreateIPAddressForm'
import SubnetGrid from './SubnetGrid'

type SortCol = 'address' | 'network' | 'status' | 'device'
type SortDir = 'asc' | 'desc'
type ViewMode = 'table' | 'grid'

function compareIPs(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 4; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i]
  }
  return 0
}

export default function IPAddressList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [ipAddresses, setIpAddresses] = useState<IPAddress[]>([])
  const [allNetworks, setAllNetworks] = useState<Network[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterNetwork, setFilterNetwork] = useState<string>(searchParams.get('network') || '')
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState<SortCol>('address')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [showForm, setShowForm] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ status: '', description: '' })
  const [saving, setSaving] = useState(false)

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

  function handleNetworkFilter(value: string) {
    setFilterNetwork(value)
    if (!value && viewMode === 'grid') setViewMode('table')
    if (value) {
      setSearchParams({ network: value })
    } else {
      setSearchParams({})
    }
  }

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  function sortIcon(col: SortCol) {
    if (sortCol !== col) return <span className="sort-icon">↕</span>
    return <span className="sort-icon active">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  // Edit handlers
  function startEdit(ip: IPAddress) {
    setViewMode('table')
    if (editingId === ip.id) {
      setEditingId(null)
      return
    }
    setEditingId(ip.id)
    setEditValues({ status: ip.status, description: ip.description || '' })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(ip: IPAddress) {
    setSaving(true)
    try {
      await ipAddressesAPI.update(ip.id, { status: editValues.status as IPAddress['status'], description: editValues.description })
      setEditingId(null)
      await loadIPAddresses()
    } catch (err) {
      if (err instanceof APIError) {
        setError(`Save failed: ${err.message}`)
      } else {
        setError('Failed to save changes')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this IP address entry?')) return
    try {
      await ipAddressesAPI.delete(id)
      if (editingId === id) setEditingId(null)
      await loadIPAddresses()
    } catch (err) {
      setError('Failed to delete IP address')
    }
  }

  // Filter + sort
  const searchLower = search.toLowerCase()

  let filtered = ipAddresses
    .filter(ip => !filterNetwork || ip.network.id === filterNetwork)
    .filter(ip => !search ||
      ip.address.includes(searchLower) ||
      ip.network.name.toLowerCase().includes(searchLower) ||
      (ip.device?.name || '').toLowerCase().includes(searchLower) ||
      (ip.device?.hostname || '').toLowerCase().includes(searchLower) ||
      (ip.description || '').toLowerCase().includes(searchLower)
    )

  filtered = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortCol === 'address') cmp = compareIPs(a.address, b.address)
    else if (sortCol === 'network') cmp = a.network.name.localeCompare(b.network.name)
    else if (sortCol === 'status') cmp = a.status.localeCompare(b.status)
    else if (sortCol === 'device') cmp = (a.device?.name || '').localeCompare(b.device?.name || '')
    return sortDir === 'asc' ? cmp : -cmp
  })

  // All IPs for the selected network (unfiltered by search — used for grid)
  const networkIPs = filterNetwork
    ? ipAddresses.filter(ip => ip.network.id === filterNetwork)
    : []
  const selectedNetwork = allNetworks.find(n => n.id === filterNetwork) ?? null

  const statusColor = (status: string) => {
    switch (status) {
      case 'IN_USE': return 'status-in-use'
      case 'RESERVED': return 'status-reserved'
      default: return 'status-available'
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
          <label htmlFor="filter-network">Network</label>
          <select
            id="filter-network"
            value={filterNetwork}
            onChange={(e) => handleNetworkFilter(e.target.value)}
          >
            <option value="">All Networks</option>
            {networks.map(net => (
              <option key={net.id} value={net.id}>
                {net.name} ({net.cidr})
              </option>
            ))}
          </select>

          <label htmlFor="search-ip">Search</label>
          <input
            id="search-ip"
            type="text"
            className="filter-input"
            placeholder="IP, device, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {(filterNetwork || search) && (
            <span className="filter-count">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          )}

          <div className="view-toggle">
            <button
              className={`view-btn${viewMode === 'table' ? ' active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table view"
            >
              ☰ Table
            </button>
            <button
              className={`view-btn${viewMode === 'grid' ? ' active' : ''}`}
              onClick={() => setViewMode('grid')}
              disabled={!filterNetwork}
              title={filterNetwork ? 'Grid view' : 'Select a network to use grid view'}
            >
              ⊞ Grid
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p>Loading IP addresses...</p>
      ) : viewMode === 'grid' && selectedNetwork ? (
        <SubnetGrid
          network={selectedNetwork}
          ipAddresses={networkIPs}
          onIPClick={startEdit}
        />
      ) : filtered.length === 0 ? (
        <p className="empty-state">No IP addresses found.</p>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('address')}>
                  IP Address {sortIcon('address')}
                </th>
                <th className="sortable" onClick={() => handleSort('network')}>
                  Network {sortIcon('network')}
                </th>
                <th className="sortable" onClick={() => handleSort('status')}>
                  Status {sortIcon('status')}
                </th>
                <th className="sortable" onClick={() => handleSort('device')}>
                  Device {sortIcon('device')}
                </th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ip => (
                <Fragment key={ip.id}>
                  <tr
                    className={`clickable-row${editingId === ip.id ? ' row-active' : ''}`}
                    onClick={() => startEdit(ip)}
                    title="Click to edit"
                  >
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
                          {ip.device.hostname && <><br /><small>{ip.device.hostname}</small></>}
                        </>
                      ) : '-'}
                    </td>
                    <td>{ip.description || <span className="text-subtle">—</span>}</td>
                  </tr>

                  {editingId === ip.id && (
                    <tr className="edit-row" onClick={e => e.stopPropagation()}>
                      <td colSpan={5}>
                        <div className="edit-inline">
                          <div className="edit-inline-fields">
                            <div className="edit-field">
                              <label>Status</label>
                              <select
                                value={editValues.status}
                                onChange={e => setEditValues(v => ({ ...v, status: e.target.value }))}
                              >
                                <option value="AVAILABLE">AVAILABLE</option>
                                <option value="IN_USE">IN_USE</option>
                                <option value="RESERVED">RESERVED</option>
                              </select>
                            </div>
                            <div className="edit-field edit-field-grow">
                              <label>Description</label>
                              <input
                                type="text"
                                value={editValues.description}
                                onChange={e => setEditValues(v => ({ ...v, description: e.target.value }))}
                                placeholder="Add a description..."
                                onKeyDown={e => { if (e.key === 'Enter') saveEdit(ip); if (e.key === 'Escape') cancelEdit() }}
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="edit-inline-actions">
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => saveEdit(ip)}
                              disabled={saving}
                            >
                              {saving ? 'Saving…' : 'Save'}
                            </button>
                            <button className="btn btn-sm" onClick={cancelEdit}>
                              Cancel
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              style={{ marginLeft: 'auto' }}
                              onClick={() => handleDelete(ip.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
