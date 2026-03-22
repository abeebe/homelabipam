## ADDED Requirements (v2.5)

### Requirement: Proxmox API client
The system SHALL connect to a Proxmox VE cluster via its REST API using token-based authentication (`PVEAPIToken=USER@REALM!TOKENID=SECRET`). The connection settings (URL, Token ID, Token Secret) are already stored in the Settings UI. The Proxmox client MUST support self-signed certificates (common in homelab Proxmox installs).

#### Scenario: Test Proxmox connection
- **WHEN** user has configured Proxmox URL and token in Settings and clicks "Test Connection"
- **THEN** the system calls `GET /api2/json/version` on the Proxmox host and reports success with the PVE version, or failure with the error

### Requirement: Discover Proxmox nodes
The system SHALL discover all nodes in the Proxmox cluster via `GET /api2/json/nodes`. Each node represents a physical server. Nodes SHALL be importable as Devices with source `PROXMOX`.

#### Scenario: Sync Proxmox nodes
- **WHEN** user triggers a Proxmox sync
- **THEN** the system fetches all nodes, creates or updates Device records (source: PROXMOX) for each node with name, IP, and status (online/offline)

### Requirement: Discover VMs and containers per node
The system SHALL fetch all VMs (`GET /api2/json/nodes/{node}/qemu`) and LXC containers (`GET /api2/json/nodes/{node}/lxc`) for each node. Each VM/container SHALL be stored as a Device with source `PROXMOX`, linked to the node's IP (if available), and tagged with the Proxmox VMID.

#### Scenario: Sync VMs from a node
- **WHEN** user triggers a Proxmox sync and node "pve-01" has 3 VMs and 2 LXC containers
- **THEN** the system creates/updates 5 Device records, each with: name (VM name), hostname, IP (from VM config network), source PROXMOX, and a reference to the parent node

### Requirement: Link Proxmox nodes to rack items
When a Device with source `PROXMOX` and type "node" is linked to a rack item, the rack item gains awareness of all VMs/containers running on that node. This link uses the existing `deviceId` on RackItem.

#### Scenario: Link Proxmox node to rack server
- **WHEN** user links device "pve-01" (Proxmox node) to rack item "Dell R730" at U8-U9
- **THEN** the rack item now shows the Proxmox node's VMs/containers in hover and detail views

### Requirement: VM list on rack item hover
When hovering over a rack item that is linked to a Proxmox node, the tooltip SHALL display the list of VMs and containers running on that node, including: VM name, VMID, status (running/stopped), and IP address (if assigned).

#### Scenario: Hover over Proxmox server in rack
- **WHEN** user hovers over "Dell R730" linked to Proxmox node "pve-01" with 3 running VMs
- **THEN** tooltip shows:
  ```
  Dell R730 · U8-U9 (front) · pve-01 · 10.10.1.50
  VMs:
    100 - ubuntu-docker (running) · 10.10.1.51
    101 - pihole (running) · 10.10.1.2
    102 - dev-sandbox (stopped)
  ```

### Requirement: VM list in rack item detail panel
The rack item detail sidebar SHALL show a "Virtual Machines" section when the linked device is a Proxmox node. The section lists all VMs/containers with: VMID, name, type (QEMU/LXC), status, CPU cores, memory, and IP. VMs SHALL be fetchable on-demand (not cached stale data).

#### Scenario: View VM details in sidebar
- **WHEN** user clicks on a rack item linked to a Proxmox node
- **THEN** the sidebar shows the standard item details PLUS a "Virtual Machines" section that fetches and displays current VM status from the Proxmox API

#### Scenario: Proxmox node offline
- **WHEN** user clicks a rack item linked to a Proxmox node that is unreachable
- **THEN** the sidebar shows "Virtual Machines" section with a warning: "Unable to reach Proxmox host — showing last known state" and displays cached data if available

### Requirement: VM-to-IP linking
VMs discovered from Proxmox that have IP addresses SHALL be cross-referenced with the IPAM IP address database. If a VM's IP matches a tracked IP, the IP status SHALL be updated to `IN_USE` and linked to the VM's Device record. This follows the same pattern as UniFi sync.

#### Scenario: VM IP auto-linking
- **WHEN** Proxmox sync discovers VM "ubuntu-docker" with IP 10.10.1.51
- **AND** the IPAM database has IP 10.10.1.51 in the 10.10.1.0/24 network
- **THEN** the system links the VM's Device record to that IPAddress and sets status to `IN_USE`

### Requirement: Proxmox data model additions
The Device model SHALL gain optional fields for Proxmox-specific metadata:
- `proxmoxVmId` (Int?) — VMID for VMs/containers (null for nodes)
- `proxmoxNodeName` (String?) — which node this VM/container runs on (null for nodes themselves)
- `proxmoxType` (String?) — "node", "qemu", or "lxc"

#### Scenario: Device record for a VM
- **GIVEN** Proxmox node "pve-01" runs VM 100 "ubuntu-docker"
- **THEN** the Device record has: name="ubuntu-docker", source=PROXMOX, proxmoxVmId=100, proxmoxNodeName="pve-01", proxmoxType="qemu"

### Requirement: Proxmox sync schedule
The system SHALL support manual sync via a "Sync Proxmox" button (like the existing "Sync UniFi" button) and optionally via a configurable auto-sync interval in Settings.

#### Scenario: Manual sync
- **WHEN** user clicks "Sync Proxmox" on the Devices page
- **THEN** the system fetches all nodes, VMs, and containers from the Proxmox API, creates/updates Device records, links IPs, and reports results: "Synced 2 nodes, 8 VMs, 3 containers. 6 IPs linked."

### Requirement: Proxmox settings activation
The existing Proxmox settings fields in the Settings UI (currently disabled with "coming soon") SHALL be enabled. The test connection button SHALL call the new Proxmox status endpoint.

#### Scenario: Enable Proxmox integration
- **WHEN** user fills in Proxmox URL, Token ID, and Token Secret in Settings and clicks Save
- **THEN** the fields are saved (token secret encrypted) and the "Test Connection" button becomes active

### Requirement: Audit logging
All Proxmox sync operations SHALL be logged to the audit log with action `SYNC`, entity type `Device`, and source `SYSTEM`. The changes field SHALL include sync statistics (nodes synced, VMs created/updated, IPs linked).
