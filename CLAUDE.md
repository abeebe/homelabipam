# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Homelab IPAM** is a self-hosted IP Address Management tool built with a React frontend and Node/Express backend. It tracks networks, VLANs, IP addresses, and devices in a homelab environment.

## Architecture

The project uses a **monorepo structure** with clearly separated client and server:

- **Frontend**: `/app/src/client` - React application built with Vite
- **Backend**: `/app/src/server` - Express API server
- **Database**: PostgreSQL with Prisma ORM (`/app/prisma/schema.prisma`)
- **TypeScript**: Separate tsconfig files for client and server

**Key Build Outputs**:
- Client builds to `/app/client-dist` (Vite output)
- Server compiles to `/dist/server` (TypeScript CommonJS)
- In development, the Vite dev server proxies `/api/*` requests to `http://localhost:3000`

## Development Commands

```bash
# Run both client and server concurrently (recommended for development)
npm run dev

# Run only the client (Vite dev server on http://localhost:5173)
npm run dev:client

# Run only the server (Express on http://localhost:3000, auto-restarts on file changes)
npm run dev:server

# Build for production
npm run build          # Builds client and server
npm run build:client   # Just the Vite build
npm run build:server   # Just the TypeScript compilation

# Start production server
npm run start          # Runs dist/server/index.js
```

## Database

**Schema Location**: `app/prisma/schema.prisma`

**Core Models**:
- **Network**: Represents networks/VLANs with CIDR, gateway, VLAN ID
- **IPAddress**: Individual IPs within a network, has status (AVAILABLE/RESERVED/IN_USE)
- **Device**: Hardware/VM devices that can be linked to IP addresses, tracked from multiple sources (MANUAL/UNIFI/PROXMOX)

**Database Setup**:
1. PostgreSQL must be running (default: `postgresql://ipam:ipam@localhost:5432/ipam`)
2. Run migrations to set up the database:
   ```bash
   npx prisma migrate deploy --schema=app/prisma/schema.prisma
   ```
3. When modifying the schema, create a new migration:
   ```bash
   # Edit app/prisma/schema.prisma, then:
   npx prisma migrate dev --schema=app/prisma/schema.prisma --name <migration_name>
   ```

**Migrations**:
- Initial schema migration at: `prisma/migrations/0_init/migration.sql`
- Migrations are version-controlled in `/prisma/migrations/`
- Migration lock file ensures consistent provider across environments

**Prisma 7 Adapter**:
This project uses Prisma 7 with the `@prisma/adapter-pg` adapter for PostgreSQL connections. The adapter is configured in `/app/src/server/prisma.ts` and manages a database pool. Key points:
- The adapter is required for Prisma 7's new engine architecture
- Always specify `--schema=app/prisma/schema.prisma` when running Prisma CLI commands since the schema is not in the default location
- To regenerate the Prisma client: `npx prisma generate --schema=app/prisma/schema.prisma`

## Server Routes

Routes are modular in `/app/src/server/routes`:
- `health.ts` - Health check endpoint
- `networks.ts` - Network management
- `ipaddresses.ts` - IP address operations

Server uses Express with CORS enabled. Vite dev server automatically proxies requests to `/api/*` to the Express server.

## Environment Variables

See `.env.example`:
- `DATABASE_URL`: PostgreSQL connection string (required for development)
- `PORT`: Server port (default: 3000)
- `UNIFI_URL`, `UNIFI_USERNAME`, `UNIFI_PASSWORD`: Optional UniFi integration
- `PROXMOX_URL`, `PROXMOX_TOKEN_ID`, `PROXMOX_TOKEN_SECRET`: Optional Proxmox integration

## Docker Deployment

Use `docker-compose.yml` to run the full stack:
```bash
docker-compose up
```

This starts:
- PostgreSQL on port 5432
- Node app on port 3000

The Dockerfile builds a Node 20 Alpine image and runs the production server.

## TypeScript Configuration

- **Root tsconfig.json**: Base configuration targeting ES2022, JSX enabled
- **tsconfig.server.json**: Server-specific (CommonJS, ES2020 target)
- **tsconfig.client.json**: Not present but handled by Vite

The `@` path alias points to `/app/src` for cleaner imports in both client and server code.

## Testing

Currently no test framework is configured (`npm test` returns an error). Tests should be added as the project grows.
