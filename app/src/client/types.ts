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

export type RackSide = 'FRONT' | 'BACK'
export type RackItemType = 'MOUNTED' | 'SHELF' | 'SHELF_ITEM' | 'ZERO_U'
export type HalfWidthPosition = 'LEFT' | 'RIGHT'

export interface Rack {
  id: string
  name: string
  totalUnits: number
  location: string | null
  description: string | null
  createdAt: string
  updatedAt: string
  items: RackItem[]
  frontUsed?: number
  backUsed?: number
  zeroUCount?: number
}

export interface RackItem {
  id: string
  name: string
  startUnit: number | null
  unitHeight: number | null
  side: RackSide | null
  itemType: RackItemType
  color: string
  description: string | null
  rackId: string
  fullDepth: boolean
  halfWidth: boolean
  halfWidthPosition: HalfWidthPosition | null
  serialNumber: string | null
  assetTag: string | null
  purchaseDate: string | null
  warrantyExpiration: string | null
  deviceId: string | null
  device: Device | null
  parentId: string | null
  children: RackItem[]
  createdAt: string
  updatedAt: string
}

export interface AuditLogEntry {
  id: string
  action: string
  entityType: string
  entityId: string | null
  entityName: string | null
  changes: string | null
  source: string
  createdAt: string
}
