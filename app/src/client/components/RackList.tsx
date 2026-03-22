import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { racksAPI, APIError } from '../api'
import { Rack } from '../types'
import CreateRackForm from './CreateRackForm'

export default function RackList() {
  const navigate = useNavigate()
  const [racks, setRacks] = useState<Rack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[] | null>(null)

  async function loadRacks() {
    try {
      setLoading(true)
      setError(null)
      const data = await racksAPI.getAll()
      setRacks(data)
    } catch (err) {
      if (err instanceof APIError) setError(`Error: ${err.message}`)
      else setError('Failed to load racks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRacks() }, [])

  const handleRackCreated = () => { setShowForm(false); loadRacks() }

  async function handleDelete(e: React.MouseEvent, rack: Rack) {
    e.stopPropagation()
    const itemCount = rack.items?.length || 0
    const msg = itemCount > 0
      ? `This rack contains ${itemCount} items. Delete rack "${rack.name}" and all items?`
      : `Delete rack "${rack.name}"?`
    if (!confirm(msg)) return

    try {
      await racksAPI.delete(rack.id)
      loadRacks()
    } catch (err) {
      if (err instanceof APIError) setError(err.message)
      else setError('Failed to delete rack')
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) { setSearchResults(null); return }
    try {
      const results = await racksAPI.searchAssets(searchQuery)
      setSearchResults(results)
    } catch {
      setSearchResults([])
    }
  }

  if (loading) return <p>Loading racks...</p>

  return (
    <div className="page-rack-list">
      <div className="page-header">
        <h2>Racks</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Rack'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {showForm && <CreateRackForm onSuccess={handleRackCreated} />}

      <div className="asset-search">
        <input
          type="text"
          placeholder="Search by serial number or asset tag..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn btn-secondary" onClick={handleSearch}>Search</button>
        {searchResults !== null && (
          <button className="btn btn-secondary" onClick={() => { setSearchResults(null); setSearchQuery('') }}>Clear</button>
        )}
      </div>

      {searchResults !== null && (
        <div className="search-results">
          <h3>Asset Search Results ({searchResults.length})</h3>
          {searchResults.length === 0 ? (
            <p className="empty-state">No items found matching "{searchQuery}"</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Rack</th>
                  <th>Serial</th>
                  <th>Asset Tag</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((item: any) => (
                  <tr key={item.id} onClick={() => navigate(`/racks/${item.rackId}`)} style={{ cursor: 'pointer' }}>
                    <td>{item.name}</td>
                    <td>{item.rack?.name ?? '—'}</td>
                    <td>{item.serialNumber ?? '—'}</td>
                    <td>{item.assetTag ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {racks.length === 0 ? (
        <p className="empty-state">No racks yet. Create your first rack to start tracking hardware.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Size</th>
              <th>Front</th>
              <th>Back</th>
              <th>Side Rails</th>
              <th>Location</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {racks.map(rack => {
              const frontPct = rack.totalUnits > 0 ? Math.round(((rack.frontUsed ?? 0) / rack.totalUnits) * 100) : 0
              const backPct = rack.totalUnits > 0 ? Math.round(((rack.backUsed ?? 0) / rack.totalUnits) * 100) : 0
              return (
                <tr key={rack.id} onClick={() => navigate(`/racks/${rack.id}`)} style={{ cursor: 'pointer' }}>
                  <td><strong>{rack.name}</strong></td>
                  <td>{rack.totalUnits}U</td>
                  <td>
                    <span className="utilization">{rack.frontUsed ?? 0}/{rack.totalUnits}U ({frontPct}%)</span>
                  </td>
                  <td>
                    <span className="utilization">{rack.backUsed ?? 0}/{rack.totalUnits}U ({backPct}%)</span>
                  </td>
                  <td>{rack.zeroUCount ?? 0}</td>
                  <td>{rack.location ?? '—'}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={e => handleDelete(e, rack)}>Delete</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
