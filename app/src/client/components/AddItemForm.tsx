import { useEffect, useState } from 'react'
import { racksAPI, APIError } from '../api'
import { Device, RackItemType, RackSide, HalfWidthPosition } from '../types'
import ColorPicker from './ColorPicker'
import AssetFields from './AssetFields'

interface AddItemFormProps {
  rackId: string
  totalUnits: number
  prefillUnit?: number
  prefillSide?: RackSide
  onSuccess: () => void
  onCancel: () => void
}

export default function AddItemForm({ rackId, totalUnits, prefillUnit, prefillSide, onSuccess, onCancel }: AddItemFormProps) {
  const [itemType, setItemType] = useState<'MOUNTED' | 'SHELF' | 'ZERO_U' | 'HALF_WIDTH'>('MOUNTED')
  const [name, setName] = useState('')
  const [startUnit, setStartUnit] = useState(prefillUnit ?? 1)
  const [unitHeight, setUnitHeight] = useState(1)
  const [side, setSide] = useState<RackSide>(prefillSide ?? 'FRONT')
  const [fullDepth, setFullDepth] = useState(false)
  const [halfWidthPosition, setHalfWidthPosition] = useState<HalfWidthPosition>('LEFT')
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

    const apiType: RackItemType = itemType === 'HALF_WIDTH' ? 'MOUNTED' : itemType
    const isHalfWidth = itemType === 'HALF_WIDTH'

    try {
      setLoading(true)
      await racksAPI.addItem(rackId, {
        name,
        itemType: apiType,
        startUnit: apiType === 'ZERO_U' ? null : startUnit,
        unitHeight: apiType === 'ZERO_U' ? null : (isHalfWidth ? 1 : unitHeight),
        side: apiType === 'ZERO_U' ? null : side,
        fullDepth: apiType === 'MOUNTED' && !isHalfWidth ? fullDepth : false,
        halfWidth: isHalfWidth,
        halfWidthPosition: isHalfWidth ? halfWidthPosition : null,
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
      else setError('Failed to add item')
    } finally {
      setLoading(false)
    }
  }

  const showPosition = itemType !== 'ZERO_U'
  const showHeight = itemType === 'MOUNTED' || itemType === 'SHELF'
  const showFullDepth = itemType === 'MOUNTED'
  const showHalfWidthPos = itemType === 'HALF_WIDTH'
  const heightLabel = itemType === 'SHELF' ? 'Total Device Height (U)' : 'Unit Height (U)'

  return (
    <form className="form form-rack-item" onSubmit={handleSubmit}>
      <h3>Add Item to Rack</h3>
      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label>Item Type</label>
        <select value={itemType} onChange={e => setItemType(e.target.value as any)}>
          <option value="MOUNTED">Rackmount</option>
          <option value="SHELF">Shelf (holds non-rackmount items)</option>
          <option value="HALF_WIDTH">Half-Width (shares U slot)</option>
          <option value="ZERO_U">Zero-U (side rail mount)</option>
        </select>
      </div>

      <div className="form-group">
        <label>Name *</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., TrueNAS Server" required />
      </div>

      {showPosition && (
        <div className="form-row">
          <div className="form-group">
            <label>Starting U</label>
            <input type="number" value={startUnit} onChange={e => setStartUnit(parseInt(e.target.value) || 1)} min={1} max={totalUnits} />
          </div>
          {showHeight && (
            <div className="form-group">
              <label>{heightLabel}</label>
              <input type="number" value={unitHeight} onChange={e => setUnitHeight(parseInt(e.target.value) || 1)} min={1} max={itemType === 'MOUNTED' ? 16 : totalUnits} />
            </div>
          )}
          <div className="form-group">
            <label>Side</label>
            <select value={side} onChange={e => setSide(e.target.value as RackSide)}>
              <option value="FRONT">Front</option>
              <option value="BACK">Back</option>
            </select>
          </div>
        </div>
      )}

      {showFullDepth && (
        <div className="form-option-row">
          <label className="checkbox-label">
            <input type="checkbox" checked={fullDepth} onChange={e => setFullDepth(e.target.checked)} />
            <span>Full depth (blocks both front and back)</span>
          </label>
        </div>
      )}

      {showHalfWidthPos && (
        <div className="form-group">
          <label>Position</label>
          <select value={halfWidthPosition} onChange={e => setHalfWidthPosition(e.target.value as HalfWidthPosition)}>
            <option value="LEFT">Left</option>
            <option value="RIGHT">Right</option>
          </select>
        </div>
      )}

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
          {loading ? 'Adding...' : 'Add Item'}
        </button>
      </div>
    </form>
  )
}
