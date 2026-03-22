## Phase 1: Data Model & API (v2)

- [ ] 1.1 Add `RackSide`, `RackItemType` (MOUNTED/SHELF/SHELF_ITEM/ZERO_U), `HalfWidthPosition` (LEFT/RIGHT) enums, `Rack` model, and `RackItem` model (with self-referencing parentId, fullDepth, halfWidth, halfWidthPosition, asset fields) to Prisma schema
- [ ] 1.2 Add optional `rackItem` relation to existing `Device` model (reverse of RackItem.deviceId)
- [ ] 1.3 Run `npx prisma migrate dev` to generate and apply migration
- [ ] 1.4 Create `app/src/server/routes/racks.ts` — full CRUD for racks:
  - `GET /api/racks` — list all racks with item counts and utilization
  - `GET /api/racks/:id` — get rack with all items (include device + ipAddress on linked items)
  - `POST /api/racks` — create rack (validate totalUnits 4-48)
  - `PUT /api/racks/:id` — update rack (prevent shrink below highest occupied U)
  - `DELETE /api/racks/:id` — cascade delete items, unlink devices, confirm prompt
- [ ] 1.5 Add rack item endpoints to the same route file:
  - `POST /api/racks/:id/items` — add item (type: MOUNTED/SHELF/ZERO_U, collision detection, U range validation, half-width support)
  - `POST /api/racks/:rackId/items/:itemId/children` — add shelf item (type: SHELF_ITEM, validate parent is a shelf)
  - `PUT /api/racks/:rackId/items/:itemId` — update item details (name, color, description, deviceId, asset fields)
  - `PUT /api/racks/:rackId/items/:itemId/move` — move item (new startUnit/side, collision detection excluding self)
  - `DELETE /api/racks/:rackId/items/:itemId` — remove item (cascade-delete children if shelf), unlink devices
- [ ] 1.6 Implement collision detection helper:
  - Same-side overlap detection
  - Full-depth items block opposite side
  - Half-width: two LEFT+RIGHT items can share a U, but full-width blocks half-width and vice versa
  - Shelf items and zero-U items excluded from rack-level collision
- [ ] 1.6a Implement shelf validation — shelf items must reference a SHELF parent, must not specify startUnit/side, parent must exist in same rack
- [ ] 1.6b Implement zero-U validation — no startUnit, no unitHeight, no fullDepth, no halfWidth
- [ ] 1.6c Implement half-width validation — must specify halfWidthPosition (LEFT/RIGHT), must be unitHeight 1, cannot be fullDepth, cannot be shelf/shelf-item
- [ ] 1.7 Add audit logging for all Rack and RackItem mutations (entity types: `Rack`, `RackItem`)
- [ ] 1.8 Mount rack routes in `app.ts`: `app.use("/api/racks", racksRoutes)`
- [ ] 1.9 Write unit tests for collision detection (same-side, full-depth cross-side, half-width pairs, zero-U bypass, shelf bypass)

**Milestone: Full REST API for racks and all item types — collision-safe, audit-logged, asset-tracked.**

## Phase 2: Frontend — Rack List & CRUD (v2)

- [ ] 2.1 Add `Rack`, `RackItem`, `RackItemType`, `RackSide`, `HalfWidthPosition` TypeScript interfaces to `types.ts`
- [ ] 2.2 Add `racksAPI` methods to `api.ts` (getAll, getById, create, update, delete, addItem, addShelfItem, addZeroUItem, updateItem, moveItem, removeItem)
- [ ] 2.3 Build `RackList.tsx` — list of racks showing name, size, utilization bar, location
- [ ] 2.4 Build `CreateRackForm.tsx` — form with name, total units (number input 4-48), location, description
- [ ] 2.5 Build `RackDetail.tsx` — main rack view page containing the diagram, item sidebar, and side-rail section
- [ ] 2.6 Build `AddItemForm.tsx` — type selector (Mounted/Shelf/Zero-U/Half-Width):
  - Mounted: name, starting U, U height, side, full-depth checkbox, color, device selector, asset fields
  - Shelf: name, starting U, total device height, side, color
  - Zero-U: name, color, device selector, asset fields (no U position)
  - Half-Width: name, starting U, side, position (LEFT/RIGHT), color, device selector, asset fields
