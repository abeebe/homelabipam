import { Fragment, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { networksAPI, APIError } from '../api'
import { Network } from '../types'
import CreateNetworkForm from './CreateNetworkForm'

function cidrHostCount(cidr: string): number {
  const prefix = parseInt(cidr.split('/')[1] || '24')
  if (prefix >= 31) return 0
  return Math.pow(2, 32 - prefix) - 2
}

export default function NetworkList() {
  const navigate = useNavigate()
  const [networks, setNetworks] = useState<Network[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ name: '', vlanId: '', gateway: '', description: '' })
  const [saving, setSaving] = useState(false)

  // Populate state
  const [populatingId, setPopulatingId] = useState<string | null>(null)
  const [populateResult, setPopulateResult] = useState<{ id: string; created: number; total: number } | null>(null)

  async function loadNetworks() {
    try {
      setLoading(true)
      setError(null)
      const data = await networksAPI.getAll()
      setNetworks(data)
    } catch (err) {
      if (err instanceof APIError) setError(`Error: ${err.message}`)
      else setError('Failed to load networks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadNetworks() }, [])

  const handleNetworkCreated = () => { setShowForm(false); loadNetworks() }

  function startEdit(e: React.MouseEvent, network: Network) {
    e.stopPropagation()
    if (editingId === network.id) { setEditingId(null); return }
    setEditingId(network.id)
    setEditValues({
      name: network.name,
      vlanId: network.vlanId != null ? String(network.vlanId) : '',
      gateway: network.gateway ?? '',
      description: network.description ?? '',
    })
    setPopulateResult(null)
  }

  function cancelEdit() { setEditingId(null) }

  async function saveEdit(network: Network) {
    setSaving(true)
    try {
      await networksAPI.update(network.id, {
        name: editValues.name || undefined,
        vlanId: editValues.vlanId !== '' ? parseInt(editValues.vlanId) : null,
        gateway: editValues.gateway || null,
        description: editValues.description || null,
      } as any)
      setEditingId(null)
      await loadNetworks()
    } catch (err) {
      if (err instanceof APIError) setError(`Save failed: ${err.message}`)
      else setError('Failed to save network')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!confirm('Delete this network and all its IP address records?')) return
    try {
      await networksAPI.delete(id)
      if (editingId === id) setEditingId(null)
      await loadNetworks()
    } catch (err) {
      setError('Failed to delete network')
    }
  }

  async function handlePopulate(networkId: string) {
    setPopulatingId(networkId)
    setPopulateResult(null)
    try {
      const result = await networksAPI.populate(networkId)
      setPopulateResult({ id: networkId, created: result.created, total: result.total })
      await loadNetworks()
    } catch (err) {
      if (err instanceof APIError) setError(`Populate failed: ${err.message}`)
      else setError('Failed to populate subnet')
    } finally {
      setPopulatingId(null)
    }
  }

  return (
    <div className="networks-page">
      <div className="page-header">
        <h2>Networks</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Network'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {showForm && <CreateNetworkForm onSuccess={handleNetworkCreated} />}

      {loading ? (
        <p>Loading networks...</p>
      ) : networks.length === 0 ? (
        <p className="empty-state">No networks yet. Create one to get started.</p>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>CIDR</th>
                <th>VLAN</th>
                <th>Gateway</th>
                <th>Utilization</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {networks.map(network => {
                const total = cidrHostCount(network.cidr)
                const inUse = network.ipAddresses.filter(ip => ip.status === 'IN_USE').length
                const tracked = network.ipAddresses.length
                const pct = total > 0 ? Math.round((inUse / total) * 100) : 0
                const isEditing = editingId === network.id

                return (
                  <Fragment key={network.id}>
                    <tr
                      className={`clickable-row${isEditing ? ' row-active' : ''}`}
                      onClick={() => navigate(`/ips?network=${network.id}`)}
                      title="View IPs in this network"
                    >
                      <td><strong>{network.name}</strong></td>
                      <td><code>{network.cidr}</code></td>
                      <td>{network.vlanId ?? '—'}</td>
                      <td>{network.gateway ?? '—'}</td>
                      <td>
                        <div className="utilization-cell">
                          <div className="utilization-text">
                            <span>{inUse}</span>
                            <span className="text-subtle">/{total}</span>
                            <span className="text-muted"> ({pct}%)</span>
                            {tracked > inUse && (
                              <span className="text-subtle"> · {tracked} tracked</span>
                            )}
                          </div>
                          <div className="utilization-bar-wrap">
                            <div className="utilization-bar-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className={`btn btn-sm${isEditing ? ' btn-primary' : ''}`}
                            onClick={e => startEdit(e, network)}
                          >
                            {isEditing ? 'Editing' : 'Edit'}
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={e => handleDelete(e, network.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isEditing && (
                      <tr className="edit-row" onClick={e => e.stopPropagation()}>
                        <td colSpan={6}>
                          <div className="edit-inline" style={{ flexWrap: 'wrap', gap: 12 }}>
                            <div className="edit-inline-fields" style={{ flexWrap: 'wrap' }}>
                              <div className="edit-field" style={{ minWidth: 160 }}>
                                <label>Name</label>
                                <input
                                  type="text"
                                  value={editValues.name}
                                  onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))}
                                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(network); if (e.key === 'Escape') cancelEdit() }}
                                  autoFocus
                                />
                              </div>
                              <div className="edit-field" style={{ width: 80 }}>
                                <label>VLAN ID</label>
                                <input
                                  type="number"
                                  value={editValues.vlanId}
                                  onChange={e => setEditValues(v => ({ ...v, vlanId: e.target.value }))}
                                  placeholder="—"
                                />
                              </div>
                              <div className="edit-field" style={{ width: 150 }}>
                                <label>Gateway</label>
                                <input
                                  type="text"
                                  value={editValues.gateway}
                                  onChange={e => setEditValues(v => ({ ...v, gateway: e.target.value }))}
                                  placeholder="e.g. 10.10.1.1"
                                />
                              </div>
                              <div className="edit-field edit-field-grow">
                                <label>Description</label>
                                <input
                                  type="text"
                                  value={editValues.description}
                                  onChange={e => setEditValues(v => ({ ...v, description: e.target.value }))}
                                  placeholder="Optional note..."
                                />
                              </div>
                            </div>
                            <div className="edit-inline-actions">
                              <button className="btn btn-primary btn-sm" onClick={() => saveEdit(network)} disabled={saving}>
                                {saving ? 'Saving…' : 'Save'}
                              </button>
                              <button className="btn btn-sm" onClick={cancelEdit}>Cancel</button>
                              <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
                              <button
                                className="btn btn-sm btn-populate"
                                onClick={() => handlePopulate(network.id)}
                                disabled={populatingId === network.id}
                                title={`Create all ${total} host IPs as AVAILABLE (skips existing)`}
                              >
                                {populatingId === network.id ? 'Populating…' : '⊕ Populate Subnet'}
                              </button>
                              {populateResult?.id === network.id && (
                                <span className="populate-result">
                                  ✓ {populateResult.created === 0
                                    ? 'All IPs already exist'
                                    : `${populateResult.created} IPs created`}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
