import axios, { AxiosInstance } from 'axios'
import https from 'https'
import { prisma } from '../prisma'

// Proxmox VE REST API client
// Auth: PVEAPIToken=USER@REALM!TOKENID=SECRET

export interface ProxmoxNode {
  node: string
  status: string
  ip?: string
  cpu?: number
  maxcpu?: number
  mem?: number
  maxmem?: number
  uptime?: number
}

export interface ProxmoxVM {
  vmid: number
  name: string
  status: string
  type: 'qemu' | 'lxc'
  node: string
  cpus?: number
  maxmem?: number
  mem?: number
  netin?: number
  netout?: number
}

export interface ProxmoxVMConfig {
  net0?: string
  ipconfig0?: string
  [key: string]: unknown
}

export interface ProxmoxSyncResult {
  nodesCreated: number
  nodesUpdated: number
  vmsCreated: number
  vmsUpdated: number
  ipsLinked: number
}

async function getSettings(): Promise<{ url: string; tokenId: string; tokenSecret: string }> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ['PROXMOX_URL', 'PROXMOX_TOKEN_ID', 'PROXMOX_TOKEN_SECRET'] } },
  })

  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value || ''

  return {
    url: map.PROXMOX_URL || process.env.PROXMOX_URL || '',
    tokenId: map.PROXMOX_TOKEN_ID || process.env.PROXMOX_TOKEN_ID || '',
    tokenSecret: map.PROXMOX_TOKEN_SECRET || process.env.PROXMOX_TOKEN_SECRET || '',
  }
}

function createClient(url: string, tokenId: string, tokenSecret: string): AxiosInstance {
  return axios.create({
    baseURL: url.replace(/\/$/, ''),
    headers: {
      Authorization: `PVEAPIToken=${tokenId}=${tokenSecret}`,
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    timeout: 15000,
  })
}

export async function testConnection(): Promise<{ success: boolean; version?: string; error?: string }> {
  try {
    const settings = await getSettings()
    if (!settings.url || !settings.tokenId || !settings.tokenSecret) {
      return { success: false, error: 'Proxmox credentials not configured' }
    }
    const client = createClient(settings.url, settings.tokenId, settings.tokenSecret)
    const res = await client.get('/api2/json/version')
    return { success: true, version: res.data?.data?.version }
  } catch (err: any) {
    return { success: false, error: err.message || 'Connection failed' }
  }
}

export async function getNodes(): Promise<ProxmoxNode[]> {
  const settings = await getSettings()
  const client = createClient(settings.url, settings.tokenId, settings.tokenSecret)
  const res = await client.get('/api2/json/nodes')
  return res.data?.data || []
}

export async function getNodeVMs(node: string): Promise<ProxmoxVM[]> {
  const settings = await getSettings()
  const client = createClient(settings.url, settings.tokenId, settings.tokenSecret)

  const [qemu, lxc] = await Promise.all([
    client.get(`/api2/json/nodes/${node}/qemu`).catch(() => ({ data: { data: [] } })),
    client.get(`/api2/json/nodes/${node}/lxc`).catch(() => ({ data: { data: [] } })),
  ])

  const vms: ProxmoxVM[] = [
    ...(qemu.data?.data || []).map((v: any) => ({ ...v, type: 'qemu' as const, node })),
    ...(lxc.data?.data || []).map((v: any) => ({ ...v, type: 'lxc' as const, node })),
  ]

  return vms
}

export async function getVMConfig(node: string, vmid: number, type: 'qemu' | 'lxc'): Promise<ProxmoxVMConfig> {
  const settings = await getSettings()
  const client = createClient(settings.url, settings.tokenId, settings.tokenSecret)
  const endpoint = type === 'qemu' ? 'qemu' : 'lxc'
  const res = await client.get(`/api2/json/nodes/${node}/${endpoint}/${vmid}/config`)
  return res.data?.data || {}
}

/** Extract IP from Proxmox VM config (net0 or ipconfig0) */
export function extractIPFromConfig(config: ProxmoxVMConfig): string | null {
  // Try ipconfig0 first (cloud-init style): ip=10.10.1.51/24,gw=10.10.1.1
  if (config.ipconfig0) {
    const match = String(config.ipconfig0).match(/ip=(\d+\.\d+\.\d+\.\d+)/)
    if (match) return match[1]
  }

  // Check all net interfaces for IP info
  for (const [key, val] of Object.entries(config)) {
    if (key.startsWith('net') && typeof val === 'string') {
      const match = val.match(/ip=(\d+\.\d+\.\d+\.\d+)/)
      if (match) return match[1]
    }
  }

  return null
}

export async function syncAll(): Promise<ProxmoxSyncResult> {
  const result: ProxmoxSyncResult = {
    nodesCreated: 0,
    nodesUpdated: 0,
    vmsCreated: 0,
    vmsUpdated: 0,
    ipsLinked: 0,
  }

  const nodes = await getNodes()

  for (const node of nodes) {
    // Create/update node device
    const existing = await prisma.device.findFirst({
      where: { source: 'PROXMOX', proxmoxType: 'node', name: node.node },
    })

    if (existing) {
      await prisma.device.update({
        where: { id: existing.id },
        data: {
          hostname: node.node,
          lastSeen: new Date(),
        },
      })
      result.nodesUpdated++
    } else {
      await prisma.device.create({
        data: {
          name: node.node,
          hostname: node.node,
          source: 'PROXMOX',
          proxmoxType: 'node',
          proxmoxNodeName: node.node,
          lastSeen: new Date(),
        },
      })
      result.nodesCreated++
    }

    // Get VMs for this node
    const vms = await getNodeVMs(node.node)

    for (const vm of vms) {
      // Get VM config for IP extraction
      let ip: string | null = null
      try {
        const config = await getVMConfig(node.node, vm.vmid, vm.type)
        ip = extractIPFromConfig(config)
      } catch {
        // Config fetch failed, skip IP
      }

      const existingVM = await prisma.device.findFirst({
        where: { source: 'PROXMOX', proxmoxVmId: vm.vmid, proxmoxNodeName: node.node },
      })

      let deviceId: string
      if (existingVM) {
        await prisma.device.update({
          where: { id: existingVM.id },
          data: {
            name: vm.name || `VM ${vm.vmid}`,
            hostname: vm.name || null,
            proxmoxType: vm.type,
            lastSeen: new Date(),
          },
        })
        deviceId = existingVM.id
        result.vmsUpdated++
      } else {
        const created = await prisma.device.create({
          data: {
            name: vm.name || `VM ${vm.vmid}`,
            hostname: vm.name || null,
            source: 'PROXMOX',
            proxmoxVmId: vm.vmid,
            proxmoxNodeName: node.node,
            proxmoxType: vm.type,
            lastSeen: new Date(),
          },
        })
        deviceId = created.id
        result.vmsCreated++
      }

      // Link IP if found
      if (ip) {
        const ipRecord = await prisma.iPAddress.findFirst({
          where: { address: ip, device: null },
        })
        if (ipRecord) {
          await prisma.iPAddress.update({
            where: { id: ipRecord.id },
            data: { status: 'IN_USE' },
          })
          await prisma.device.update({
            where: { id: deviceId },
            data: { ipAddressId: ipRecord.id },
          })
          result.ipsLinked++
        }
      }
    }
  }

  return result
}
