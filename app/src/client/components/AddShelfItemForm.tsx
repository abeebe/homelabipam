import { useEffect, useState } from 'react'
import { racksAPI, APIError } from '../api'
import { Device } from '../types'
import ColorPicker from './ColorPicker'
import AssetFields from './AssetFields'

interface AddShelfItemFormProps {
  rackId: string
  shelfId: string
  shelfName: string
  onSuccess: () => void
  onCancel: () => void
}

export default function AddShelfItemForm({ rackId, shelfId, shelfName, onSuccess, onCancel }: AddShelfItemFormProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [deviceId, setDeviceId] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [assetTag, setAssetTag] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [warrantyExpiration, setWarrantyExpiration] = useState('')
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/unifi/devices')
      .then(r => r.ok ? r.json() : [])
      .then(setDevices)
      .catch(() => setDevices([]))
  }, [])

  const handleAssetChange = (field: string, value: string) => {
    if (field === 'serialNumber') setSerialNumber(value)
    if (field === 'assetTag') setAssetTag(value)
    if (field === 'purchaseDate') setPurchaseDate(value)
    if (field === 'warrantyExpiration') setWarrantyExpiration(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError('Name is required'); return }

    try {
      setLoading(true)
      await racksAPI.addShelfItem(rackId, shelfId, {
        name,
        color,
        deviceId: deviceId || null,
        serialNumber: serialNumber || null,
        assetTag: assetTag || null,
        purchaseDate: purchaseDate || null,
        warrantyExpiration: warrantyExpiration || null,
      } as any)
      onSuccess()
    } catch (err) {
      if (err instanceof APIError) setError(err.message)
      else setError('Failed to add item to shelf')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="form form-shelf-item" onSubmit={handleSubmit}>
      <h3>Add Item to Shelf: {shelfName}</h3>
      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label>Name *</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Gaming Tower" required />
      </div>

      <div className="form-group">
        <label>Color</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div className="form-group">
        <label>Link to Device</label>
        <select value={deviceId} onChange={e => setDeviceId(e.target.value)}>
          <option value="">— None —</option>
          {devices.map(d => (
            <option key={d.id} value={d.id}>{d.name}{d.hostname ? ` (${d.hostname})` : ''}</option>
          ))}
        </select>
      </div>

      <AssetFields
        serialNumber={serialNumber} assetTag={assetTag}
        purchaseDate={purchaseDate} warrantyExpiration={warrantyExpiration}
        onChange={handleAssetChange}
      />

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Adding...' : 'Add to Shelf'}
        </button>
      </div>
    </form>
  )
}
