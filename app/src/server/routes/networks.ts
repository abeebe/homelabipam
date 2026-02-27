import { Router } from 'express'
import { prisma } from '../prisma'

const router = Router()

// Get all networks
router.get('/', async (_, res) => {
  try {
    const networks = await prisma.network.findMany({
      include: {
        ipAddresses: true
      }
    })
    res.json(networks)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Get network by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const network = await prisma.network.findUnique({
      where: { id },
      include: {
        ipAddresses: {
          include: { device: true }
        }
      }
    })

    if (!network) {
      return res.status(404).json({ error: 'Network not found' })
    }

    res.json(network)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Create network
router.post('/', async (req, res) => {
  try {
    const { name, vlanId, cidr, gateway, description } = req.body

    if (!name || !cidr) {
      return res.status(400).json({ error: 'Name and CIDR are required' })
    }

    const network = await prisma.network.create({
      data: {
        name,
        vlanId: vlanId ? parseInt(vlanId) : undefined,
        cidr,
        gateway,
        description
      }
    })

    res.status(201).json(network)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Update network
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, vlanId, cidr, gateway, description } = req.body

    const network = await prisma.network.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(vlanId !== undefined && { vlanId: vlanId ? parseInt(vlanId) : null }),
        ...(cidr && { cidr }),
        ...(gateway !== undefined && { gateway }),
        ...(description !== undefined && { description })
      },
      include: {
        ipAddresses: true
      }
    })

    res.json(network)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Network not found' })
    }
    res.status(500).json({ error: error.message })
  }
})

// POST /api/networks/:id/populate - Create all host IPs in the subnet as AVAILABLE
router.post('/:id/populate', async (req, res) => {
  try {
    const { id } = req.params
    const network = await prisma.network.findUnique({ where: { id } })
    if (!network) return res.status(404).json({ error: 'Network not found' })

    const [ipStr, prefixStr] = network.cidr.split('/')
    const prefix = parseInt(prefixStr)
    if (prefix < 20) return res.status(400).json({ error: 'Network too large to auto-populate (use /20 or smaller)' })

    const ipToNum = (ip: string) =>
      ip.split('.').reduce((acc: number, o: string) => (acc * 256) + parseInt(o), 0)
    const numToIP = (n: number) =>
      [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join('.')

    const mask = (~0 << (32 - prefix)) >>> 0
    const networkNum = (ipToNum(ipStr) & mask) >>> 0
    const broadcast = (networkNum | (~mask >>> 0)) >>> 0
    const first = networkNum + 1
    const last = broadcast - 1

    // Fetch existing IPs in one query
    const existing = await prisma.iPAddress.findMany({
      where: { networkId: id },
      select: { address: true },
    })
    const existingSet = new Set(existing.map(ip => ip.address))

    // Build list of missing host IPs
    const toCreate: { address: string; networkId: string; status: 'AVAILABLE' }[] = []
    for (let i = first; i <= last; i++) {
      const address = numToIP(i)
      if (!existingSet.has(address)) {
        toCreate.push({ address, networkId: id, status: 'AVAILABLE' })
      }
    }

    if (toCreate.length > 0) {
      await prisma.iPAddress.createMany({ data: toCreate })
    }

    res.json({ created: toCreate.length, existing: existingSet.size, total: last - first + 1 })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Delete network
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    await prisma.network.delete({
      where: { id }
    })

    res.status(204).send()
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Network not found' })
    }
    res.status(500).json({ error: error.message })
  }
})

export default router