- [ ] 2.6a Build `AddShelfItemForm.tsx` — name, color, device selector, asset fields. No U position or side.
- [ ] 2.7 Build `EditItemForm.tsx` — edit name, color, description, device link, asset fields. For shelves, show children list with add/remove.
- [ ] 2.8 Build `AssetFields.tsx` — reusable component for serial number, asset tag, purchase date, warranty expiration (with expiry indicator)
- [ ] 2.9 Add rack navigation to the main app — new "Racks" tab/route in React Router
- [ ] 2.10 Add "Rack location" display to Device detail view when a device is linked to a rack item

**Milestone: Can create racks, add all item types, manage asset info, navigate between rack list and detail views.**

## Phase 3: Rack Visualization — SVG Diagram (v2)

- [ ] 3.1 Build `RackDiagram.tsx` — SVG component that renders rack frame, U markings (U1 at bottom), and slot grid
- [ ] 3.2 Implement dynamic height — SVG viewBox scales based on rack's totalUnits (each U = fixed pixel height)
- [ ] 3.3 Render standard rack items as colored rectangles spanning their U range, with name text centered
- [ ] 3.3a Render shelves with a distinct container style (border/hatch pattern) — child items rendered as smaller rectangles arranged left-to-right inside the shelf's footprint, each with its own color and label
- [ ] 3.3b Render full-depth items on both views — normal on mounted side, dimmed/hatched with "Blocked by: {name}" label on opposite side
- [ ] 3.3c Render half-width items as left/right rectangles within a single U slot, each with its own color and label
- [ ] 3.3d Render "Side Rails" section adjacent to the diagram — list of zero-U items with color dots, names, and device links
- [ ] 3.4 Implement front/back toggle — tabs that filter items by side, re-render diagram (including full-depth blocked indicators)
- [ ] 3.5 Implement U numbering — left-side labels, U1 at bottom, every U labeled
- [ ] 3.6 Implement color presets — blue (servers), green (networking), orange (storage), purple (power), gray (other) + custom picker
- [ ] 3.7 Implement hover tooltip — item name, U range, side, device info, serial number, warranty status. For shelf items show parent shelf. For half-width show position (L/R).
- [ ] 3.7a Implement shelf click — opens sidebar with shelf contents list and "Add Item to Shelf" button
- [ ] 3.8 Implement click-empty-slot — clicking an unoccupied U opens AddItemForm pre-filled with that U and current side
- [ ] 3.9 Implement item click — clicking an item opens edit/detail panel in sidebar with asset info
- [ ] 3.10 Style empty slots — subtle grid lines or alternating shade to distinguish available U positions
- [ ] 3.11 Responsive layout — diagram full-width on narrow screens, diagram + sidebar on wide screens
- [ ] 3.12 Warranty indicators — items with expiring (<90 days) or expired warranties show a small warning/danger icon on the diagram

**Milestone: Visual rack diagram with all item types, front/back views, side rails, half-width pairs, asset info, warranty indicators.**

## Phase 4: Polish & Integration (v2)

- [ ] 4.1 Add utilization summary above diagram — "Front: 28/42U (67%) · Back: 6/42U (14%) · Side Rails: 2 items"
- [ ] 4.2 Add device selector with search/filter in AddItemForm — shows only unlinked devices
- [ ] 4.3 Implement move validation UX — show available slots when moving (highlight valid drop zones, account for half-width and full-depth)
- [ ] 4.4 Add confirmation dialogs for destructive actions (delete rack, remove item, delete shelf with contents)
- [ ] 4.5 Add loading and error states for all API operations
- [ ] 4.6 Implement asset search — find rack items by serial number or asset tag across all racks
- [ ] 4.7 Test with edge cases: 4U rack, 48U rack, fully packed rack, front-only, back-only, shelf with 1 item, shelf with 4 items, shelf with tall devices, empty shelf, nested device links on shelf items, full-depth item blocking back, half-width pairs, half-width + full-width collision, zero-U items, expired/expiring warranties
- [ ] 4.8 Optional: drag-and-drop repositioning within the SVG diagram
- [ ] 4.9 Optional: print/export rack diagram as PNG or PDF for documentation binders

