## ADDED Requirements (v2)

### Requirement: Create a zero-U item
The system SHALL support a `ZERO_U` item type for hardware that mounts on the rack's side rails without consuming U space (vertical PDUs, vertical cable managers, side-mounted power strips). Zero-U items do NOT specify a starting U or unit height.

#### Scenario: Add a vertical PDU
- **WHEN** user adds item "CyberPower PDU" with type Zero-U, color purple, linked to device "pdu-01"
- **THEN** the system creates the item with no U position. It appears in the side-rail section, not in the main U grid.

#### Scenario: Multiple zero-U items
- **WHEN** a rack has two vertical PDUs (left rail, right rail) and a vertical cable manager
- **THEN** all three appear in the side-rail list. No collision detection applies — zero-U items are outside the U grid.

### Requirement: Zero-U validation
- Zero-U items MUST NOT have startUnit or unitHeight values
- Zero-U items MUST NOT be flagged as fullDepth or halfWidth
- Zero-U items CAN link to a Device record
- Zero-U items CAN have asset tracking fields (serial, warranty, etc.)

### Requirement: Zero-U visualization
Zero-U items SHALL be displayed in a "Side Rails" section adjacent to the SVG rack diagram (not inside it). Each item shows: name, color dot, and linked device info if present. Clicking a zero-U item opens the same detail/edit panel as any other rack item.

#### Scenario: Side rail section
- **WHEN** user views a rack with 2 vertical PDUs
- **THEN** below or beside the rack diagram, a "Side Rails" section lists both PDUs with their names, colors, and device links
