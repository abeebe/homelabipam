## Context

Homelab IPAM is a self-hosted IP address management tool built with React 18, Express, Prisma 7, and PostgreSQL. It tracks networks (subnets), IP addresses, and devices with optional UniFi auto-discovery. The existing Device model has name, MAC, hostname, vendor, and source — but no physical location.

The rack view adds physical infrastructure tracking: where hardware lives in server racks, which U slots are occupied, and what's mounted on the front vs. back.

## Goals / Non-Goals

**Goals (v2):**
- Visual rack diagram that accurately represents a physical server rack
- Configurable rack height (U count) — works for 4U desktop racks through 48U full-height
- Front and back views — some hardware mounts on the back (patch panels, cable management, PDUs)
- Hardware items with U size and position — a 2U server starting at U12 occupies U12-U13
- Color coding for visual organization (servers, networking, storage, etc.)
- Optional link between rack items and existing Device records
- Collision detection — prevent overlapping items in the same U slots on the same side
- Zero-U / vertical mount items — side-rail PDUs that don't consume U space
- Half-width items — two small devices sharing a single U slot side-by-side
- Asset tracking — serial number, asset tag, purchase date, warranty expiration per item

**Goals (v3):**
- Notes and photos per rack item — attach wiring photos, configuration notes
- Port mapping on patch panels — document which port goes where
- Rack-to-rack cabling / topology view — visual connections between racks

**Non-Goals:**
- Power monitoring or PDU circuit mapping
- Weight tracking per U / total rack load
- Airflow direction indicators
- Rack elevation drawings with exact hardware dimensions/bezels
- 3D visualization
- Auto-discovery of rack positions (this is manual documentation)

## Decisions

### 1. Data model: Rack → RackItem (one-to-many)

**Decision:** Two new models. `Rack` defines the container (name, U count, location). `RackItem` defines hardware in the rack (name, starting U, U height, side, color, optional device link).

**Rationale:** Clean separation. A rack is a physical container with a fixed size. Items go in and out. The one-to-many relationship is simple and maps directly to how racks work. No need for a slot-per-row model — that would create 48+ rows per rack with mostly nulls.

**Schema:**
```prisma
model Rack {
  id          String     @id @default(uuid())
  name        String
  totalUnits  Int
  location    String?
  description String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  items       RackItem[]
}

model RackItem {
  id          String      @id @default(uuid())
  name        String
  startUnit   Int
  unitHeight  Int         @default(1)
  side        RackSide    @default(FRONT)
  itemType    RackItemType @default(MOUNTED)
  color       String      @default("#3b82f6")
  description String?
  rackId      String
  rack        Rack        @relation(fields: [rackId], references: [id])
  fullDepth          Boolean          @default(false)
  halfWidth          Boolean          @default(false)
  halfWidthPosition  HalfWidthPosition?
  serialNumber       String?
  assetTag           String?
  purchaseDate       DateTime?
  warrantyExpiration DateTime?
  deviceId           String?          @unique
  device             Device?          @relation(fields: [deviceId], references: [id])
  parentId    String?
  parent      RackItem?   @relation("ShelfChildren", fields: [parentId], references: [id])
  children    RackItem[]  @relation("ShelfChildren")
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

enum RackSide {
  FRONT
  BACK
}

enum RackItemType {
  MOUNTED      // Standard rackmount hardware (servers, switches, patch panels)
  SHELF        // Install shelf — can hold child items (towers, routers, etc.)
  SHELF_ITEM   // Item sitting on a shelf (not rack-mounted directly)
  ZERO_U       // Vertical mount items (side-rail PDUs, cable managers) — no U position
}

enum HalfWidthPosition {
  LEFT
  RIGHT
}
```

**Shelf model:** A shelf is a RackItem with `itemType: SHELF`. Its `unitHeight` represents the total U consumed including the height of whatever sits on it — not just the shelf hardware itself. When creating a shelf, the user specifies the total U height of the devices on the shelf (e.g., a 1U shelf holding a 3U tower = 3U total reservation). Items on the shelf are also RackItems with `itemType: SHELF_ITEM` and `parentId` pointing to the shelf. Shelf items don't have their own U position (they inherit it from the shelf) and don't participate in collision detection against the rack — they only exist within the shelf's footprint. A shelf can hold multiple items (e.g., two towers, or a router + NAS). Each shelf item can independently link to a Device.

### 2. U numbering: bottom-up (industry standard)

**Decision:** U1 is at the bottom of the rack, highest U at the top. The visual diagram renders with U1 at the bottom.

**Rationale:** This matches the EIA-310 standard that all rack manufacturers follow. Numbering from the bottom is how rack rails are labeled physically. Rendering top-down (which is how HTML flows) with U1 at the bottom matches what you see when standing in front of the rack.

### 3. SVG-based rack visualization

**Decision:** Render the rack diagram as an inline SVG component, not canvas or image.

**Rationale:** SVG gives us crisp rendering at any zoom, click/hover interactivity, easy color fills, and text labels — all without external dependencies. A 48U rack is just rectangles and text. Canvas would be overkill and harder to make interactive. Pre-rendered images wouldn't support the dynamic item placement.

### 4. Front/back as a toggle, not side-by-side

**Decision:** Show front and back as a toggle view (tab or button), not side-by-side.

**Rationale:** Side-by-side wastes horizontal space on narrow screens and the rack diagram needs to be tall enough to read U numbers. A toggle keeps the diagram large and readable. The selected view (front/back) persists per rack in local state.

**Alternative considered:** Side-by-side on wide screens, toggle on mobile. Added complexity for marginal benefit — most racks have sparse back-mounting. Simple toggle is fine.

### 5. Color labels for visual categorization

