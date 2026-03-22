## ADDED Requirements

### Requirement: Create a rack
The system SHALL allow the user to create a rack by specifying a name and total U height. The U height MUST be between 4 and 48 (inclusive). Location and description are optional.

#### Scenario: Create a standard 42U rack
- **WHEN** user fills in name "Main Rack" with 42 total units and location "Office closet"
- **THEN** the system creates the rack and displays it in the rack list

#### Scenario: Invalid U height rejected
- **WHEN** user tries to create a rack with 60 total units
- **THEN** the system rejects with a validation error: "Total units must be between 4 and 48"

### Requirement: List all racks
The system SHALL display all racks in a list view showing: name, total units, occupied units (front + back), location, and a utilization percentage.

#### Scenario: Dashboard view
- **WHEN** user navigates to the Racks page
- **THEN** the system displays all racks with name, size (e.g., "42U"), utilization (e.g., "28/42 front, 6/42 back"), and location

### Requirement: Edit a rack
The system SHALL allow editing a rack's name, location, and description. Total units MAY be increased but MUST NOT be decreased below the highest occupied U slot.

#### Scenario: Increase rack size
- **WHEN** user changes a 24U rack to 42U
- **THEN** the system updates the rack — all existing items remain in place, new empty slots appear above

#### Scenario: Decrease below occupied slot blocked
- **WHEN** a rack has an item at U20 and user tries to reduce total units to 16
- **THEN** the system rejects: "Cannot reduce to 16U — items exist above U16"

### Requirement: Delete a rack
The system SHALL allow deleting a rack. If the rack contains items, the user MUST confirm deletion. All rack items are cascade-deleted. Device links on deleted items are cleared (device remains, just unlinked from rack).

#### Scenario: Delete empty rack
- **WHEN** user deletes a rack with no items
- **THEN** the rack is removed immediately

#### Scenario: Delete rack with items
- **WHEN** user deletes a rack containing 5 items
- **THEN** the system shows a confirmation: "This rack contains 5 items. Delete rack and all items?"
- **AND** on confirm, all items are deleted and any linked devices are unlinked

### Requirement: Audit logging
All rack create, update, and delete operations SHALL be logged to the audit log with entity type `Rack`.
