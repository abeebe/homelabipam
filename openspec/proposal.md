## Why

Homelab IPAM tracks networks, IPs, and devices — but has no concept of where hardware physically lives. Knowing which device is at which IP is useful; knowing it's in U12 of the left rack and the patch panel is on the back at U24 is what you actually need when you walk up to the rack with a cable in hand.

Most rack documentation lives in spreadsheets, sticky notes, or someone's head. A visual rack view integrated with the existing device inventory closes the loop between logical (network) and physical (rack position) infrastructure.

## What Changes

- New `Rack` and `RackItem` database models with Prisma migration
- CRUD API endpoints for racks and rack items
- Visual rack diagram component — renders a configurable-height rack (user specifies U count) with front and back views
- Hardware placement — user specifies how many U a device occupies and which U it starts at, with front/back mounting side
- Integration with existing Device model — rack items can optionally link to a tracked device (and through it, to an IP address)
- Audit logging for all rack mutations

## Capabilities

### New Capabilities (v2)
- `rack-management`: Create, edit, and delete rack definitions — configurable U height (4U to 48U), name, location, and description
- `rack-hardware`: Add, move, and remove hardware items from rack slots — each item has a name, U size, starting U position, mounting side (front/back), full-depth flag, color label, and optional device link. Supports shelves with child items (towers, routers), zero-U side-rail items (vertical PDUs), and half-width items sharing a U slot.
- `rack-visualization`: Interactive SVG rack diagram showing front and back views with color-coded items, U numbering, shelf containers, half-width pairs, zero-U side rail section, full-depth blocked indicators, empty slot interaction, and device/IP info on hover
- `asset-tracking`: Optional serial number, asset tag, purchase date, and warranty expiration on any rack item — with visual indicators for expiring/expired warranties
- `zero-u-items`: Vertical mount items (side-rail PDUs, cable managers) that exist in the rack but don't consume U space
- `half-width-items`: Half-width devices that share a 1U slot side-by-side (LEFT/RIGHT positioning)

### New Capabilities (v2.5)
- `proxmox-rack-integration`: Proxmox VE API integration — discover nodes, VMs, and LXC containers as Device records. Link Proxmox nodes to rack items. Rack hover and detail panel show live VM/container lists (name, VMID, status, IP) for linked Proxmox servers. Auto-link VM IPs to IPAM IP addresses. Settings UI activated for Proxmox credentials.

### New Capabilities (v3)
- `item-notes-photos`: Rich text notes and photo attachments per rack item for documenting wiring, configs, and labels
- `port-mapping`: Document port labels on patch panels and switches with global search across all racks
- `rack-topology`: Cable connections between rack items across racks with a visual topology overview
- `unifi-bidirectional`: Push DHCP reservations and device names from IPAM to the UniFi controller. Conflict detection when UniFi state diverges from IPAM. All writes are manual/opt-in, never automatic. Uses the unofficial UniFi Controller API (cookie-based auth) since the official Integration API is read-only as of March 2026.

### Modified Capabilities
- `Device` model gains an optional link to a `RackItem` — visible in device detail views
- `AuditLog` gains `Rack` and `RackItem` entity types

## Impact

- **Database**: New Prisma migration adding `Rack` and `RackItem` tables
- **API**: New route file `routes/racks.ts` mounted at `/api/racks`
- **Frontend**: New components for rack list, rack editor, rack diagram, and hardware placement
- **Existing code**: Minor additions to Device types/views to show rack location. No breaking changes.
