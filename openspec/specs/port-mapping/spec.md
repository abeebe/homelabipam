## ADDED Requirements (v3)

### Requirement: Port mapping on patch panels and switches
Rack items with type MOUNTED SHALL optionally support a port map — a configurable list of ports with labels describing what each port connects to. The port map is a simple ordered list: port number → label.

#### Scenario: Document a 24-port patch panel
- **WHEN** user opens "24-port Patch Panel" and enables port mapping with 24 ports
- **THEN** a port table appears with rows 1-24, each with an editable label field

#### Scenario: Label ports
- **WHEN** user fills in port labels: Port 1 = "Office Desk", Port 2 = "Living Room AP", Port 3 = "Garage Camera"
- **THEN** the labels are saved and displayed in the port map table

#### Scenario: View port map in detail
- **WHEN** user clicks the patch panel in the rack diagram
- **THEN** the sidebar shows the port map with all labeled ports, searchable/filterable

### Requirement: Port count configuration
When enabling port mapping, the user SHALL specify the total number of ports. Common presets (8, 12, 16, 24, 48) with custom option. Port count can be changed later (adding ports appends empty rows, reducing ports requires confirmation if labeled ports would be removed).

### Requirement: Port map visualization
In the rack diagram, items with port mapping SHALL display a small indicator icon (e.g., a grid icon) to signal that port-level documentation is available. Clicking opens the port map in the sidebar.

### Requirement: Port search across racks
The system SHALL support searching port labels across all racks — "find which port goes to the garage camera" without knowing which rack or patch panel it's on.

#### Scenario: Search for a port
- **WHEN** user searches for "Garage Camera" in the port search
- **THEN** results show: "Main Rack → 24-port Patch Panel → Port 3: Garage Camera"
