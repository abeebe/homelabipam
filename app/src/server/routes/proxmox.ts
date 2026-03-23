import { Router } from 'express'
import { testConnection, getNodes, getNodeVMs, syncAll } from '../utils/proxmox'
import { writeAudit } from '../utils/audit'
import { prisma } from '../prisma'

const router = Router()

// Test Proxmox connection
router.get('/status', async (_, res) => {
  const result = await testConnection()
  res.json(result)
})

// List Proxmox nodes
router.get('/nodes', async (_, res) => {
  try {
    const nodes = await getNodes()
    res.json(nodes)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// List VMs for a node
router.get('/nodes/:node/vms', async (req, res) => {
  try {
    const vms = await getNodeVMs(req.params.node)
    res.json(vms)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Get all Proxmox-sourced devices
router.get('/devices', async (_, res) => {
  const devices = await prisma.device.findMany({
    where: { source: 'PROXMOX' },
    include: { ipAddress: true },
    orderBy: [
      { proxmoxType: 'asc' },
      { proxmoxNodeName: 'asc' },
      { name: 'asc' },
    ],
  })
  res.json(devices)
})

// Full sync — discover nodes, VMs, containers, link IPs
router.post('/sync', async (_, res) => {
  try {
    const result = await syncAll()

    await writeAudit({
      action: 'SYNC',
      entityType: 'Device',
      entityName: 'Proxmox',
      changes: { ...result },
      source: 'USER',
    })

    res.json({
      ok: true,
      message: `Synced ${result.nodesCreated + result.nodesUpdated} nodes, ${result.vmsCreated + result.vmsUpdated} VMs/containers. ${result.ipsLinked} IPs linked.`,
      ...result,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
