import { Router } from 'express'
import { prisma } from '../prisma'
import { writeAudit } from '../utils/audit'
import { checkCollision, type ExistingItem } from '../utils/rackCollision'

const router = Router()

const RACK_ITEM_INCLUDE = {
  device: { include: { ipAddress: true } },
  children: { include: { device: { include: { ipAddress: true } } } },
}

// Helper: compute utilization from items
function computeUtilization(items: any[], totalUnits: number) {
  let frontUsed = 0
  let backUsed = 0
  let zeroUCount = 0
  for (const item of items) {
    if (item.itemType === 'ZERO_U') { zeroUCount++; continue }
    if (item.itemType === 'SHELF_ITEM') continue
    const height = item.unitHeight ?? 0
    if (item.side === 'FRONT') frontUsed += height
    else if (item.side === 'BACK') backUsed += height
  }
  return { frontUsed, backUsed, zeroUCount }
}

// Helper: validate item placement
function validatePlacement(
  body: any,
  totalUnits: number,
): { error?: string } {
  const { startUnit, unitHeight, side, itemType, fullDepth, halfWidth, halfWidthPosition } = body

  if (itemType === 'ZERO_U') {
    if (startUnit != null || unitHeight != null) return { error: 'Zero-U items must not specify startUnit or unitHeight' }
    if (fullDepth) return { error: 'Zero-U items cannot be full-depth' }
    if (halfWidth) return { error: 'Zero-U items cannot be half-width' }
    return {}
  }

  if (startUnit == null || startUnit < 1) return { error: 'Starting U must be >= 1' }
  if (unitHeight == null || unitHeight < 1) return { error: 'Unit height must be >= 1' }
  if (!['FRONT', 'BACK'].includes(side)) return { error: 'Side must be FRONT or BACK' }

  if (itemType === 'MOUNTED' && unitHeight > 16) return { error: 'Mounted items cannot exceed 16U' }
  if (startUnit + unitHeight - 1 > totalUnits) {
    return { error: `Item would exceed rack height (U${startUnit}-U${startUnit + unitHeight - 1} in a ${totalUnits}U rack)` }
  }

  if (halfWidth) {
    if (fullDepth) return { error: 'Half-width items cannot be full-depth' }
    if (unitHeight !== 1) return { error: 'Half-width items must be 1U' }
    if (!['LEFT', 'RIGHT'].includes(halfWidthPosition)) return { error: 'Half-width items must specify position (LEFT or RIGHT)' }
    if (itemType === 'SHELF') return { error: 'Shelves cannot be half-width' }
  }

  return {}
}

// ── Rack CRUD ──────────────────────────────────────────