**Milestone: Production-ready rack management with all item types, asset tracking, search, and comprehensive edge case coverage.**

---

## Phase 4.5: Proxmox Integration + Rack VM Display (v2.5)

### Backend — Proxmox API Client & Sync

- [ ] 4.5.1 Add Proxmox fields to Device model in Prisma schema: `proxmoxVmId` (Int?), `proxmoxNodeName` (String?), `proxmoxType` (String? — "node", "qemu", "lxc")
- [ ] 4.5.2 Run migration
- [ ] 4.5.3 Create `app/src/server/utils/proxmox.ts` — Proxmox API client (follow UniFi pattern):
  - `getConfig()` — load URL + token from Settings table
  - `testConnection()` — `GET /api2/json/version`, return PVE version or error
  - `getNodes()` — `GET /api2/json/nodes`, return node list with status/IP
  - `getNodeVMs(node)` — `GET /api2/json/nodes/{node}/qemu`, return VM list
  - `getNodeContainers(node)` — `GET /api2/json/nodes/{node}/lxc`, return container list
  - `getVMConfig(node, vmid)` — `GET /api2/json/nodes/{node}/qemu/{vmid}/config`, parse network config for IPs
  - `getLXCConfig(node, vmid)` — `GET /api2/json/nodes/{node}/lxc/{vmid}/config`, parse network config
  - `getVMAgentIPs(node, vmid)` — `GET /api2/json/nodes/{node}/qemu/{vmid}/agent/network-get-interfaces`, live IPs via guest agent (graceful fallback if agent not running)
  - Auth header: `Authorization: PVEAPIToken=USER@REALM!TOKENID=SECRET`
  - Self-signed cert support (rejectUnauthorized: false)
  - 10-second timeout per request
- [ ] 4.5.4 Create `app/src/server/routes/proxmox.ts` — Proxmox API routes:
  - `GET /api/proxmox/status` — test connection, return PVE version
  - `GET /api/proxmox/nodes` — list nodes with VM/container counts
  - `POST /api/proxmox/sync` — full sync: discover nodes → VMs → containers → create/update Devices → link IPs
  - `GET /api/proxmox/nodes/:node/vms` — on-demand VM list for a specific node (used by rack detail)
- [ ] 4.5.5 Mount proxmox routes in `app.ts`: `app.use("/api/proxmox", proxmoxRoutes)`
- [ ] 4.5.6 Implement sync logic:
  - Fetch all nodes → create/update Device records (source: PROXMOX, proxmoxType: "node")
  - For each node: fetch VMs and containers → create/update Device records (proxmoxType: "qemu"/"lxc", proxmoxNodeName: node name, proxmoxVmId: VMID)
  - IP discovery: try QEMU agent first, fall back to config parsing, then skip
  - Cross-reference discovered IPs with IPAM IPAddress records → set IN_USE and link device
  - Reconciliation: mark devices as offline if they disappear from Proxmox
  - Audit log: SYNC action with stats (nodes, VMs, containers, IPs linked)
- [ ] 4.5.7 Add audit logging for all Proxmox sync operations

**Milestone: Proxmox nodes, VMs, and containers discovered and stored as Devices with IPs auto-linked.**

### Frontend — Settings & Sync UI

