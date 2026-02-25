export interface Network {
  id: string
  name: string
  vlanId: number | null
  cidr: string
  gateway: string | null
  description: string | null
  createdAt: string
  updatedAt: string
  ipAddresses: IPAddress[]
}

export interface IPAddress {
  id: string
  address: string
  status: 'AVAILABLE' | 'RESERVED' | 'IN_USE'
  description: string | null
  networkId: string
  network: Network
  device: Device | null
  createdAt: string
  updatedAt: string
}

export interface Device {
  id: string
  name: string
  macAddress: string | null
  hostname: string | null
  vendor: string | null
  source: 'MANUAL' | 'UNIFI' | 'PROXMOX'
  lastSeen: string | null
  ipAddressId: string | null
  ipAddress: IPAddress | null
  createdAt: string
  updatedAt: string
}
