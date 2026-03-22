import { useMemo } from 'react'
import { Rack, RackItem, RackSide } from '../types'

const U_HEIGHT = 28
const RACK_WIDTH = 380
const LABEL_WIDTH = 40
const PADDING = 8

interface RackDiagramProps {
  rack: Rack
  activeSide: RackSide
  selectedItemId: string | null
  onItemClick: (item: RackItem) => void
  onEmptySlotClick: (unitNumber: number) => void
  onShelfClick: (item: RackItem) => void
}

function warrantyStatus(expiration: string | null): 'ok' | 'expiring' | 'expired' | null {
  if (!expiration) return null
  const now = new Date()
  const exp = new Date(expiration)
  if (exp < now) return 'expired'
  const daysLeft = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (daysLeft < 90) return 'expiring'
  return 'ok'
}

function warrantyColor(status: 'ok' | 'expiring' | 'expired' | null): string | null {
  if (status === 'expired') return '#ef4444'
  if (status === 'expiring') return '#eab308'
  return null
}

function textColorForBg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.5 ? '#1e1e1e' : '#ffffff'
}

/** Build a map of unit number -> items occupying that unit on a given side */
function buildOccupancyMap(items: RackItem[], side: RackSide): Map<number, RackItem[]> {
  const map = new Map<number, RackItem[]>()
  for (const item of items) {
    if (item.itemType === 'SHELF_ITEM' || item.itemType === 'ZERO_U') continue
    if (item.startUnit == null || item.unitHeight == null) continue
    const isSameSide = item.side === side
    const isBlocker = item.side !== side && item.fullDepth
    if (!isSameSide && !isBlocker) continue
    for (let u = item.startUnit; u < item.startUnit + item.unitHeight; u++) {
      const existing = map.get(u) || []
      existing.push(item)
      map.set(u, existing)
    }
  }
  return map
}

