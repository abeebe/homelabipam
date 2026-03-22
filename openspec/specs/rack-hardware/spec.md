## ADDED Requirements

### Requirement: Add hardware to a rack
The system SHALL allow the user to add a hardware item to a rack by specifying: name, starting U position, U height (how many U it occupies), mounting side (front or back), and color. Optionally, the user may link the item to an existing Device record.

#### Scenario: Add a 2U server to the front
- **WHEN** user adds item "TrueNAS" starting at U8, height 2U, side Front, color blue
- **THEN** the system creates the item occupying U8-U9 on the front of the rack

#### Scenario: Add a patch panel to the back
- **WHEN** user adds item "48-port Patch Panel" starting at U24, height 1U, side Back, color green
- **THEN** the system creates the item at U24 on the back of the rack

#### Scenario: Link to existing device
- **WHEN** user adds a rack item and selects device "proxmox-node-1" from the device dropdown
- **THEN** the rack item displays the device's hostname, IP address, and status alongside the item name

### Requirement: Add a shelf to a rack
The system SHALL support a "Shelf" item type. A shelf is a rack item that can contain child items (non-rackmount hardware like towers, routers, consumer NAS, etc.). When adding an item, the user selects the type: Mounted (standard rackmount), Shelf, or Shelf Item (goes on a shelf).

#### Scenario: Add a shelf with tall devices
- **WHEN** user adds item "Install Shelf" starting at U3, type Shelf, side Front, and specifies total device height as 4U (the towers on the shelf are 4U tall)
- **THEN** the system creates the shelf reserving U3-U6 (4U total). The shelf appears in the rack diagram as a container spanning those units.

#### Scenario: Add a shelf with short devices
- **WHEN** user adds item "Network Shelf" starting at U20, type Shelf, total device height 2U
- **THEN** the system creates the shelf reserving U20-U21. Even though the shelf hardware is only 1U, the items on it extend to 2U total.

### Requirement: Add items to a shelf
The system SHALL allow adding child items to a shelf. Shelf items do NOT specify a starting U or side — they inherit the shelf's position. Each shelf item has: name, color, optional device link. A shelf MAY hold multiple items. Each shelf item can independently link to a Device.

#### Scenario: Place two towers on a shelf
- **WHEN** user adds "Gaming Tower" and "Plex Server" as shelf items on the "Install Shelf" at U3
- **THEN** both items appear as children of the shelf, rendered side-by-side within the shelf's visual footprint
- **AND** each can be independently linked to a Device record

#### Scenario: Shelf with router and NAS
- **WHEN** user adds shelf item "Ubiquiti UDM Pro" linked to device "udm-pro" and shelf item "Synology DS920" linked to device "nas-01"
- **THEN** both items appear on the shelf with their respective device info (hostname, IP, status)

### Requirement: Shelf item validation
- Shelf items MUST reference a valid shelf (parentId points to a RackItem with itemType SHELF)
- Shelf items MUST NOT specify startUnit or side (inherited from parent)
- Shelf items do NOT participate in rack-level collision detection (they live within the shelf's footprint)
- Deleting a shelf SHALL cascade-delete all its child items (with confirmation)

#### Scenario: Delete shelf with contents
- **WHEN** user deletes a shelf that contains 2 items
- **THEN** the system shows: "This shelf contains 2 items. Delete shelf and all contents?"
- **AND** on confirm, the shelf and both items are removed, any linked devices are unlinked

### Requirement: Full-depth items
The system SHALL support a `fullDepth` flag on rack items. When an item is marked full-depth, it blocks the same U range on both front and back. The item is mounted on its specified side but physically occupies the full depth of the rack.

#### Scenario: Add a full-depth 2U server
- **WHEN** user adds "TrueNAS" starting at U8, height 2U, side Front, fullDepth checked
- **THEN** the system creates the item on the front AND blocks U8-U9 on the back

#### Scenario: Blocked by full-depth item
- **WHEN** a full-depth item exists at U8-U9 (front) and user tries to add a 1U PDU at U8 (back)
- **THEN** the system rejects with 409: "Conflict: U8 (back) is blocked by full-depth item 'TrueNAS' (front)"

### Requirement: Collision detection
The system SHALL reject item placement if the requested U range overlaps with an existing item on the same side of the same rack, OR if a full-depth item on the opposite side occupies the same U range. The response MUST identify the conflicting item.

#### Scenario: Overlap on front
- **WHEN** a 2U item exists at U8-U9 (front) and user tries to add a 1U item at U9 (front)
- **THEN** the system rejects with 409: "Conflict: U9 (front) is occupied by 'TrueNAS'"

#### Scenario: Same U, different sides allowed (non-full-depth)
- **WHEN** a 1U item exists at U24 (front, NOT full-depth) and user adds a 1U item at U24 (back)
- **THEN** the system creates the item — front and back are independent when neither is full-depth

### Requirement: Move hardware within a rack
The system SHALL allow moving an item to a different starting U position and/or changing its side. Collision detection applies to the new position (excluding the item being moved).

#### Scenario: Move server down
- **WHEN** user moves "TrueNAS" from U8 to U4 on the front
- **THEN** the system validates U4-U5 are free (excluding TrueNAS itself), updates the position, and re-renders

### Requirement: Remove hardware from a rack
The system SHALL allow removing an item from a rack. If the item is linked to a device, the device link is cleared but the device record remains.

### Requirement: Edit hardware details
The system SHALL allow editing an item's name, color, description, and device link without changing its position. Position changes use the move operation (with collision detection).

### Requirement: Validation rules
- Starting U MUST be >= 1 and <= rack's total units
- Starting U + unit height - 1 MUST NOT exceed rack's total units
- Unit height MUST be between 1 and 16 for mounted items. For shelves, unit height represents total U consumed by shelf + contents (no limit beyond rack height)
- Name is required, max 100 characters

#### Scenario: Item exceeds rack height
- **WHEN** a 42U rack has a 4U item placed starting at U40
- **THEN** the system rejects: "Item would exceed rack height (U40-U43 in a 42U rack)"

### Requirement: Audit logging
All rack item create, update, move, and delete operations SHALL be logged to the audit log with entity type `RackItem`.