- [ ] 4.5.8 Enable Proxmox settings fields in SettingsPage.tsx (remove disabled attribute)
- [ ] 4.5.9 Add "Test Connection" button for Proxmox in Settings — calls `GET /api/proxmox/status`
- [ ] 4.5.10 Add Proxmox API client methods to `api.ts`: `proxmoxAPI.getStatus()`, `proxmoxAPI.sync()`, `proxmoxAPI.getNodeVMs(node)`
- [ ] 4.5.11 Add "Sync Proxmox" button on Devices page (next to existing "Sync UniFi")
- [ ] 4.5.12 Update Device type in `types.ts` with `proxmoxVmId`, `proxmoxNodeName`, `proxmoxType` fields

**Milestone: Proxmox configurable and syncable from the UI.**

### Frontend — Rack VM Display

- [ ] 4.5.13 Update RackDiagram hover tooltip: when item is linked to a Proxmox node device, fetch VMs for that node and show VM list (name, VMID, status, IP) in tooltip
- [ ] 4.5.14 Add "Virtual Machines" section to item detail panel in RackDetail.tsx:
  - Detect if linked device has `proxmoxType === "node"`
  - Fetch VMs on-demand via `GET /api/proxmox/nodes/{nodeName}/vms`
  - Display table: VMID, Name, Type (QEMU/LXC), Status (running/stopped), CPU, Memory, IP
  - Loading spinner while fetching
  - Error state: "Unable to reach Proxmox — showing last known state" with fallback to cached Device records
- [ ] 4.5.15 Add VM count badge on rack diagram — Proxmox-linked items show a small count indicator (e.g., "5 VMs") on the SVG item rectangle
- [ ] 4.5.16 Implement 60-second TTL cache for on-demand VM fetches to prevent API hammering
- [ ] 4.5.17 Test full flow: configure Proxmox → sync → link node to rack item → hover shows VMs → detail panel shows live VM list

**Milestone: Rack view shows live VM/container info for Proxmox servers — hover for quick view, click for full detail.**

---

## Phase 5: Notes & Photos (v3)

- [ ] 5.1 Add `notes` text field to RackItem schema (nullable, long text)
- [ ] 5.2 Create `rack_item_photos` table — id, rackItemId, filename, mimeType, sizeBytes, uploadedAt
- [ ] 5.3 Add photo upload endpoint — `POST /api/racks/:rackId/items/:itemId/photos` (multipart, max 10MB per image)
- [ ] 5.4 Add photo list/delete endpoints — `GET .../photos`, `DELETE .../photos/:photoId`
- [ ] 5.5 Implement file storage at `STORAGE_DIR/rack-photos/<rackId>/<itemId>/`
- [ ] 5.6 Build notes editor in item detail panel — editable text area, auto-save
- [ ] 5.7 Build photo gallery in item detail panel — thumbnails, click to expand, upload button, delete
- [ ] 5.8 Cascade-delete photos when rack item or rack is deleted

**Milestone: Attach notes and photos to any rack item — document wiring, configs, labels.**

## Phase 6: Port Mapping (v3)

- [ ] 6.1 Create `rack_item_ports` table — id, rackItemId, portNumber, label, createdAt, updatedAt
- [ ] 6.2 Add port mapping endpoints:
  - `PUT /api/racks/:rackId/items/:itemId/ports` — bulk upsert port labels
  - `GET /api/racks/:rackId/items/:itemId/ports` — list ports
  - `GET /api/ports/search?q=` — search port labels across all racks
- [ ] 6.3 Add `portCount` field to RackItem (nullable, set when port mapping is enabled)
- [ ] 6.4 Build port mapping UI — enable port mapping on item, set port count, editable label table
- [ ] 6.5 Build port map display in item detail sidebar — table with port number + label, search/filter
- [ ] 6.6 Add port mapping indicator icon on SVG diagram for items that have port maps
- [ ] 6.7 Build global port search — search bar on rack list page, results link to rack → item → port

**Milestone: Document every port on every patch panel and switch, searchable across all racks.**

## Phase 7: Rack Topology & Cabling (v3)