export default function RackDiagram({
  rack,
  activeSide,
  selectedItemId,
  onItemClick,
  onEmptySlotClick,
  onShelfClick,
}: RackDiagramProps) {
  const totalUnits = rack.totalUnits
  const svgWidth = LABEL_WIDTH + RACK_WIDTH + PADDING * 2
  const svgHeight = totalUnits * U_HEIGHT + PADDING * 2

  const occupancy = useMemo(() => buildOccupancyMap(rack.items, activeSide), [rack.items, activeSide])

  /** Get items that belong on the active side (mounted or shelf, not blockers) */
  const sideItems = useMemo(() => {
    return rack.items.filter(item => {
      if (item.itemType === 'SHELF_ITEM' || item.itemType === 'ZERO_U') return false
      if (item.startUnit == null || item.unitHeight == null) return false
      return item.side === activeSide
    })
  }, [rack.items, activeSide])

  /** Get full-depth blockers from the opposite side */
  const blockerItems = useMemo(() => {
    return rack.items.filter(item => {
      if (item.itemType === 'SHELF_ITEM' || item.itemType === 'ZERO_U') return false
      if (item.startUnit == null || item.unitHeight == null) return false
      return item.side !== activeSide && item.fullDepth
    })
  }, [rack.items, activeSide])

  /** Convert a unit number (1-based, bottom-up) to SVG Y coordinate (top-down) */
  function unitToY(unit: number): number {
    return PADDING + (totalUnits - unit) * U_HEIGHT
  }

  /** Render U number labels */
  function renderLabels() {
    const labels = []
    for (let u = 1; u <= totalUnits; u++) {
      const y = unitToY(u) + U_HEIGHT / 2
      labels.push(
        <text
          key={`label-${u}`}
          x={LABEL_WIDTH - 6}
          y={y}
          textAnchor="end"
          dominantBaseline="central"
          fontSize={10}
          fill="#888"
        >
          {u}
        </text>
      )
    }
    return labels
  }

  /** Render alternating empty slot backgrounds */
  function renderEmptySlots() {
    const slots = []
    for (let u = 1; u <= totalUnits; u++) {
      const items = occupancy.get(u)
      const isEmpty = !items || items.length === 0
      const y = unitToY(u)
      slots.push(
        <rect
          key={`slot-bg-${u}`}
          x={LABEL_WIDTH}
          y={y}
          width={RACK_WIDTH}
          height={U_HEIGHT}
          fill={u % 2 === 0 ? '#1a1a2e' : '#16162a'}
          stroke="#2a2a4a"
          strokeWidth={0.5}
          className={isEmpty ? 'rack-empty-slot' : undefined}
          style={isEmpty ? { cursor: 'pointer' } : undefined}
          onClick={isEmpty ? () => onEmptySlotClick(u) : undefined}
        />
      )
    }
    return slots
  }

  /** Track which items have already been rendered (to avoid duplicates for multi-U items) */
  function renderItem(item: RackItem, isBlocker: boolean) {
    if (item.startUnit == null || item.unitHeight == null) return null

    const topY = unitToY(item.startUnit + item.unitHeight - 1)
    const height = item.unitHeight * U_HEIGHT
    const isSelected = selectedItemId === item.id
    const isShelf = item.itemType === 'SHELF'

    let x = LABEL_WIDTH
    let width = RACK_WIDTH

    if (item.halfWidth) {
      width = RACK_WIDTH / 2
      if (item.halfWidthPosition === 'RIGHT') {
        x = LABEL_WIDTH + RACK_WIDTH / 2
      }
    }

    if (isBlocker) {
      return (
        <g key={`blocker-${item.id}`} className="rack-blocker">
          <defs>
            <pattern
              id={`hatch-${item.id}`}
              width={6}
              height={6}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line x1={0} y1={0} x2={0} y2={6} stroke="#555" strokeWidth={1} />
            </pattern>
          </defs>
          <rect
            x={x + 1}
            y={topY + 1}
            width={width - 2}
            height={height - 2}
            fill={`url(#hatch-${item.id})`}
            opacity={0.5}
            rx={3}
          />
          <rect
            x={x + 1}
            y={topY + 1}
            width={width - 2}
            height={height - 2}
            fill="rgba(80, 80, 80, 0.3)"
            rx={3}
          />
          <text
            x={x + width / 2}
            y={topY + height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fill="#999"
            fontStyle="italic"
          >
            Blocked by: {item.name}
          </text>
        </g>
      )
    }

    if (isShelf) {
      return (
        <g
          key={`shelf-${item.id}`}
          className={`rack-shelf${isSelected ? ' rack-item-selected' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => onShelfClick(item)}
        >
          <rect
            x={x + 1}
            y={topY + 1}
            width={width - 2}
            height={height - 2}
            fill="rgba(60, 60, 80, 0.4)"
            stroke={item.color || '#6b7280'}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            rx={3}
          />
          <text
            x={x + 6}
            y={topY + 12}
            fontSize={9}
            fill="#aaa"
          >
            {item.name}
          </text>
          {renderShelfChildren(item, x + 4, topY + 18, width - 8, height - 22)}
        </g>
      )
    }

    // Standard mounted item
    const wStatus = warrantyStatus(item.warrantyExpiration)
    const wColor = warrantyColor(wStatus)

    return (
      <g
        key={`item-${item.id}`}
        className={`rack-item${isSelected ? ' rack-item-selected' : ''}`}
        style={{ cursor: 'pointer' }}
        onClick={() => onItemClick(item)}
      >
        <rect
          x={x + 1}
          y={topY + 1}
          width={width - 2}
          height={height - 2}
          fill={item.color || '#6b7280'}
          rx={3}
          opacity={0.9}
        />
        <text
          x={x + width / 2}
          y={topY + height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={height > 30 ? 12 : 10}
          fill={textColorForBg(item.color || '#6b7280')}
          fontWeight={500}
        >
          {item.name}
        </text>
        {wColor && (
          <circle
            cx={x + width - 10}
            cy={topY + 10}
            r={4}
            fill={wColor}
            stroke="#111"
            strokeWidth={0.5}
          />
        )}
      </g>
    )
  }

  function renderShelfChildren(shelf: RackItem, x: number, y: number, width: number, height: number) {
    const children = shelf.children || []
    if (children.length === 0) return null

    const gap = 4
    const childWidth = (width - gap * (children.length - 1)) / children.length

    return children.map((child, i) => {
      const cx = x + i * (childWidth + gap)
      const isSelected = selectedItemId === child.id
      const wStatus = warrantyStatus(child.warrantyExpiration)
      const wColor = warrantyColor(wStatus)

      return (
        <g
          key={`shelf-child-${child.id}`}
          className={`rack-item${isSelected ? ' rack-item-selected' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={e => { e.stopPropagation(); onItemClick(child) }}
        >
          <rect
            x={cx}
            y={y}
            width={childWidth}
            height={height}
            fill={child.color || '#6b7280'}
            rx={2}
            opacity={0.9}
          />
          <text
            x={cx + childWidth / 2}
            y={y + height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={9}
            fill={textColorForBg(child.color || '#6b7280')}
            fontWeight={500}
          >
            {child.name}
          </text>
          {wColor && (
            <circle
              cx={cx + childWidth - 8}
              cy={y + 8}
              r={3}
              fill={wColor}
              stroke="#111"
              strokeWidth={0.5}
            />
          )}
        </g>
      )
    })
  }

  /** Deduplicate items: only render once per item regardless of U span */
  const renderedSideItems = useMemo(() => {
    const seen = new Set<string>()
    const result: RackItem[] = []
    for (const item of sideItems) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        result.push(item)
      }
    }
    return result
  }, [sideItems])

  const renderedBlockerItems = useMemo(() => {
    const seen = new Set<string>()
    const result: RackItem[] = []
    for (const item of blockerItems) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        result.push(item)
      }
    }
    return result
  }, [blockerItems])

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      width="100%"
      style={{ maxWidth: svgWidth, fontFamily: 'inherit' }}
      className="rack-diagram"
    >
      <style>{`
        .rack-empty-slot:hover { fill: rgba(100, 100, 255, 0.15) !important; }
        .rack-item rect:hover { filter: brightness(1.2); }
        .rack-item-selected rect { stroke: #fff; stroke-width: 2; }
        .rack-shelf rect:hover { filter: brightness(1.15); }
        .rack-blocker rect:hover { filter: brightness(1.1); }
      `}</style>

      {/* Frame border */}
      <rect
        x={LABEL_WIDTH - 1}
        y={PADDING - 1}
        width={RACK_WIDTH + 2}
        height={totalUnits * U_HEIGHT + 2}
        fill="none"
        stroke="#3a3a5a"
        strokeWidth={2}
        rx={2}
      />

      {/* U labels */}
      {renderLabels()}

      {/* Empty slot backgrounds */}
      {renderEmptySlots()}

      {/* Blocker items from opposite side */}
      {renderedBlockerItems.map(item => renderItem(item, true))}

      {/* Active side items */}
      {renderedSideItems.map(item => renderItem(item, false))}
    </svg>
  )
}
