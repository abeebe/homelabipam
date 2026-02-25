import { useEffect, useState } from 'react'
import { networksAPI, APIError } from '../api'
import { Network } from '../types'
import CreateNetworkForm from './CreateNetworkForm'

export default function NetworkList() {
  const [networks, setNetworks] = useState<Network[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  async function loadNetworks() {
    try {
      setLoading(true)
      setError(null)
      const data = await networksAPI.getAll()
      setNetworks(data)
    } catch (err) {
      if (err instanceof APIError) {
        setError(`Error: ${err.message}`)
      } else {
        setError('Failed to load networks')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNetworks()
  }, [])

  const handleNetworkCreated = () => {
    setShowForm(false)
    loadNetworks()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this network?')) return

    try {
      await networksAPI.delete(id)
      await loadNetworks()
    } catch (err) {
      setError('Failed to delete network')
    }
  }

  return (
    <div className="networks-page">
      <div className="page-header">
        <h2>Networks</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
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
                <th>IPs</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {networks.map(network => (
                <tr key={network.id}>
                  <td><strong>{network.name}</strong></td>
                  <td><code>{network.cidr}</code></td>
                  <td>{network.vlanId || '-'}</td>
                  <td>{network.gateway || '-'}</td>
                  <td>{network.ipAddresses.length}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(network.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
