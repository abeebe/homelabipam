## ADDED Requirements (v3)

### Requirement: Cable connections between racks
The system SHALL allow users to define cable connections between rack items across racks. A connection specifies: source rack item (and optional port number), destination rack item (and optional port number), cable type label (e.g., "Cat6", "Fiber", "SFP+"), and optional description.

#### Scenario: Document a cross-rack fiber link
- **WHEN** user creates a connection from "Main Rack → Switch Port 24" to "Network Rack → Switch Port 1" with type "Fiber OM4"
- **THEN** the connection is saved and visible in both rack detail views

### Requirement: Topology view
The system SHALL provide a topology view showing all racks as simplified blocks with connection lines drawn between them. Each line represents one or more cables between the racks. Clicking a connection line shows the details (which items, which ports, cable type).

#### Scenario: View multi-rack topology
- **WHEN** user navigates to the Topology view
- **THEN** a diagram shows all racks as labeled blocks with lines between racks that have cross-connections. Line thickness or count indicates number of connections.

### Requirement: Connection list per rack
The rack detail view SHALL include a "Connections" tab listing all inbound and outbound connections to/from items in this rack. Each entry shows: local item + port, remote rack + item + port, cable type.

#### Scenario: View connections for a rack
- **WHEN** user views the "Connections" tab on Main Rack
- **THEN** a table shows all cables going to/from this rack: "Switch Port 24 → Network Rack / Switch Port 1 (Fiber OM4)"

### Requirement: Connection validation
- Both source and destination rack items MUST exist
- Port numbers (if specified) MUST be valid for items with port mapping enabled
- Connections are bidirectional — visible from both the source and destination rack
- Deleting a rack item with connections requires confirmation and cascade-deletes its connections
