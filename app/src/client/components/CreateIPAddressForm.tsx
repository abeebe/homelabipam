import { useState } from 'react'
import { ipAddressesAPI, APIError } from '../api'
import { Network } from '../types'

interface CreateIPAddressFormProps {
  networks: Network[]
  onSuccess: () => void
}

export default function CreateIPAddressForm({ networks, onSuccess }: CreateIPAddressFormProps) {
  const [formData, setFormData] = useState({
    address: '',
    networkId: networks.length > 0 ? networks[0].id : '',
    status: 'AVAILABLE',
    description: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.address.trim() || !formData.networkId) {
      setError('IP address and network are required')
      return
    }

    try {
      setLoading(true)
      await ipAddressesAPI.create({
        address: formData.address,
        networkId: formData.networkId,
        status: formData.status as 'AVAILABLE' | 'RESERVED' | 'IN_USE',
        description: formData.description || null
      })
      setFormData({
        address: '',
        networkId: networks.length > 0 ? networks[0].id : '',
        status: 'AVAILABLE',
        description: ''
      })
      onSuccess()
    } catch (err) {
      if (err instanceof APIError) {
        setError(`Error: ${err.message}`)
      } else {
        setError('Failed to create IP address')
      }
    } finally {
      setLoading(false)
    }
  }

  if (networks.length === 0) {
    return (
      <div className="form-network">
        <p>Please create a network first before adding IP addresses.</p>
      </div>
    )
  }

  return (
    <form className="form form-network" onSubmit={handleSubmit}>
      <h3>Add New IP Address</h3>

      {error && <div className="error-message">{error}</div>}

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="address">IP Address *</label>
          <input
            id="address"
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="e.g., 192.168.1.10"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="networkId">Network *</label>
          <select
            id="networkId"
            name="networkId"
            value={formData.networkId}
            onChange={handleChange}
            required
          >
            {networks.map(net => (
              <option key={net.id} value={net.id}>
                {net.name} ({net.cidr})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="status">Status</label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleChange}
        >
          <option value="AVAILABLE">Available</option>
          <option value="RESERVED">Reserved</option>
          <option value="IN_USE">In Use</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="e.g., Server hostname or purpose"
          rows={2}
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Adding...' : 'Add IP Address'}
        </button>
      </div>
    </form>
  )
}