- [ ] 7.1 Create `rack_connections` table — id, sourceItemId, sourcePort, destItemId, destPort, cableType, description, createdAt
- [ ] 7.2 Add connection endpoints:
  - `POST /api/connections` — create connection between two rack items
  - `GET /api/connections?rackId=` — list connections for a rack
  - `DELETE /api/connections/:id` — remove connection
- [ ] 7.3 Build connection form — source item/port picker, destination item/port picker (cross-rack), cable type dropdown (Cat5e, Cat6, Cat6a, Fiber OM3, Fiber OM4, SFP+, DAC, USB, other)
- [ ] 7.4 Build connections tab on rack detail view — table of inbound/outbound connections
- [ ] 7.5 Build topology view — all racks as blocks, connection lines between them, click for details
- [ ] 7.6 Cascade-delete connections when source or destination item is deleted

**Milestone: Full rack-to-rack topology with cable documentation and visual overview.**

## Phase 8: UniFi Bidirectional Sync (v3)

_Uses the unofficial UniFi Controller API. Reads continue via the stable Integration API._

### Backend — Write Client & Endpoints

- [ ] 8.1 Add UniFi write credentials to Settings schema: `UNIFI_USERNAME`, `UNIFI_PASSWORD` (sensitive, encrypted)
- [ ] 8.2 Extend `app/src/server/utils/unifi.ts` with session-based auth client:
  - `loginController()` — `POST /api/login` with username/password, store session cookie
  - `getClientByMAC(site, mac)` — `GET api/s/{site}/stat/user/{mac}`, return current UniFi state
  - `setFixedIP(site, userId, ip, networkId)` — `PUT api/s/{site}/upd/user/{userId}` with `use_fixedip: true, fixed_ip, network_id`
  - `clearFixedIP(site, userId)` — `PUT api/s/{site}/upd/user/{userId}` with `use_fixedip: false`
  - `renameClient(site, userId, name)` — `PUT api/s/{site}/upd/user/{userId}` with `name`
- [ ] 8.3 Add write endpoints to `app/src/server/routes/unifi.ts`:
  - `POST /api/unifi/push-reservation` — push DHCP reservation for a device+IP pair
  - `POST /api/unifi/push-reservations` — bulk push for multiple assignments
  - `DELETE /api/unifi/reservation/:deviceId` — remove DHCP reservation
  - `POST /api/unifi/push-name/:deviceId` — push device name to controller
  - `GET /api/unifi/check-conflict/:deviceId` — fetch current UniFi state for conflict detection
- [ ] 8.4 Implement conflict detection: before pushing, fetch current UniFi state and compare with IPAM state. Return conflict details if they differ.
- [ ] 8.5 Add audit logging for all write operations (action: SYNC, source: USER, details include what was pushed and controller response)

### Frontend — Push UI

- [ ] 8.6 Add UniFi write credentials fields to SettingsPage.tsx (username + password, with unofficial API warning notice)
- [ ] 8.7 Add "Push to UniFi" button on IP assignment detail — appears when device has MAC address and UniFi write credentials are configured
- [ ] 8.8 Add "Push All to UniFi" bulk action on network detail view — pushes reservations for all selected assignments
- [ ] 8.9 Add "Sync name to UniFi" checkbox on device rename — opt-in push of name change
- [ ] 8.10 Implement conflict resolution dialog: when push detects a mismatch, show current UniFi state vs IPAM state with options: Overwrite UniFi / Pull to IPAM / Cancel
- [ ] 8.11 Add "Remove UniFi Reservation" option when unlinking a device from an IP
- [ ] 8.12 Add UniFi push status indicators on IP address list — icon showing whether the reservation has been pushed, is out of sync, or hasn't been pushed
- [ ] 8.13 Test full flow: assign IP → push reservation → verify on controller → rename device → push name → unlink → remove reservation

**Milestone: IPAM is the single source of truth for IP assignments — push DHCP reservations and device names to UniFi with conflict detection.**
