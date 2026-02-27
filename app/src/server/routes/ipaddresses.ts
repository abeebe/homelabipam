import { Router } from 'express'
import { prisma } from '../prisma'
import { writeAudit } from '../utils/audit'

const router = Router()

// Get all IP addresses
router.get('/', async (_, res) => {
  try {
    const ips = await prisma.iPAddress.findMany({
      include: { device: true, network: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(ips)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Get IP addresses by network
router.get('/network/:networkId', async (req, res) => {
  try {
    const { networkId } = req.params
    const ips = await prisma.iPAddress.findMany({
      where: { networkId },
      include: { device: true, network: true },
      orderBy: { address: 'asc' }
    })
    res.json(ips)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Get IP address by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const ip = await prisma.iPAddress.findUnique({
      where: { id },
      include: { device: true, network: true }
    })
    if (!ip) return res.status(404).json({ error: 'IP address not found' })
    res.json(ip)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Create IP address
router.post('/', async (req, res) => {
  try {
    const { address, networkId, status, description } = req.body
    if (!address || !networkId) return res.status(400).json({ error: 'Address and networkId are required' })

    const ip = await prisma.iPAddress.create({
      data: { address, networkId, status: status || 'AVAILABLE', description },
      include: { device: true, network: true }
    })

    await writeAudit({
      action: 'CREATE',
      entityType: 'IPAddress',
      entityId: ip.id,
      entityName: `${address} (${ip.network.name})`,
      changes: { address, status: ip.status, description: description ?? null, networkId },
    })

    res.status(201).json(ip)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Update IP address
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status, description } = req.body

    const before = await prisma.iPAddress.findUnique({ where: { id }, include: { network: true } })

    const ip = await prisma.iPAddress.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(description !== undefined && { description })
      },
      include: { device: true, network: true }
    })

    const changes: Record<string, unknown> = {}
    if (before) {
      if (status && status !== before.status) changes.status = { from: before.status, to: status }
      if (description !== undefined && description !== before.description) changes.description = { from: before.description, to: description }
    }

    await writeAudit({
      action: 'UPDATE',
      entityType: 'IPAddress',
      entityId: id,
      entityName: `${ip.address} (${ip.network.name})`,
      changes,
    })

    res.json(ip)
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'IP address not found' })
    res.status(500).json({ error: error.message })
  }
})

// Delete IP address
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const ip = await prisma.iPAddress.findUnique({ where: { id }, include: { network: true } })

    await prisma.iPAddress.delete({ where: { id } })

    await writeAudit({
      action: 'DELETE',
      entityType: 'IPAddress',
      entityId: id,
      entityName: ip ? `${ip.address} (${ip.network.name})` : id,
    })

    res.status(204).send()
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'IP address not found' })
    res.status(500).json({ error: error.message })
  }
})

export default router
