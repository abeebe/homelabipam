import { useState } from 'react'
import { networksAPI, APIError } from '../api'
import { Network } from '../types'

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
  const [populateSubnet, setPopulateSubnet] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [populateResult, setPopulateResult] = useState<{ created: number; total: number } | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  /** Quick CIDR prefix check to warn if populate is requested on a large subnet */
  function getPrefix(cidr: string): number {
    const parts = cidr.split('/')
    return parts.length === 2 ? parseInt(parts[1]) : 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setPopulateResult(null)

    if (!formData.name.trim() || !formData.cidr.trim()) {
      setError('Name and CIDR are required')
      return
    }

    if (populateSubnet && getPrefix(formData.cidr) < 20) {
      setError('Auto-populate is only allowed for /20 or smaller networks (max 4094 hosts)')
      return
    }

    try {
      setLoading(true)
      const network: Network = await networksAPI.create({
        name: formData.name,
        cidr: formData.cidr,
        gateway: formData.gateway || null,
        vlanId: formData.vlanId ? parseInt(formData.vlanId) : null,
        description: formData.description || null
      })

      if (populateSubnet) {
        const result = await networksAPI.populate(network.id)
        setPopulateResult({ created: result.created, total: result.total })
        // Give user a moment to see the result before closing
        setTimeout(() => onSuccess(), 1500)
      } else {
        onSuccess()
      }
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
      {populateResult && (
        <div className="populate-result-banner">
          ✓ Network created — {populateResult.created} IPs added ({populateResult.total} total host addresses)
        </div>
      )}

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

      <div className="form-option-row">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={populateSubnet}
            onChange={e => setPopulateSubnet(e.target.checked)}
          />
          <span>Auto-populate all host IPs as AVAILABLE</span>
          <span className="option-hint">(requires /20 or smaller)</span>
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading
            ? (populateSubnet ? 'Creating & populating…' : 'Creating...')
            : 'Create Network'}
        </button>
      </div>
    </form>
  )
}
