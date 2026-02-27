import axios, { AxiosInstance } from 'axios'
import https from 'https'
import { prisma } from '../prisma'

// UniFi Network Integration API v1
// Docs: /proxy/network/integration/v1

export interface UnifiSite {
  id: string
  name: string
  description: string
}

export interface UnifiClient {
  id: string
  macAddress: string
  ipAddress?: string
  name?: string
  type?: string
  connectedAt?: string // ISO timestamp
}

export interface UnifiDevice {
  id: string
  macAddress: string
  ipAddress?: string
  name?: string
  model?: string
  state?: string
}

export interface UnifiNetwork {
  id: string
  name: string
  vlanId?: number
  enabled: boolean
}

async function getConfig(): Promise<{ url: string; apiKey: string }> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ['UNIFI_URL', 'UNIFI_API_KEY'] } },
  })
  const map = Object.fromEntries(rows.map(r => [r.key, r.value ?? '']))

  return {
    url: map['UNIFI_URL'] || process.env.UNIFI_URL || '',
    apiKey: map['UNIFI_API_KEY'] || process.env.UNIFI_API_KEY || process.env['UNIFI-X-APIKEY'] || '',
  }
}

async function createClient(): Promise<AxiosInstance> {
  const { url: baseURL, apiKey } = await getConfig()

  if (!baseURL) throw new Error('UNIFI_URL is not configured. Set it in Settings.')
  if (!apiKey) throw new Error('UNIFI_API_KEY is not configured. Set it in Settings.')

  return axios.create({
    baseURL,
    headers: {
      'X-API-KEY': apiKey,
      'Accept': 'application/json',
    },
    // UniFi uses self-signed certificates
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    timeout: 10000,
  })
}

async function fetchAllPages<T>(
  fetcher: (offset: number, limit: number) => Promise<{ data: T[]; totalCount: number }>
): Promise<T[]> {
  const limit = 100
  const all: T[] = []
  let offset = 0
  while (true) {
    const { data, totalCount } = await fetcher(offset, limit)
    all.push(...data)
    if (all.length >= totalCount) break
    offset = all.length
  }
  return all
}

export async function getSites(): Promise<UnifiSite[]> {
  const client = await createClient()
  const res = await client.get('/proxy/network/integration/v1/sites')
  return res.data.data ?? res.data
}

export async function getNetworks(siteId: string): Promise<UnifiNetwork[]> {
  const client = await createClient()
  const res = await client.get(`/proxy/network/integration/v1/sites/${siteId}/networks`)
  return res.data.data ?? res.data
}

export async function getClients(siteId: string): Promise<UnifiClient[]> {
  const client = await createClient()
  return fetchAllPages(async (offset, limit) => {
    const res = await client.get(`/proxy/network/integration/v1/sites/${siteId}/clients`, {
      params: { offset, limit },
    })
    return { data: res.data.data ?? [], totalCount: res.data.totalCount ?? 0 }
  })
}

export async function getDevices(siteId: string): Promise<UnifiDevice[]> {
  const client = await createClient()
  return fetchAllPages(async (offset, limit) => {
    const res = await client.get(`/proxy/network/integration/v1/sites/${siteId}/devices`, {
      params: { offset, limit },
    })
    return { data: res.data.data ?? [], totalCount: res.data.totalCount ?? 0 }
  })
}

export async function testConnection(): Promise<{ connected: boolean; url: string; siteCount?: number; error?: string }> {
  const { url } = await getConfig()
  const displayUrl = url || 'not configured'
  try {
    const sites = await getSites()
    return { connected: true, url: displayUrl, siteCount: sites.length }
  } catch (err: any) {
    return { connected: false, url: displayUrl, error: err.message }
  }
}
