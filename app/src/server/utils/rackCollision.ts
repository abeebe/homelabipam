export interface ExistingItem {
  id: string
  name: string
  startUnit: number | null
  unitHeight: number | null
  side: 'FRONT' | 'BACK' | null
  itemType: string
  fullDepth: boolean
  halfWidth: boolean
  halfWidthPosition: 'LEFT' | 'RIGHT' | null
}

export interface PlacementRequest {
  startUnit: number
  unitHeight: number
  side: 'FRONT' | 'BACK'
  fullDepth: boolean
  halfWidth: boolean
  halfWidthPosition: 'LEFT' | 'RIGHT' | null
  excludeItemId?: string
}

export interface CollisionResult {
  conflict: boolean
  message?: string
  conflictingItem?: ExistingItem
}

function rangesOverlap(
  aStart: number, aHeight: number,
  bStart: number, bHeight: number,
): boolean {
  const aEnd = aStart + aHeight - 1
  const bEnd = bStart + bHeight - 1
  return aStart <= bEnd && bStart <= aEnd
}

export function checkCollision(
  existingItems: ExistingItem[],
  placement: PlacementRequest,
): CollisionResult {
  for (const item of existingItems) {
    // Skip non-positional items
    if (item.itemType === 'ZERO_U' || item.itemType === 'SHELF_ITEM') continue
    if (item.startUnit == null || item.unitHeight == null || item.side == null) continue

    // Skip the item being moved
    if (placement.excludeItemId && item.id === placement.excludeItemId) continue

    const uOverlap = rangesOverlap(
      placement.startUnit, placement.unitHeight,
      item.startUnit, item.unitHeight,
    )
    if (!uOverlap) continue

    const sameSide = item.side === placement.side
    const oppositeSide = item.side !== placement.side

    // Same-side collision
    if (sameSide) {
      // Both half-width: only collide if same position
      if (placement.halfWidth && item.halfWidth) {
        if (placement.halfWidthPosition === item.halfWidthPosition) {
          return {
            conflict: true,
            message: `Conflict: U${item.startUnit} ${item.halfWidthPosition} (${item.side}) is occupied by '${item.name}'`,
            conflictingItem: item,
          }
        }
        // Different halves, no collision
        continue
      }

      // One half-width, one full-width: collision
      if (placement.halfWidth || item.halfWidth) {
        return {
          conflict: true,
          message: `Conflict: U${item.startUnit} (${item.side}) is ${item.halfWidth ? 'partially' : 'fully'} occupied by '${item.name}'`,
          conflictingItem: item,
        }
      }

      // Both full-width on same side
      return {
        conflict: true,
        message: `Conflict: U${item.startUnit} (${item.side}) is occupied by '${item.name}'`,
        conflictingItem: item,
      }
    }

    // Opposite-side collision only matters for full-depth
    if (oppositeSide) {
      if (item.fullDepth) {
        return {
          conflict: true,
          message: `Conflict: U${item.startUnit} (${placement.side}) is blocked by full-depth item '${item.name}' (${item.side})`,
          conflictingItem: item,
        }
      }
      if (placement.fullDepth) {
        return {
          conflict: true,
          message: `Conflict: U${item.startUnit} (${item.side}) is occupied by '${item.name}' — full-depth placement would overlap`,
          conflictingItem: item,
        }
      }
    }
  }

  return { conflict: false }
}
