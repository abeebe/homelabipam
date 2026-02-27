import { Network, IPAddress, Device, AuditLogEntry } from './types'

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
    request<Network>('/networks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Network>) =>
    request<Network>(`/networks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/networks/${id}`, { method: 'DELETE' }),
  populate: (id: string) =>
    request<{ created: number; existing: number; total: number }>(`/networks/${id}/populate`, { method: 'POST' }),
}

// IP Addresses API
export const ipAddressesAPI = {
  getAll: () => request<IPAddress[]>('/ipaddresses'),
  getById: (id: string) => request<IPAddress>(`/ipaddresses/${id}`),
  getByNetwork: (networkId: string) =>
    request<IPAddress[]>(`/ipaddresses/network/${networkId}`),
  create: (data: Omit<IPAddress, 'id' | 'createdAt' | 'updatedAt' | 'network' | 'device'>) =>
    request<IPAddress>('/ipaddresses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<IPAddress>) =>
    request<IPAddress>(`/ipaddresses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/ipaddresses/${id}`, { method: 'DELETE' }),
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
    reconciled: number
    errors: string[]
  }>('/unifi/sync', { method: 'POST' }),
  getDevices: () => request<Device[]>('/unifi/devices'),
}

// Settings API
export const settingsAPI = {
  getAll: () => request<Record<string, string>>('/settings'),
  update: (data: Record<string, string>) =>
    request<{ ok: boolean }>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
}

// Audit Log API
export const auditLogAPI = {
  getAll: (params?: { page?: number; limit?: number; entityType?: string; action?: string }) => {
    const qs = new URLSearchParams()
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.entityType) qs.set('entityType', params.entityType)
    if (params?.action) qs.set('action', params.action)
    return request<{ total: number; page: number; limit: number; logs: AuditLogEntry[] }>(
      `/auditlog?${qs.toString()}`
    )
  },
}

export { APIError }
