## ADDED Requirements

### Requirement: SVG rack diagram
The system SHALL render a visual rack diagram as an inline SVG. The diagram MUST show: rack frame with U markings, occupied slots filled with colored rectangles, item names as text labels, and empty slots as a subtle grid pattern. The diagram height scales with the rack's total U count.

#### Scenario: Render a 12U rack
- **WHEN** user views a 12U rack with 3 items on the front
- **THEN** the SVG renders a 12-slot rack frame with U1 at the bottom, U12 at the top, colored rectangles for each item spanning their U range, and item names centered in each rectangle

### Requirement: Front/back toggle
The system SHALL provide a toggle (tabs or buttons) to switch between front and back views of the rack. Each view shows only the items mounted on that side. The active view MUST be visually indicated.

#### Scenario: Switch to back view
- **WHEN** user clicks "Back" toggle
- **THEN** the diagram re-renders showing only back-mounted items (e.g., patch panels, PDUs) and the toggle highlights "Back" as active

### Requirement: U numbering
The diagram SHALL display U numbers along the left edge, numbered from U1 (bottom) to U(total) (top), matching the EIA-310 industry standard. Every U position MUST be labeled.

### Requirement: Color-coded items
Each rack item SHALL render in its assigned color. The system SHALL provide preset color options:
- Blue (#3b82f6) — Servers/compute
- Green (#22c55e) — Networking
- Orange (#f97316) — Storage
- Purple (#a855f7) — Power/UPS
- Gray (#6b7280) — Other/blank panels

A custom color picker SHALL be available for non-standard colors.

### Requirement: Hover/click detail
When the user hovers over or clicks a rack item in the diagram, the system SHALL display a tooltip or detail panel showing: item name, U range (e.g., "U8-U9"), side, and linked device info (hostname, IP, status) if a device is linked.

#### Scenario: Hover over linked item
- **WHEN** user hovers over a rack item linked to device "proxmox-node-1" with IP 10.10.1.50
- **THEN** tooltip shows: "TrueNAS · U8-U9 (front) · proxmox-node-1 · 10.10.1.50 · IN_USE"

#### Scenario: Hover over unlinked item
- **WHEN** user hovers over "Cable Management" with no device link
- **THEN** tooltip shows: "Cable Management · U15 (back)"

### Requirement: Shelf rendering
Shelf items SHALL render visually distinct from standard rackmount items. The shelf itself renders as a container rectangle (with a shelf-style visual — e.g., a subtle border or hatched background). Child items on the shelf render as smaller rectangles arranged left-to-right within the shelf's footprint. Each child item displays its own name and color.

#### Scenario: Render a 4U shelf with two towers
- **WHEN** a shelf at U3 with 4U total height contains "Gaming Tower" (blue) and "Plex Server" (orange)
- **THEN** the SVG renders the shelf frame spanning U3-U6, with two colored rectangles side-by-side inside it, each labeled with its name

#### Scenario: Hover over shelf item
- **WHEN** user hovers over "Plex Server" on a shelf, linked to device "plex-01" at 10.10.1.30
- **THEN** tooltip shows: "Plex Server · Shelf: Install Shelf (U3-U4) · plex-01 · 10.10.1.30 · IN_USE"

#### Scenario: Click shelf to manage contents
- **WHEN** user clicks on a shelf in the diagram
- **THEN** the sidebar shows the shelf detail with a list of items on the shelf and an "Add Item to Shelf" button

### Requirement: Full-depth item rendering
Full-depth items SHALL appear on both front and back views. On the item's mounted side, it renders normally. On the opposite side, it renders with a dimmed/hatched style and a label indicating it's blocked (e.g., "Blocked by: TrueNAS") so the user can see why those U positions are unavailable.

#### Scenario: Full-depth server on front view
- **WHEN** "TrueNAS" is a full-depth 2U item at U8-U9, mounted on the front
- **THEN** the front view renders it normally as a colored rectangle with its name

#### Scenario: Full-depth server on back view
- **WHEN** user switches to back view and U8-U9 are blocked by a full-depth front item
- **THEN** the back view renders U8-U9 with a dimmed/hatched rectangle labeled "Blocked by: TrueNAS" — visually distinct from mounted items and empty slots

### Requirement: Empty slot interaction
Clicking an empty U slot SHALL open the "Add Item" form with the starting U pre-filled to the clicked slot and the current view's side (front/back) pre-selected.

#### Scenario: Click empty slot to add
- **WHEN** user clicks the empty space at U15 on the front view
- **THEN** the "Add Item" form opens with starting U = 15 and side = Front pre-filled

### Requirement: Drag to reposition (stretch goal)
The system SHOULD support drag-and-drop to reposition items within the rack diagram. Dropping on an occupied slot shows a collision error. This is a nice-to-have, not a blocker.

### Requirement: Responsive sizing
The rack diagram SHALL be readable on screens from 768px width (tablet) up. On narrow screens, the diagram takes full width. On wider screens, the diagram sits alongside a sidebar with rack details and item list.
