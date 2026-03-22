## ADDED Requirements (v2)

### Requirement: Half-width item placement
The system SHALL support a `halfWidth` flag on rack items. Half-width items occupy only the left or right half of a U slot. Two half-width items MAY share the same U on the same side if they are on opposite halves (LEFT and RIGHT).

#### Scenario: Two half-width switches side by side
- **WHEN** user adds "TP-Link 8-port" as half-width LEFT at U2 (front) and "Netgear 5-port" as half-width RIGHT at U2 (front)
- **THEN** both items are placed at U2, rendered side-by-side in the diagram

#### Scenario: Half-width collision on same half
- **WHEN** a half-width LEFT item exists at U2 (front) and user tries to add another half-width LEFT at U2 (front)
- **THEN** the system rejects with 409: "Conflict: U2 LEFT (front) is occupied by 'TP-Link 8-port'"

#### Scenario: Full-width blocks half-width
- **WHEN** a full-width item exists at U2 (front) and user tries to add a half-width item at U2 (front)
- **THEN** the system rejects — a full-width item occupies both halves

#### Scenario: Half-width blocks full-width
- **WHEN** a half-width item exists at U2 LEFT (front) and user tries to add a full-width item at U2 (front)
- **THEN** the system rejects — the left half is already occupied

### Requirement: Half-width visualization
Half-width items SHALL render as rectangles occupying the left or right half of their U slot in the SVG diagram. Each half has its own color and label.

#### Scenario: Render half-width pair
- **WHEN** U2 (front) has a LEFT item (green, "TP-Link") and RIGHT item (green, "Netgear")
- **THEN** the SVG renders two rectangles side-by-side within U2, each taking half the width, each with its own label

### Requirement: Half-width validation
- Half-width items MUST specify `halfWidthPosition` (LEFT or RIGHT)
- Half-width items MUST have `unitHeight: 1` (multi-U half-width items are not supported)
- Half-width and fullDepth are mutually exclusive
- Shelves and shelf items cannot be half-width
