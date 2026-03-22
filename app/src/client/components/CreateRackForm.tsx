import { useState } from 'react'
import { racksAPI, APIError } from '../api'

interface CreateRackFormProps {
  onSuccess: () => void
}

export default function CreateRackForm({ onSuccess }: CreateRackFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    totalUnits: '42',
    location: '',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }

    const units = parseInt(formData.totalUnits)
    if (isNaN(units) || units < 4 || units > 48) {
      setError('Total units must be between 4 and 48')
      return
    }

    try {
      setLoading(true)
      await racksAPI.create({
        name: formData.name,
        totalUnits: units,
        location: formData.location || undefined,
        description: formData.description || undefined,
      })
      onSuccess()
    } catch (err) {
      if (err instanceof APIError) setError(`Error: ${err.message}`)
      else setError('Failed to create rack')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="form form-rack" onSubmit={handleSubmit}>
      <h3>Create New Rack</h3>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="rack-name">Rack Name *</label>
        <input
          id="rack-name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Main Rack"
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="rack-units">Total Units (U) *</label>
          <input
            id="rack-units"
            type="number"
            name="totalUnits"
            value={formData.totalUnits}
            onChange={handleChange}
            min={4}
            max={48}
            required
          />
          <span className="option-hint">4U – 48U</span>
        </div>

        <div className="form-group">
          <label htmlFor="rack-location">Location</label>
          <input
            id="rack-location"
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g., Office closet"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="rack-description">Description</label>
        <textarea
          id="rack-description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Notes about this rack"
          rows={3}
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating...' : 'Create Rack'}
        </button>
      </div>
    </form>
  )
}
