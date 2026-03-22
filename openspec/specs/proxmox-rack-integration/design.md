## Context

The IPAM already has a UniFi integration pattern: API client utility, dedicated routes, sync endpoint, device creation with source tagging, IP auto-linking. The Proxmox integration follows this same pattern but adds VM/container awareness that surfaces in the rack view.

The Proxmox API uses token-based auth: `Authorization: PVEAPIToken=USER@REALM!TOKENID=SECRET`. All endpoints are under `/api2/json/`. Self-signed certs are the norm in homelab Proxmox installs.

## Goals / Non-Goals

**Goals:**
- Discover Proxmox nodes, VMs, and LXC containers as Device records
- Show VMs/containers on rack item hover and detail panel for linked Proxmox nodes
- Auto-link VM IPs to IPAM IP addresses
- Follow existing UniFi integration patterns exactly

**Non-Goals:**
- VM management (start/stop/migrate) from IPAM
- Proxmox storage or backup tracking
- Cluster HA status monitoring
- Real-time VM metrics (CPU/memory graphs)
- Proxmox firewall rule management

## Decisions

### 1. Proxmox API endpoints used

| Endpoint | Purpose |
|----------|---------|
| `GET /api2/json/version` | Test connection |
| `GET /api2/json/nodes` | Discover nodes |
| `GET /api2/json/nodes/{node}/qemu` | List VMs on a node |
| `GET /api2/json/nodes/{node}/lxc` | List containers on a node |
| `GET /api2/json/nodes/{node}/qemu/{vmid}/config` | Get VM network config (for IPs) |
| `GET /api2/json/nodes/{node}/lxc/{vmid}/config` | Get container network config |
| `GET /api2/json/nodes/{node}/qemu/{vmid}/agent/network-get-interfaces` | Get live IPs via QEMU agent (if running) |

### 2. Device hierarchy: nodes → VMs/containers

Nodes are stored as Devices with `proxmoxType: "node"`. VMs and containers are also Devices with `proxmoxType: "qemu"` or `"lxc"` and `proxmoxNodeName` pointing to their parent node. This flat-with-reference approach matches how UniFi devices are stored (no nested model).

The rack view queries VMs by `proxmoxNodeName` matching the linked device's name. No additional join table needed.

### 3. IP discovery from VM config

VMs may have IPs available from:
1. **QEMU guest agent** (`network-get-interfaces`) — most reliable, gives live IPs
2. **VM config** (`net0`, `net1` fields) — gives static IPs if configured
3. **ARP/DHCP from UniFi** — if UniFi sync is also active, VMs may already be discovered as UniFi clients

Priority: QEMU agent > VM config > existing UniFi data. If agent isn't running, fall back to config parsing.

### 4. On-demand VM fetch for rack hover/detail

The rack detail panel fetches live VM data when the user clicks a Proxmox-linked item (not on page load for every item). This keeps the page fast and ensures VM status is current. A lightweight cache (60-second TTL) prevents hammering the Proxmox API during rapid clicks.

### 5. Schema additions are minimal

Only 3 nullable fields added to the existing Device model — no new tables. This keeps the migration simple and the data model flat.

## Risks / Trade-offs

**[Self-signed certs]** → Proxmox homelab installs almost always use self-signed certs. The Axios client must disable strict SSL verification (same as the UniFi client does).

**[QEMU agent not running]** → Many VMs don't have the guest agent installed. IP discovery falls back to config parsing, which only works for statically configured IPs. Dynamic/DHCP IPs won't be discoverable without the agent.

**[Large clusters]** → A Proxmox cluster with 10 nodes and 200 VMs generates 210+ Device records. The sync should be incremental (update existing, create new) and the rack hover should only fetch VMs for the clicked node, not the whole cluster.

**[Stale VM data]** → VMs can be migrated between nodes. The sync updates `proxmoxNodeName` to reflect the current host. Between syncs, the data may be stale. The detail panel's on-demand fetch mitigates this for the rack view.
