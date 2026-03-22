## ADDED Requirements (v2)

### Requirement: Asset tracking fields on rack items
Each rack item SHALL support optional asset tracking fields: serial number, asset tag, purchase date, and warranty expiration date. These fields are informational and not required for item creation.

#### Scenario: Add server with asset info
- **WHEN** user creates a rack item "Dell R730" and fills in serial number "ABCD1234", asset tag "SRV-003", purchase date 2024-06-15, warranty expires 2027-06-15
- **THEN** all fields are stored and visible in the item detail panel and hover tooltip

#### Scenario: Partial asset info
- **WHEN** user only fills in serial number and leaves other asset fields blank
- **THEN** the system saves the serial number. Missing fields display as empty/not set.

### Requirement: Asset info in detail view
The item detail panel (sidebar) SHALL display asset tracking fields when populated: serial number, asset tag, purchase date (formatted), and warranty expiration with visual indicator for expired/expiring-soon warranties.

#### Scenario: Warranty expiring soon
- **WHEN** an item's warranty expires within 90 days
- **THEN** the detail panel shows the warranty date with a yellow warning indicator: "Expires in 47 days"

#### Scenario: Warranty expired
- **WHEN** an item's warranty has passed
- **THEN** the detail panel shows the warranty date with a red indicator: "Expired 6 months ago"

### Requirement: Asset info in hover tooltip
The hover tooltip SHALL include serial number and warranty status (if populated) alongside the existing item name, U range, and device info.

### Requirement: Asset info on search and filter (future consideration)
Asset tracking fields SHOULD be searchable from the rack list view — find a rack item by serial number or asset tag across all racks.