**Decision:** Each rack item gets a user-selectable color. Provide preset options (blue=server, green=networking, orange=storage, purple=power, gray=other) with a custom color picker fallback.

**Rationale:** Color coding is the fastest way to scan a rack diagram and understand what's where. Presets cover 90% of cases; custom color handles the rest. No need for a formal "category" system — color is the category.

### 6. Collision detection on placement

**Decision:** When adding or moving a rack item, the API validates that the item's U range (startUnit through startUnit + unitHeight - 1) does not overlap with any existing item on the same side of the same rack. Overlapping placements are rejected with a 409 Conflict.

**Rationale:** Two devices can't occupy the same physical space. The API enforces this rather than relying on the UI, so bad data can't enter through direct API calls or bugs.

### 7. Optional device linking (not required)

**Decision:** RackItem has an optional `deviceId` foreign key. When linked, the rack diagram shows the device's hostname, IP, and status. When not linked, the item is just a labeled rectangle.

**Rationale:** Not everything in a rack is a "device" in IPAM terms — blank panels, cable organizers, shelves, PDUs. These should appear in the rack view without needing a Device record. Devices that ARE tracked get the benefit of showing their IP info in the rack context.

### 8. Shelves as container items with children

**Decision:** A shelf is a RackItem with `itemType: SHELF` that can contain child RackItems (`itemType: SHELF_ITEM`). Children reference the shelf via `parentId`. Shelf items don't have their own U position — they live within the shelf's footprint.

**Rationale:** Not all hardware is rackmount. Tower servers, consumer routers, NAS boxes, and other non-standard hardware sit on shelves. A 2U shelf might hold two towers side-by-side, or a router and a UPS. Rather than creating a separate "shelf contents" model, reusing RackItem with a parent-child relationship keeps the data model simple and lets shelf items link to devices the same way rackmount items do.

**Shelf item layout:** Shelf items are rendered as smaller rectangles inside the shelf's visual footprint in the SVG diagram. They're arranged left-to-right within the shelf. Each shelf item has a name, color, and optional device link — same as any rack item. They don't have startUnit or side (inherited from parent shelf).

**Alternatives considered:**
- Separate `ShelfItem` model: Duplicates most of RackItem's fields. More tables, more API endpoints, for no structural benefit.
- Free-text "contents" field on shelf: Loses the ability to link individual items to devices and track them in the diagram.

### 9. Full-depth items block both sides

**Decision:** RackItem has a `fullDepth` boolean (default false). When true, collision detection treats the item as occupying its U range on both front AND back. The item is "owned" by its specified side but blocks the opposite side.

**Rationale:** A full-depth 2U rackmount server physically occupies the entire depth of the rack — you can't mount a PDU or patch panel behind it. Without this flag, the system would happily let you place items on the back at the same U positions as a full-depth front item, which doesn't match physical reality.

**Collision detection update:** When checking for collisions on a given side, also include items from the opposite side that have `fullDepth: true`.

**Visualization:** Full-depth items appear on both the front and back views. On the "home" side (where it's mounted), it renders normally. On the opposite side, it renders with a dimmed/hatched style and a label like "Blocked by: TrueNAS" to indicate the space is unavailable without making it look like something is mounted there.

### 10. Zero-U / vertical mount items (side rails)

**Decision:** Add a `ZERO_U` value to `RackItemType`. Zero-U items have no `startUnit` or `unitHeight` — they exist in the rack but outside the U grid. They're rendered in a separate "Side Rails" section alongside the SVG diagram rather than inside it.

**Rationale:** Vertical PDUs are in virtually every homelab rack but don't consume U space. They mount on the vertical rails at the side or back. Trying to fit them into the U grid would be inaccurate. A separate side-rail list with optional device linking keeps it simple and correct.

**Schema update:** `RackItemType` gains `ZERO_U`. Zero-U items skip collision detection entirely and don't have startUnit/unitHeight (nullable, same as shelf items).

### 11. Half-width items sharing a U slot

**Decision:** Add a `halfWidth` boolean and `halfWidthPosition` enum (`LEFT`/`RIGHT`) to RackItem. Two half-width items can share the same U on the same side. Collision detection allows two half-width items at the same U/side if they're on different halves.

**Rationale:** Small 1U switches, media converters, and similar gear are physically half-width. Two fit side-by-side in a single U. Without this, users would need to create a 1U "shelf" with two children — workable but clunky for what's really just "two small things next to each other."

**Collision rules:**
- A full-width item and a half-width item at the same U/side = collision
- Two half-width items on the same half (both LEFT) = collision
- Two half-width items on opposite halves (LEFT + RIGHT) = valid
- A half-width item leaves the other half available

### 12. Asset tracking fields

**Decision:** Add optional fields to RackItem: `serialNumber`, `assetTag`, `purchaseDate`, `warrantyExpiration`. These are informational and not required.

**Rationale:** When you're standing at the rack and need to RMA something, having the serial number and warranty date right there saves a trip to a spreadsheet. These fields cost nothing to add and are valuable on hover/detail views. Purchase date + warranty expiration also enable a future "expiring warranties" dashboard widget.

**Schema additions:**
```prisma
  serialNumber       String?
  assetTag           String?
  purchaseDate       DateTime?
  warrantyExpiration DateTime?
```

## Risks / Trade-offs

**[SVG performance with full racks]** → A 48U rack with 30+ items is a lot of SVG elements. Mitigation: Each item is just a rect + text — SVG handles this easily. No animations or complex paths needed.

**[U numbering confusion]** → Some users expect top-down numbering. Mitigation: Clear U labels on the diagram. A note in the creation form explaining bottom-up convention.

**[Color accessibility]** → Color-only categorization is problematic for colorblind users. Mitigation: Items also display their name as text. Color is supplementary, not the only identifier.
