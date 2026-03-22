interface AssetFieldsProps {
  serialNumber: string
  assetTag: string
  purchaseDate: string
  warrantyExpiration: string
  onChange: (field: string, value: string) => void
}

export function warrantyStatus(expiration: string | null): { label: string; className: string } | null {
  if (!expiration) return null
  const exp = new Date(expiration)
  const now = new Date()
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysLeft < 0) return { label: `Expired ${Math.abs(daysLeft)} days ago`, className: 'warranty-expired' }
  if (daysLeft <= 90) return { label: `Expires in ${daysLeft} days`, className: 'warranty-expiring' }
  return { label: `Valid (${daysLeft} days remaining)`, className: 'warranty-valid' }
}

export default function AssetFields({ serialNumber, assetTag, purchaseDate, warrantyExpiration, onChange }: AssetFieldsProps) {
  const warranty = warrantyStatus(warrantyExpiration || null)

  return (
    <div className="asset-fields">
      <h4>Asset Tracking</h4>
      <div className="form-row">
        <div className="form-group">
          <label>Serial Number</label>
          <input
            type="text"
            value={serialNumber}
            onChange={e => onChange('serialNumber', e.target.value)}
            placeholder="e.g., ABCD1234"
          />
        </div>
        <div className="form-group">
          <label>Asset Tag</label>
          <input
            type="text"
            value={assetTag}
            onChange={e => onChange('assetTag', e.target.value)}
            placeholder="e.g., SRV-003"
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Purchase Date</label>
          <input
            type="date"
            value={purchaseDate}
            onChange={e => onChange('purchaseDate', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Warranty Expiration</label>
          <input
            type="date"
            value={warrantyExpiration}
            onChange={e => onChange('warrantyExpiration', e.target.value)}
          />
          {warranty && (
            <span className={`warranty-indicator ${warranty.className}`}>{warranty.label}</span>
          )}
        </div>
      </div>
    </div>
  )
}
