# Homelab IPAM

A self-hosted IP Address Management tool built for homelabs. Track networks, VLANs, IP addresses, and devices — with optional auto-discovery via UniFi.

## Features

- **Network management** — define subnets with CIDR, VLAN ID, gateway, and description
- **IP tracking** — assign statuses (`AVAILABLE`, `IN_USE`, `RESERVED`) with free-text descriptions
- **Subnet visualiser** — colour-coded grid view of every address in a subnet
- **Auto-populate** — fill an entire subnet with `AVAILABLE` addresses in one click
- **Device inventory** — track devices by MAC, hostname, and vendor; link them to IP assignments
- **UniFi sync** — pull clients and networks directly from a UniFi controller
- **Audit log** — every create, update, delete, sync, and populate operation is logged with before/after diffs
- **Settings UI** — configure integrations through the browser; no manual config file edits required

---

## Quick Start (Docker)

The fastest way to run the full stack. No local Node or PostgreSQL required.

```bash
git clone https://github.com/abeebe/homelabipam
cd ipam
docker-compose up
```

The app will be available at **http://localhost:3000**.

On first start the container automatically runs database migrations before starting the server. Data is persisted in a named Docker volume (`postgres_data`), so `docker-compose down` (without `-v`) keeps your data intact.

### Updating

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up
```

---

## Development Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ running locally

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` if your PostgreSQL credentials differ from the defaults:

```env
DATABASE_URL=postgresql://ipam:ipam@localhost:5432/ipam
```

### 3. Create the database and run migrations

```bash
# Create the database (if it doesn't exist yet)
createdb -U ipam ipam

# Apply migrations
npx prisma migrate deploy --schema=app/prisma/schema.prisma
```

### 4. Start the dev servers

```bash
npm run dev
```

This starts both the Vite dev server (http://localhost:5173) and the Express API server (http://localhost:3000) concurrently. The Vite server proxies all `/api/*` requests to Express.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://ipam:ipam@localhost:5432/ipam` | PostgreSQL connection string |
| `API_PORT` | `3000` | Port the Express server listens on |
| `NODE_ENV` | — | Set to `production` in Docker |
| `UNIFI_URL` | — | Base URL of your UniFi controller, e.g. `https://10.10.1.1` |
| `UNIFI_API_KEY` | — | Network Integration API key (UniFi OS → Settings → Integrations) |
| `PROXMOX_URL` | — | Proxmox node URL *(coming soon)* |
| `PROXMOX_TOKEN_ID` | — | Proxmox API token ID *(coming soon)* |
| `PROXMOX_TOKEN_SECRET` | — | Proxmox API token secret *(coming soon)* |

All integration credentials can also be configured through **Settings** in the UI and are stored in the database, so environment variables are entirely optional for integrations.

---

## Scripts

```bash
npm run dev            # Start client + server with hot reload
npm run dev:client     # Vite dev server only (port 5173)
npm run dev:server     # Express server only with nodemon (port 3000)

npm run build          # Production build (client + server)
npm run build:client   # Vite build → client-dist/
npm run build:server   # TypeScript compile → dist/server/

npm run start          # Run the compiled production server
```

---

## Architecture

```
ipam/
├── app/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   └── migrations/            # SQL migration history
│   └── src/
│       ├── client/                # React + Vite frontend
│       │   ├── components/        # Page and UI components
│       │   ├── api.ts             # Typed API client
│       │   ├── types.ts           # Shared TypeScript types
│       │   └── styles.css         # Global styles
│       └── server/                # Express backend
│           ├── routes/            # API route handlers
│           │   ├── networks.ts
│           │   ├── ipaddresses.ts
│           │   ├── settings.ts
│           │   ├── unifi.ts
│           │   └── auditlog.ts
│           ├── utils/audit.ts     # Fire-and-forget audit helper
│           ├── prisma.ts          # Prisma client singleton
│           └── app.ts             # Express app setup
├── Dockerfile
├── docker-compose.yml
├── docker-entrypoint.sh           # Runs migrations then starts server
└── vite.config.ts
```

**Stack:** React 18 · React Router 7 · Vite · TypeScript · Express · Prisma 7 · PostgreSQL

---

## Data Model

| Model | Description |
|---|---|
| `Network` | A subnet: name, CIDR, optional VLAN ID, gateway, and description |
| `IPAddress` | An address within a network: status (`AVAILABLE` / `IN_USE` / `RESERVED`) + description |
| `Device` | A device optionally linked to an IP; source = `MANUAL`, `UNIFI`, or `PROXMOX` |
| `Setting` | Key/value store for integration credentials (sensitive values encrypted at rest) |
| `AuditLog` | Immutable record of every state change with before/after diffs |

---

## API Reference

All endpoints are prefixed with `/api/`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/networks` | List all networks (includes IPs) |
| `POST` | `/api/networks` | Create a network |
| `PUT` | `/api/networks/:id` | Update a network |
| `DELETE` | `/api/networks/:id` | Delete a network and all its IPs |
| `POST` | `/api/networks/:id/populate` | Auto-create all host IPs as AVAILABLE |
| `GET` | `/api/ipaddresses` | List IPs (filterable: `?networkId=`) |
| `POST` | `/api/ipaddresses` | Create an IP address |
| `PUT` | `/api/ipaddresses/:id` | Update status / description |
| `DELETE` | `/api/ipaddresses/:id` | Delete an IP address |
| `GET` | `/api/settings` | Get all settings (sensitive values masked) |
| `PUT` | `/api/settings` | Save settings |
| `POST` | `/api/unifi/sync` | Trigger a UniFi sync |
| `GET` | `/api/auditlog` | Paginated audit log (`?page=1&limit=50&entityType=Network&action=DELETE`) |

---

## UniFi Integration

1. In UniFi OS, go to **Settings → System → Integrations** and create a Network Integration Key.
2. In the IPAM UI, go to **Settings**, enter your controller URL and API key, and click **Save Settings**.
3. Go to the **Devices** page and click **Sync UniFi** to import clients and networks. Subsequent syncs reconcile IP assignments automatically.

---

## License

MIT
