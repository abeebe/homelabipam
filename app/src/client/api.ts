import { Network, IPAddress, Device } from './types'

const API_BASE = '/api'

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new APIError(response.status, error.error || 'API request failed')
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

// Networks API
export const networksAPI = {
  getAll: () => request<Network[]>('/networks'),
  getById: (id: string) => request<Network>(`/networks/${id}`),
  create: (data: Omit<Network, 'id' | 'createdAt' | 'updatedAt' | 'ipAddresses'>) =>
    request<Network>('/networks', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  update: (id: string, data: Partial<Network>) =>
    request<Network>(`/networks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  delete: (id: string) =>
    request<void>(`/networks/${id}`, {
      method: 'DELETE'
    })
}

// IP Addresses API
export const ipAddressesAPI = {
  getAll: () => request<IPAddress[]>('/ipaddresses'),
  getById: (id: string) => request<IPAddress>(`/ipaddresses/${id}`),
  getByNetwork: (networkId: string) =>
    request<IPAddress[]>(`/ipaddresses/network/${networkId}`),
  create: (data: Omit<IPAddress, 'id' | 'createdAt' | 'updatedAt' | 'network' | 'device'>) =>
    request<IPAddress>('/ipaddresses', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  update: (id: string, data: Partial<IPAddress>) =>
    request<IPAddress>(`/ipaddresses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  delete: (id: string) =>
    request<void>(`/ipaddresses/${id}`, {
      method: 'DELETE'
    })
}

// UniFi API
export const unifiAPI = {
  getStatus: () => request<{ connected: boolean; url: string; siteCount?: number; error?: string }>('/unifi/status'),
  discover: () => request<{ sites: number; discovered: number; synced: number; errors: string[] }>('/unifi/discover', { method: 'POST' }),
  sync: () => request<{
    sites: number
    networks: { created: number; updated: number }
    ipAddresses: { created: number; updated: number }
    devices: { synced: number }
    errors: string[]
  }>('/unifi/sync', { method: 'POST' }),
  getDevices: () => request<Device[]>('/unifi/devices'),
}

export { APIError }
