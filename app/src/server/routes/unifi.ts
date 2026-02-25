import { Router } from 'express'
import { prisma } from '../prisma'
import { testConnection, getSites, getClients, getDevices, getNetworks } from '../utils/unifi'

const router = Router()

// GET /api/unifi/status - Check connection to UniFi controller
router.get('/status', async (_req, res) => {
  try {
    const result = await testConnection()
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ connected: false, error: err.message })
  }
})

// GET /api/unifi/sites - List UniFi sites
router.get('/sites', async (_req, res) => {
  try {
    const sites = await getSites()
    res.json(sites)
  } catch (err: any) {
    res.status(503).json({ error: `Failed to reach UniFi controller: ${err.message}` })
  }
})

// POST /api/unifi/discover - Discover devices from all sites and sync to DB
router.post('/discover', async (_req, res) => {
  const results = {
    sites: 0,
    discovered: 0,
    synced: 0,
    errors: [] as string[],
  }

  try {
    const sites = await getSites()
    results.sites = sites.length

    for (const site of sites) {
      // Fetch both managed devices (APs/switches) and connected clients
      let clients: Awaited<ReturnType<typeof getClients>> = []
      let devices: Awaited<ReturnType<typeof getDevices>> = []

      try {
        [clients, devices] = await Promise.all([
          getClients(site.id),
          getDevices(site.id),
        ])
      } catch (err: any) {
        results.errors.push(`Site ${site.name}: ${err.message}`)
        continue
      }

      // Combine: clients are end-user devices, devices are APs/switches
      const allEntries = [
        ...clients.map(c => ({
          mac: c.macAddress?.toLowerCase(),
          ip: c.ipAddress,
          name: c.name || c.macAddress,
          hostname: undefined as string | undefined,
          vendor: undefined as string | undefined,
          lastSeen: c.connectedAt ? new Date(c.connectedAt).getTime() / 1000 : undefined,
        })),
        ...devices.map(d => ({
          mac: d.macAddress?.toLowerCase(),
          ip: d.ipAddress,
          name: d.name || d.model || d.macAddress,
          hostname: undefined as string | undefined,
          vendor: d.model,
          lastSeen: undefined as number | undefined,
        })),
      ].filter(e => e.mac)

      results.discovered += allEntries.length

      for (const entry of allEntries) {
        try {
          // Find existing IP address record if we have an IP
          let ipAddressId: string | null = null
          if (entry.ip) {
            const ipRecord = await prisma.iPAddress.findFirst({
              where: { address: entry.ip },
            })
            if (ipRecord) {
              ipAddressId = ipRecord.id
              // Mark IP as in use
              await prisma.iPAddress.update({
                where: { id: ipRecord.id },
                data: { status: 'IN_USE' },
              })
            }
          }

          // Upsert device by MAC address
          await prisma.device.upsert({
            where: { macAddress: entry.mac },
            create: {
              name: entry.name,
              macAddress: entry.mac,
              hostname: entry.hostname ?? null,
              vendor: entry.vendor ?? null,
              source: 'UNIFI',
              lastSeen: entry.lastSeen ? new Date(entry.lastSeen * 1000) : new Date(),
              ipAddressId,
            },
            update: {
              name: entry.name,
              hostname: entry.hostname ?? null,
              vendor: entry.vendor ?? null,
              source: 'UNIFI',
              lastSeen: entry.lastSeen ? new Date(entry.lastSeen * 1000) : new Date(),
              ...(ipAddressId && { ipAddressId }),
            },
          })

          results.synced++
        } catch (err: any) {
          results.errors.push(`Device ${entry.mac}: ${err.message}`)
        }
      }
    }

    res.json(results)
  } catch (err: any) {
    res.status(503).json({ error: `Failed to reach UniFi controller: ${err.message}`, results })
  }
})

