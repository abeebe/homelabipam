## ADDED Requirements (v3)

_Note: Uses the unofficial UniFi Controller API (community reverse-engineered). The official Integration API v1 is read-only as of March 2026. This spec will be revisited if Ubiquiti ships official write endpoints._

### Requirement: UniFi Controller session authentication
The system SHALL support cookie-based authentication to the UniFi Controller's internal API (separate from the Integration API key used for reads). The user configures controller username and password in Settings. The system maintains an authenticated session for write operations.

#### Scenario: Configure write credentials
- **WHEN** user enters UniFi controller username and password in Settings alongside the existing API key
- **THEN** the system stores the credentials (password encrypted) and can authenticate for write operations

### Requirement: Push DHCP reservations to UniFi
When an IP address is assigned to a device in IPAM (status IN_USE with a linked device that has a MAC address), the system SHALL offer to create a DHCP fixed IP reservation on the UniFi controller. This pushes the IP assignment to the network infrastructure so the device always gets the same IP.

#### Scenario: Create DHCP reservation from IPAM
- **WHEN** user assigns IP 10.10.1.50 to device "proxmox-01" (MAC: aa:bb:cc:dd:ee:ff) and clicks "Push to UniFi"
- **THEN** the system calls `PUT api/s/{site}/upd/user/{userId}` with `use_fixedip: true`, `fixed_ip: "10.10.1.50"`, `network_id: "{networkId}"`
- **AND** confirms: "DHCP reservation created on UniFi: 10.10.1.50 → aa:bb:cc:dd:ee:ff"

#### Scenario: Bulk push reservations
- **WHEN** user selects multiple IP assignments on the network detail view and clicks "Push All to UniFi"
- **THEN** the system creates DHCP reservations for each selected assignment that has a linked device with a MAC address

### Requirement: Push client names to UniFi
When a device is renamed in IPAM, the system SHALL offer to push the name update to the UniFi controller so the device name appears correctly in the UniFi dashboard.

#### Scenario: Rename device and sync
- **WHEN** user renames a UniFi-sourced device from "Unknown" to "Living Room AP" and the "Sync name to UniFi" checkbox is checked
- **THEN** the system calls the UniFi client update endpoint with the new name

### Requirement: Remove DHCP reservation from UniFi
When an IP assignment is removed in IPAM (device unlinked or IP deleted), the system SHALL offer to remove the corresponding DHCP reservation from UniFi.

#### Scenario: Unlink device clears reservation
- **WHEN** user unlinks a device from an IP that had a pushed DHCP reservation and confirms "Also remove UniFi reservation?"
- **THEN** the system calls the UniFi API to disable the fixed IP for that client

### Requirement: Sync conflict detection
Before pushing a change to UniFi, the system SHALL check the current state on the controller. If the UniFi state differs from what IPAM expects (e.g., someone changed the reservation directly on the controller), the system SHALL warn the user and let them choose: overwrite UniFi, pull from UniFi, or cancel.

#### Scenario: Conflicting reservation
- **WHEN** IPAM wants to push 10.10.1.50 for device "nas-01" but UniFi already has 10.10.1.60 reserved for that MAC
- **THEN** the system shows: "Conflict: UniFi has 10.10.1.60 reserved for this device. IPAM has 10.10.1.50. Overwrite UniFi / Pull to IPAM / Cancel"

### Requirement: Write operations are opt-in and confirmable
All write operations to UniFi SHALL require explicit user action (button click, not automatic). Each write SHALL show a confirmation with what will change on the controller before executing. There is NO automatic bidirectional sync — writes are always manual and intentional.

#### Scenario: No accidental pushes
- **WHEN** user edits an IP assignment in IPAM
- **THEN** the change is saved locally only. A "Push to UniFi" button appears but is not automatically triggered.

### Requirement: Write operation audit logging
All write operations to the UniFi controller SHALL be logged to the audit log with action `SYNC`, entity type `Device` or `IPAddress`, source `USER`, and details including what was pushed and the controller's response.

### Requirement: Unofficial API compatibility notice
The Settings page SHALL display a notice when UniFi write credentials are configured: "Write operations use the UniFi Controller's internal API. This is not officially supported by Ubiquiti and may break after controller updates. Read operations continue to use the stable Integration API."
