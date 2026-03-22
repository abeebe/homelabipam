import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { racksAPI, APIError } from '../api'
import { Rack, RackItem, RackSide } from '../types'
import RackDiagram from './RackDiagram'
import AddItemForm from './AddItemForm'
import AddShelfItemForm from './AddShelfItemForm'
import { warrantyStatus } from './AssetFields'

type SidebarMode =
  | { type: 'none' }
  | { type: 'addItem'; prefillUnit?: number; prefillSide?: RackSide }
  | { type: 'addShelfItem'; shelf: RackItem }
  | { type: 'itemDetail'; item: RackItem }

export default function RackDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [rack, setRack] = useState<Rack | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSide, setActiveSide] = useState<RackSide>('FRONT')
  const [sidebar, setSidebar] = useState<SidebarMode>({ type: 'none' })

  async function loadRack() {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      const data = await racksAPI.getById(id)
      setRack(data)
    } catch (err) {
      if (err instanceof APIError) setError(err.message)
      else setError('Failed to load rack')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRack() }, [id])

  const handleItemClick = (item: RackItem) => {
    setSidebar({ type: 'itemDetail', item })
  }

  const handleShelfClick = (shelf: RackItem) => {
    setSidebar({ type: 'itemDetail', item: shelf })
  }

  const handleEmptySlotClick = (unit: number) => {
    setSidebar({ type: 'addItem', prefillUnit: unit, prefillSide: activeSide })
  }

  const handleItemAdded = () => {
    setSidebar({ type: 'none' })
    loadRack()
  }

  async function handleRemoveItem(item: RackItem) {
    if (!rack) return
    const childCount = item.children?.length ?? 0
    const msg = item.itemType === 'SHELF' && childCount > 0
      ? `This shelf contains ${childCount} items. Delete shelf "${item.name}" and all contents?`
      : `Remove "${item.name}" from rack?`
    if (!confirm(msg)) return

    try {
      await racksAPI.removeItem(rack.id, item.id)
      setSidebar({ type: 'none' })
      loadRack()
    } catch (err) {
      if (err instanceof APIError) setError(err.message)
      else setError('Failed to remove item')
    }
  }

  if (loading) return <p>Loading rack...</p>
  if (!rack) return <p className="error-message">{error || 'Rack not found'}</p>

  const zeroUItems = rack.items.filter(i => i.itemType === 'ZERO_U')
  const frontUsed = rack.frontUsed ?? 0
  const backUsed = rack.backUsed ?? 0

  return (
    <div className="page-rack-detail">
      <div className="page-header">
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/racks')}>← Back</button>
          <h2>{rack.name} <span className="rack-size">{rack.totalUnits}U</span></h2>
          {rack.location && <p className="rack-location">{rack.location}</p>}
        </div>
        <button className="btn btn-primary" onClick={() => setSidebar({ type: 'addItem', prefillSide: activeSide })}>+ Add Item</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="rack-utilization-bar">
        Front: {frontUsed}/{rack.totalUnits}U ({Math.round((frontUsed / rack.totalUnits) * 100)}%)
        {' · '}
        Back: {backUsed}/{rack.totalUnits}U ({Math.round((backUsed / rack.totalUnits) * 100)}%)
        {zeroUItems.length > 0 && <> {' · '} Side Rails: {zeroUItems.length} items</>}
      </div>

      <div className="rack-view-toggle">
        <button className={`btn btn-sm ${activeSide === 'FRONT' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveSide('FRONT')}>Front</button>
        <button className={`btn btn-sm ${activeSide === 'BACK' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveSide('BACK')}>Back</button>
      </div>

      <div className="rack-layout">
        <div className="rack-diagram-container">
          <RackDiagram
            rack={rack}
            activeSide={activeSide}
            selectedItemId={sidebar.type === 'itemDetail' ? sidebar.item.id : null}
            onItemClick={handleItemClick}
            onEmptySlotClick={handleEmptySlotClick}
            onShelfClick={handleShelfClick}
          />

          {zeroUItems.length > 0 && (
            <div className="side-rails">
              <h4>Side Rails</h4>
              {zeroUItems.map(item => (
                <div key={item.id} className="side-rail-item" onClick={() => handleItemClick(item)}>
                  <span className="color-dot" style={{ backgroundColor: item.color }} />
                  <span className="side-rail-name">{item.name}</span>
                  {item.device && <span className="side-rail-device">{item.device.hostname || item.device.name}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rack-sidebar">
          {sidebar.type === 'none' && (
            <p className="sidebar-hint">Click an item in the diagram to view details, or click an empty slot to add hardware.</p>
          )}

          {sidebar.type === 'addItem' && (
            <AddItemForm
              rackId={rack.id}
              totalUnits={rack.totalUnits}
              prefillUnit={sidebar.prefillUnit}
              prefillSide={sidebar.prefillSide}
              onSuccess={handleItemAdded}
              onCancel={() => setSidebar({ type: 'none' })}
            />
          )}

          {sidebar.type === 'addShelfItem' && (
            <AddShelfItemForm
              rackId={rack.id}
              shelfId={sidebar.shelf.id}
              shelfName={sidebar.shelf.name}
              onSuccess={handleItemAdded}
              onCancel={() => setSidebar({ type: 'none' })}
            />
          )}

          {sidebar.type === 'itemDetail' && (
            <div className="item-detail-panel">
              <h3>{sidebar.item.name}</h3>
              <div className="detail-row">
                <span className="detail-label">Type:</span>
                <span>{sidebar.item.itemType}</span>
              </div>
              {sidebar.item.startUnit != null && (
                <div className="detail-row">
                  <span className="detail-label">Position:</span>
                  <span>U{sidebar.item.startUnit}{sidebar.item.unitHeight && sidebar.item.unitHeight > 1 ? `-U${sidebar.item.startUnit + sidebar.item.unitHeight - 1}` : ''} ({sidebar.item.side})</span>
                </div>
              )}
              {sidebar.item.fullDepth && (
                <div className="detail-row"><span className="detail-label">Depth:</span> <span>Full depth</span></div>
              )}
              {sidebar.item.halfWidth && (
                <div className="detail-row"><span className="detail-label">Width:</span> <span>Half ({sidebar.item.halfWidthPosition})</span></div>
              )}
              {sidebar.item.device && (
                <>
                  <div className="detail-row"><span className="detail-label">Device:</span> <span>{sidebar.item.device.name}</span></div>
                  {sidebar.item.device.hostname && <div className="detail-row"><span className="detail-label">Hostname:</span> <span>{sidebar.item.device.hostname}</span></div>}
                  {sidebar.item.device.ipAddress && <div className="detail-row"><span className="detail-label">IP:</span> <span>{sidebar.item.device.ipAddress.address}</span></div>}
                </>
              )}
              {sidebar.item.serialNumber && <div className="detail-row"><span className="detail-label">Serial:</span> <span>{sidebar.item.serialNumber}</span></div>}
              {sidebar.item.assetTag && <div className="detail-row"><span className="detail-label">Asset Tag:</span> <span>{sidebar.item.assetTag}</span></div>}
              {sidebar.item.warrantyExpiration && (() => {
                const ws = warrantyStatus(sidebar.item.warrantyExpiration)
                return ws ? <div className="detail-row"><span className="detail-label">Warranty:</span> <span className={ws.className}>{ws.label}</span></div> : null
              })()}
              {sidebar.item.description && <div className="detail-row"><span className="detail-label">Notes:</span> <span>{sidebar.item.description}</span></div>}

              {sidebar.item.itemType === 'SHELF' && (
                <div className="shelf-children">
                  <h4>Items on Shelf ({sidebar.item.children?.length ?? 0})</h4>
                  {(sidebar.item.children ?? []).map(child => (
                    <div key={child.id} className="shelf-child-row" onClick={() => setSidebar({ type: 'itemDetail', item: child })}>
                      <span className="color-dot" style={{ backgroundColor: child.color }} />
                      <span>{child.name}</span>
                      {child.device && <span className="shelf-child-device">{child.device.hostname || child.device.name}</span>}
                    </div>
                  ))}
                  <button className="btn btn-sm btn-primary" onClick={() => setSidebar({ type: 'addShelfItem', shelf: sidebar.item })}>
                    + Add Item to Shelf
                  </button>
                </div>
              )}

              <div className="detail-actions">
                <button className="btn btn-sm btn-danger" onClick={() => handleRemoveItem(sidebar.item)}>Remove</button>
                <button className="btn btn-sm btn-secondary" onClick={() => setSidebar({ type: 'none' })}>Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