// POST /api/unifi/sync - Full sync: networks, IP addresses, and devices
router.post('/sync', async (_req, res) => {
  const results = {
    sites: 0,
    networks: { created: 0, updated: 0 },
    ipAddresses: { created: 0, updated: 0 },
    devices: { synced: 0 },
    errors: [] as string[],
  }

  try {
    const sites = await getSites()
    results.sites = sites.length

    for (const site of sites) {
      let unifiNetworks: Awaited<ReturnType<typeof getNetworks>> = []
      let clients: Awaited<ReturnType<typeof getClients>> = []
      let devices: Awaited<ReturnType<typeof getDevices>> = []

      try {
        [unifiNetworks, clients, devices] = await Promise.all([
          getNetworks(site.id),
          getClients(site.id),
          getDevices(site.id),
        ])
      } catch (err: any) {
        results.errors.push(`Site ${site.name}: ${err.message}`)
        continue
      }

      // Collect all IPs from clients + devices (private IPs only)
      const allIPs = [
        ...clients.filter(c => c.ipAddress).map(c => ({ mac: c.macAddress?.toLowerCase(), ip: c.ipAddress! })),
        ...devices.filter(d => d.ipAddress && !d.ipAddress.startsWith('73.')).map(d => ({ mac: d.macAddress?.toLowerCase(), ip: d.ipAddress! })),
      ]

      // Group into /24 subnets: "10.10.1" -> [ips...]
      const subnetGroups = new Map<string, typeof allIPs>()
      for (const entry of allIPs) {
        const prefix = entry.ip.split('.').slice(0, 3).join('.')
        if (!subnetGroups.has(prefix)) subnetGroups.set(prefix, [])
        subnetGroups.get(prefix)!.push(entry)
      }

      // Upsert networks and build prefix -> DB network ID map
      const prefixToNetworkId = new Map<string, string>()

      for (const [prefix, _] of subnetGroups) {
        const cidr = `${prefix}.0/24`
        const gateway = `${prefix}.1`
        const thirdOctet = parseInt(prefix.split('.')[2])
        const matched = unifiNetworks.find(n => n.vlanId === thirdOctet)
        const name = matched?.name ?? cidr
        const vlanId = matched?.vlanId ?? null

        try {
          let network = await prisma.network.findFirst({ where: { cidr } })
          if (!network) {
            network = await prisma.network.create({ data: { name, cidr, gateway, vlanId } })
            results.networks.created++
          } else {
            network = await prisma.network.update({ where: { id: network.id }, data: { name, vlanId } })
            results.networks.updated++
          }
          prefixToNetworkId.set(prefix, network.id)
        } catch (err: any) {
          results.errors.push(`Network ${cidr}: ${err.message}`)
        }
      }

      // Upsert IP addresses and link to devices
      for (const { mac, ip } of allIPs) {
        const prefix = ip.split('.').slice(0, 3).join('.')
        const networkId = prefixToNetworkId.get(prefix)
        if (!networkId) continue

        try {
          let ipRecord = await prisma.iPAddress.findFirst({ where: { address: ip } })
          if (!ipRecord) {
            ipRecord = await prisma.iPAddress.create({ data: { address: ip, networkId, status: 'IN_USE' } })
            results.ipAddresses.created++
          } else {
            ipRecord = await prisma.iPAddress.update({ where: { id: ipRecord.id }, data: { status: 'IN_USE', networkId } })
            results.ipAddresses.updated++
          }

          // Link to device if we have a matching MAC
          if (mac) {
            const device = await prisma.device.findUnique({ where: { macAddress: mac } })
            if (device && device.ipAddressId !== ipRecord.id) {
              await prisma.device.update({ where: { macAddress: mac }, data: { ipAddressId: ipRecord.id } })
            }
          }
        } catch (err: any) {
          results.errors.push(`IP ${ip}: ${err.message}`)
        }
      }

      // Sync devices (upsert by MAC)
      const allEntries = [
        ...clients.map(c => ({
          mac: c.macAddress?.toLowerCase(),
          ip: c.ipAddress,
          name: c.name || c.macAddress,
          vendor: undefined as string | undefined,
          lastSeen: c.connectedAt ? new Date(c.connectedAt).getTime() / 1000 : undefined,
        })),
        ...devices.map(d => ({
          mac: d.macAddress?.toLowerCase(),
          ip: d.ipAddress,
          name: d.name || d.model || d.macAddress,
          vendor: d.model,
          lastSeen: undefined as number | undefined,
        })),
      ].filter(e => e.mac)

      for (const entry of allEntries) {
        try {
          const ipRecord = entry.ip ? await prisma.iPAddress.findFirst({ where: { address: entry.ip } }) : null
          await prisma.device.upsert({
            where: { macAddress: entry.mac },
            create: {
              name: entry.name,
              macAddress: entry.mac,
              vendor: entry.vendor ?? null,
              source: 'UNIFI',
              lastSeen: entry.lastSeen ? new Date(entry.lastSeen * 1000) : new Date(),
              ipAddressId: ipRecord?.id ?? null,
            },
            update: {
              name: entry.name,
              vendor: entry.vendor ?? null,
              source: 'UNIFI',
              lastSeen: entry.lastSeen ? new Date(entry.lastSeen * 1000) : new Date(),
              ...(ipRecord && { ipAddressId: ipRecord.id }),
            },
          })
          results.devices.synced++
        } catch (err: any) {
          results.errors.push(`Device ${entry.mac}: ${err.message}`)
        }
      }
    }

    res.json(results)
  } catch (err: any) {
    res.status(503).json({ error: `Failed to reach UniFi controller: ${err.message}`, results })
  }
})

// GET /api/unifi/devices - List all devices synced from UniFi
router.get('/devices', async (_req, res) => {
  try {
    const devices = await prisma.device.findMany({
      where: { source: 'UNIFI' },
      include: { ipAddress: { include: { network: true } } },
      orderBy: { lastSeen: 'desc' },
    })
    res.json(devices)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
