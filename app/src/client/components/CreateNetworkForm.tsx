import { useState } from 'react'
import { networksAPI, APIError } from '../api'

interface CreateNetworkFormProps {
  onSuccess: () => void
}

export default function CreateNetworkForm({ onSuccess }: CreateNetworkFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    cidr: '',
    gateway: '',
    vlanId: '',
    description: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim() || !formData.cidr.trim()) {
      setError('Name and CIDR are required')
      return
    }

    try {
      setLoading(true)
      await networksAPI.create({
        name: formData.name,
        cidr: formData.cidr,
        gateway: formData.gateway || null,
        vlanId: formData.vlanId ? parseInt(formData.vlanId) : null,
        description: formData.description || null
      })
      onSuccess()
    } catch (err) {
      if (err instanceof APIError) {
        setError(`Error: ${err.message}`)
      } else {
        setError('Failed to create network')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="form form-network" onSubmit={handleSubmit}>
      <h3>Create New Network</h3>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="name">Network Name *</label>
        <input
          id="name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Production Network"
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="cidr">CIDR *</label>
          <input
            id="cidr"
            type="text"
            name="cidr"
            value={formData.cidr}
            onChange={handleChange}
            placeholder="e.g., 192.168.1.0/24"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="vlanId">VLAN ID</label>
          <input
            id="vlanId"
            type="number"
            name="vlanId"
            value={formData.vlanId}
            onChange={handleChange}
            placeholder="e.g., 100"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="gateway">Gateway</label>
        <input
          id="gateway"
          type="text"
          name="gateway"
          value={formData.gateway}
          onChange={handleChange}
          placeholder="e.g., 192.168.1.1"
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Add notes about this network"
          rows={3}
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating...' : 'Create Network'}
        </button>
      </div>
    </form>
  )
}