// GET /api/racks — list all racks
router.get('/', async (_, res) => {
  try {
    const racks = await prisma.rack.findMany({
      include: { items: true },
      orderBy: { name: 'asc' },
    })
    const result = racks.map(rack => ({
      ...rack,
      ...computeUtilization(rack.items, rack.totalUnits),
    }))
    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/racks/search/assets — search by serial number or asset tag
router.get('/search/assets', async (req, res) => {
  try {
    const q = (req.query.q as string) || ''
    if (!q.trim()) return res.json([])
    const items = await prisma.rackItem.findMany({
      where: {
        OR: [
          { serialNumber: { contains: q, mode: 'insensitive' } },
          { assetTag: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: { rack: true, device: { include: { ipAddress: true } } },
    })
    res.json(items)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/racks/:id — get rack with all items
router.get('/:id', async (req, res) => {
  try {
    const rack = await prisma.rack.findUnique({
      where: { id: req.params.id },
      include: { items: { include: RACK_ITEM_INCLUDE } },
    })
    if (!rack) return res.status(404).json({ error: 'Rack not found' })
    res.json({ ...rack, ...computeUtilization(rack.items, rack.totalUnits) })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/racks — create rack
router.post('/', async (req, res) => {
  try {
    const { name, totalUnits, location, description } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })
    if (!totalUnits || totalUnits < 4 || totalUnits > 48) {
      return res.status(400).json({ error: 'Total units must be between 4 and 48' })
    }

    const rack = await prisma.rack.create({
      data: { name, totalUnits: parseInt(totalUnits), location, description },
    })

    await writeAudit({
      action: 'CREATE',
      entityType: 'Rack',
      entityId: rack.id,
      entityName: `${name} (${totalUnits}U)`,
      changes: { name, totalUnits, location, description },
    })

    res.status(201).json(rack)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/racks/:id — update rack
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, totalUnits, location, description } = req.body

    const before = await prisma.rack.findUnique({ where: { id } })
    if (!before) return res.status(404).json({ error: 'Rack not found' })

    // Prevent shrinking below highest occupied U
    if (totalUnits && totalUnits < before.totalUnits) {
      const highest = await prisma.rackItem.findFirst({
        where: { rackId: id, itemType: { notIn: ['ZERO_U', 'SHELF_ITEM'] }, startUnit: { not: null } },
        orderBy: { startUnit: 'desc' },
      })
      if (highest && highest.startUnit != null && highest.unitHeight != null) {
        const maxOccupied = highest.startUnit + highest.unitHeight - 1
        if (totalUnits < maxOccupied) {
          return res.status(400).json({
            error: `Cannot reduce to ${totalUnits}U — items exist above U${totalUnits}`,
          })
        }
      }
    }

    const rack = await prisma.rack.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(totalUnits && { totalUnits: parseInt(totalUnits) }),
        ...(location !== undefined && { location }),
        ...(description !== undefined && { description }),
      },
      include: { items: true },
    })

    const changes: Record<string, unknown> = {}
    if (name && name !== before.name) changes.name = { from: before.name, to: name }
    if (totalUnits && totalUnits !== before.totalUnits) changes.totalUnits = { from: before.totalUnits, to: totalUnits }
    if (location !== undefined && location !== before.location) changes.location = { from: before.location, to: location }
    if (description !== undefined && description !== before.description) changes.description = { from: before.description, to: description }

    await writeAudit({
      action: 'UPDATE',
      entityType: 'Rack',
      entityId: id,
      entityName: `${rack.name} (${rack.totalUnits}U)`,
      changes,
    })

    res.json(rack)
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Rack not found' })
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/racks/:id — delete rack and all items
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const rack = await prisma.rack.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!rack) return res.status(404).json({ error: 'Rack not found' })

    // Unlink all devices from rack items
    const linkedItems = rack.items.filter(i => i.deviceId)
    for (const item of linkedItems) {
      await prisma.rackItem.update({ where: { id: item.id }, data: { deviceId: null } })
    }

    // Delete children (shelf items) first, then all items, then rack
    await prisma.rackItem.deleteMany({ where: { rackId: id, parentId: { not: null } } })
    await prisma.rackItem.deleteMany({ where: { rackId: id } })
    await prisma.rack.delete({ where: { id } })

    await writeAudit({
      action: 'DELETE',
      entityType: 'Rack',
      entityId: id,
      entityName: `${rack.name} (${rack.totalUnits}U)`,
      changes: { itemsDeleted: rack.items.length },
    })

    res.status(204).send()
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Rack not found' })
    res.status(500).json({ error: error.message })
  }
})

// ── Rack Item endpoints ────────────────────────────────

// POST /api/racks/:id/items — add item (MOUNTED, SHELF, or ZERO_U)
router.post('/:id/items', async (req, res) => {
  try {
    const rack = await prisma.rack.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    })
    if (!rack) return res.status(404).json({ error: 'Rack not found' })

    const { name, startUnit, unitHeight, side, itemType, color, description,
      fullDepth, halfWidth, halfWidthPosition,
      serialNumber, assetTag, purchaseDate, warrantyExpiration,
      deviceId } = req.body

    if (!name) return res.status(400).json({ error: 'Name is required' })

    const type = itemType || 'MOUNTED'
    if (!['MOUNTED', 'SHELF', 'ZERO_U'].includes(type)) {
      return res.status(400).json({ error: 'Item type must be MOUNTED, SHELF, or ZERO_U' })
    }

    const validation = validatePlacement(
      { startUnit, unitHeight, side, itemType: type, fullDepth, halfWidth, halfWidthPosition },
      rack.totalUnits,
    )
    if (validation.error) return res.status(400).json({ error: validation.error })

    // Collision detection for positioned items
    if (type !== 'ZERO_U') {
      const existing: ExistingItem[] = rack.items.map(i => ({
        id: i.id, name: i.name, startUnit: i.startUnit, unitHeight: i.unitHeight,
        side: i.side, itemType: i.itemType, fullDepth: i.fullDepth,
        halfWidth: i.halfWidth, halfWidthPosition: i.halfWidthPosition,
      }))
      const collision = checkCollision(existing, {
        startUnit, unitHeight: unitHeight ?? 1, side, fullDepth: !!fullDepth,
        halfWidth: !!halfWidth, halfWidthPosition: halfWidthPosition ?? null,
      })
      if (collision.conflict) return res.status(409).json({ error: collision.message })
    }

    // Validate device isn't already linked to another rack item
    if (deviceId) {
      const existingLink = await prisma.rackItem.findUnique({ where: { deviceId } })
      if (existingLink) return res.status(400).json({ error: 'Device is already linked to another rack item' })
    }

    const item = await prisma.rackItem.create({
      data: {
        name,
        startUnit: type === 'ZERO_U' ? null : startUnit,
        unitHeight: type === 'ZERO_U' ? null : (unitHeight ?? 1),
        side: type === 'ZERO_U' ? null : (side || 'FRONT'),
        itemType: type,
        color: color || '#3b82f6',
        description,
        fullDepth: !!fullDepth,
        halfWidth: !!halfWidth,
        halfWidthPosition: halfWidth ? halfWidthPosition : null,
        serialNumber, assetTag,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        warrantyExpiration: warrantyExpiration ? new Date(warrantyExpiration) : null,
        rackId: rack.id,
        deviceId: deviceId || null,
      },
      include: RACK_ITEM_INCLUDE,
    })

    const uRange = type === 'ZERO_U' ? 'Side Rail' : `U${startUnit}-U${startUnit + (unitHeight ?? 1) - 1}`
    await writeAudit({
      action: 'CREATE',
      entityType: 'RackItem',
      entityId: item.id,
      entityName: `${name} (${uRange}, ${rack.name})`,
      changes: { name, startUnit, unitHeight, side, itemType: type, fullDepth, halfWidth },
    })

    res.status(201).json(item)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/racks/:rackId/items/:itemId/children — add shelf item
router.post('/:rackId/items/:itemId/children', async (req, res) => {
  try {
    const shelf = await prisma.rackItem.findUnique({
      where: { id: req.params.itemId },
    })
    if (!shelf) return res.status(404).json({ error: 'Shelf not found' })
    if (shelf.rackId !== req.params.rackId) return res.status(400).json({ error: 'Shelf does not belong to this rack' })
    if (shelf.itemType !== 'SHELF') return res.status(400).json({ error: 'Parent item is not a shelf' })

    const { name, color, description, serialNumber, assetTag, purchaseDate, warrantyExpiration, deviceId } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })

    if (deviceId) {
      const existingLink = await prisma.rackItem.findUnique({ where: { deviceId } })
      if (existingLink) return res.status(400).json({ error: 'Device is already linked to another rack item' })
    }

    const item = await prisma.rackItem.create({
      data: {
        name,
        itemType: 'SHELF_ITEM',
        color: color || '#3b82f6',
        description,
        startUnit: null,
        unitHeight: null,
        side: null,
        serialNumber, assetTag,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        warrantyExpiration: warrantyExpiration ? new Date(warrantyExpiration) : null,
        rackId: shelf.rackId,
        parentId: shelf.id,
        deviceId: deviceId || null,
      },
      include: RACK_ITEM_INCLUDE,
    })

    const rack = await prisma.rack.findUnique({ where: { id: shelf.rackId } })
    await writeAudit({
      action: 'CREATE',
      entityType: 'RackItem',
      entityId: item.id,
      entityName: `${name} (on shelf '${shelf.name}', ${rack?.name ?? 'unknown rack'})`,
      changes: { name, parentId: shelf.id, shelfName: shelf.name },
    })

    res.status(201).json(item)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/racks/:rackId/items/:itemId — update item details
router.put('/:rackId/items/:itemId', async (req, res) => {
  try {
    const before = await prisma.rackItem.findUnique({ where: { id: req.params.itemId } })
    if (!before) return res.status(404).json({ error: 'Item not found' })
    if (before.rackId !== req.params.rackId) return res.status(400).json({ error: 'Item does not belong to this rack' })

    const { name, color, description, serialNumber, assetTag, purchaseDate, warrantyExpiration, deviceId } = req.body

    if (deviceId && deviceId !== before.deviceId) {
      const existingLink = await prisma.rackItem.findUnique({ where: { deviceId } })
      if (existingLink && existingLink.id !== before.id) {
        return res.status(400).json({ error: 'Device is already linked to another rack item' })
      }
    }

    const item = await prisma.rackItem.update({
      where: { id: req.params.itemId },
      data: {
        ...(name && { name }),
        ...(color && { color }),
        ...(description !== undefined && { description }),
        ...(serialNumber !== undefined && { serialNumber }),
        ...(assetTag !== undefined && { assetTag }),
        ...(purchaseDate !== undefined && { purchaseDate: purchaseDate ? new Date(purchaseDate) : null }),
        ...(warrantyExpiration !== undefined && { warrantyExpiration: warrantyExpiration ? new Date(warrantyExpiration) : null }),
        ...(deviceId !== undefined && { deviceId: deviceId || null }),
      },
      include: RACK_ITEM_INCLUDE,
    })

    const changes: Record<string, unknown> = {}
    if (name && name !== before.name) changes.name = { from: before.name, to: name }
    if (color && color !== before.color) changes.color = { from: before.color, to: color }
    if (deviceId !== undefined && deviceId !== before.deviceId) changes.deviceId = { from: before.deviceId, to: deviceId }

    await writeAudit({
      action: 'UPDATE',
      entityType: 'RackItem',
      entityId: item.id,
      entityName: item.name,
      changes,
    })

    res.json(item)
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Item not found' })
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/racks/:rackId/items/:itemId/move — move item to new position
router.put('/:rackId/items/:itemId/move', async (req, res) => {
  try {
    const item = await prisma.rackItem.findUnique({ where: { id: req.params.itemId } })
    if (!item) return res.status(404).json({ error: 'Item not found' })
    if (item.rackId !== req.params.rackId) return res.status(400).json({ error: 'Item does not belong to this rack' })
    if (item.itemType === 'ZERO_U' || item.itemType === 'SHELF_ITEM') {
      return res.status(400).json({ error: 'Cannot move zero-U or shelf items' })
    }

    const rack = await prisma.rack.findUnique({
      where: { id: req.params.rackId },
      include: { items: true },
    })
    if (!rack) return res.status(404).json({ error: 'Rack not found' })

    const { startUnit, side, halfWidthPosition } = req.body
    const unitHeight = item.unitHeight ?? 1

    if (startUnit == null || startUnit < 1) return res.status(400).json({ error: 'Starting U must be >= 1' })
    if (!['FRONT', 'BACK'].includes(side)) return res.status(400).json({ error: 'Side must be FRONT or BACK' })
    if (startUnit + unitHeight - 1 > rack.totalUnits) {
      return res.status(400).json({ error: `Item would exceed rack height` })
    }

    const existing: ExistingItem[] = rack.items.map(i => ({
      id: i.id, name: i.name, startUnit: i.startUnit, unitHeight: i.unitHeight,
      side: i.side, itemType: i.itemType, fullDepth: i.fullDepth,
      halfWidth: i.halfWidth, halfWidthPosition: i.halfWidthPosition,
    }))

    const collision = checkCollision(existing, {
      startUnit, unitHeight, side,
      fullDepth: item.fullDepth,
      halfWidth: item.halfWidth,
      halfWidthPosition: halfWidthPosition ?? item.halfWidthPosition,
      excludeItemId: item.id,
    })
    if (collision.conflict) return res.status(409).json({ error: collision.message })

    const beforePos = { startUnit: item.startUnit, side: item.side }
    const updated = await prisma.rackItem.update({
      where: { id: item.id },
      data: {
        startUnit,
        side,
        ...(halfWidthPosition !== undefined && { halfWidthPosition }),
      },
      include: RACK_ITEM_INCLUDE,
    })

    await writeAudit({
      action: 'MOVE',
      entityType: 'RackItem',
      entityId: item.id,
      entityName: item.name,
      changes: {
        startUnit: { from: beforePos.startUnit, to: startUnit },
        side: { from: beforePos.side, to: side },
      },
    })

    res.json(updated)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/racks/:rackId/items/:itemId — remove item
router.delete('/:rackId/items/:itemId', async (req, res) => {
  try {
    const item = await prisma.rackItem.findUnique({
      where: { id: req.params.itemId },
      include: { children: true },
    })
    if (!item) return res.status(404).json({ error: 'Item not found' })
    if (item.rackId !== req.params.rackId) return res.status(400).json({ error: 'Item does not belong to this rack' })

    // If shelf, unlink devices from children and delete children first
    if (item.itemType === 'SHELF' && item.children.length > 0) {
      for (const child of item.children) {
        if (child.deviceId) {
          await prisma.rackItem.update({ where: { id: child.id }, data: { deviceId: null } })
        }
      }
      await prisma.rackItem.deleteMany({ where: { parentId: item.id } })
    }

    // Unlink device if linked
    if (item.deviceId) {
      await prisma.rackItem.update({ where: { id: item.id }, data: { deviceId: null } })
    }

    await prisma.rackItem.delete({ where: { id: item.id } })

    const rack = await prisma.rack.findUnique({ where: { id: req.params.rackId } })
    await writeAudit({
      action: 'DELETE',
      entityType: 'RackItem',
      entityId: item.id,
      entityName: `${item.name} (${rack?.name ?? 'unknown rack'})`,
      changes: item.itemType === 'SHELF' ? { childrenDeleted: item.children.length } : undefined,
    })

    res.status(204).send()
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Item not found' })
    res.status(500).json({ error: error.message })
  }
})

export default router
