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