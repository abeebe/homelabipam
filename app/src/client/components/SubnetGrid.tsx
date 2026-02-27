import { IPAddress, Network } from '../types'

interface SubnetGridProps {
  network: Network
  ipAddresses: IPAddress[]   // all IPs for this network (unfiltered by search)
  onIPClick: (ip: IPAddress) => void
}

function ipToNum(ip: string): number {
  return ip.split('.').reduce((acc: number, o: string) => acc * 256 + parseInt(o), 0)
}

function numToIP(n: number): string {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join('.')
}

function parseCIDR(cidr: string) {
  const [ipStr, prefixStr] = cidr.split('/')
  const prefix = parseInt(prefixStr)
  const mask = prefix === 0 ? 0 : ((~0 << (32 - prefix)) >>> 0)
  const networkNum = (ipToNum(ipStr) & mask) >>> 0
  const broadcast = (networkNum | (~mask >>> 0)) >>> 0
  return { networkNum, broadcast, totalCells: broadcast - networkNum + 1 }
}

const COLS = 16

export default function SubnetGrid({ network, ipAddresses, onIPClick }: SubnetGridProps) {
  const { networkNum, broadcast, totalCells } = parseCIDR(network.cidr)

  if (totalCells > 1024) {
    return (
      <div className="subnet-grid-message">
        Network too large to visualize ({totalCells - 2} hosts). Select a /22 or smaller subnet.
      </div>
    )
  }

  // Map IP address string → record
  const ipMap = new Map<string, IPAddress>()
  for (const ip of ipAddresses) ipMap.set(ip.address, ip)

  // Build all cells including network (.0) and broadcast (.255)
  type Cell = { ip: string; num: number; isNetwork: boolean; isBroadcast: boolean; record: IPAddress | null }
  const cells: Cell[] = []
  for (let n = networkNum; n <= broadcast; n++) {
    const ip = numToIP(n)
    cells.push({ ip, num: n, isNetwork: n === networkNum, isBroadcast: n === broadcast, record: ipMap.get(ip) ?? null })
  }

  // Split into rows of COLS
  const rows: Cell[][] = []
  for (let i = 0; i < cells.length; i += COLS) {
    rows.push(cells.slice(i, i + COLS))
  }

  function cellClass(cell: Cell): string {
    if (cell.isNetwork || cell.isBroadcast) return 'grid-cell grid-cell-special'
    if (!cell.record) return 'grid-cell grid-cell-untracked'
    switch (cell.record.status) {
      case 'IN_USE': return 'grid-cell grid-cell-in-use'
      case 'RESERVED': return 'grid-cell grid-cell-reserved'
      default: return 'grid-cell grid-cell-available'
    }
  }

  function cellTitle(cell: Cell): string {
    if (cell.isNetwork) return `${cell.ip}  (network address)`
    if (cell.isBroadcast) return `${cell.ip}  (broadcast)`
    if (!cell.record) return `${cell.ip}  — not tracked`
    const parts = [`${cell.ip}  ${cell.record.status}`]
    if (cell.record.device) parts.push(`Device: ${cell.record.device.name}`)
    if (cell.record.description) parts.push(`Note: ${cell.record.description}`)
    return parts.join('\n')
  }

  const inUse = ipAddresses.filter(ip => ip.status === 'IN_USE').length
  const available = ipAddresses.filter(ip => ip.status === 'AVAILABLE').length
  const reserved = ipAddresses.filter(ip => ip.status === 'RESERVED').length
  const untracked = totalCells - 2 - ipAddresses.length  // host IPs not in DB

  return (
    <div className="subnet-grid">
      <div className="subnet-legend">
        <span className="legend-item"><span className="legend-dot dot-in-use" />{inUse} In Use</span>
        <span className="legend-item"><span className="legend-dot dot-available" />{available} Available</span>
        <span className="legend-item"><span className="legend-dot dot-reserved" />{reserved} Reserved</span>
        <span className="legend-item"><span className="legend-dot dot-untracked" />{untracked > 0 ? `${untracked} Untracked` : '0 Untracked'}</span>
      </div>

      <div className="subnet-grid-body">
        {rows.map((row, ri) => {
          const rowStartIP = cells[ri * COLS].ip
          const lastOctet = rowStartIP.split('.').pop()
          return (
            <div key={ri} className="subnet-row">
              <span className="subnet-row-label">.{lastOctet}</span>
              <div className="subnet-row-cells">
                {row.map(cell => (
                  <div
                    key={cell.ip}
                    className={cellClass(cell)}
                    title={cellTitle(cell)}
                    onClick={() => {
                      if (cell.record && !cell.isNetwork && !cell.isBroadcast) {
                        onIPClick(cell.record)
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
