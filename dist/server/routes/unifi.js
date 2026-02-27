"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const unifi_1 = require("../utils/unifi");
const audit_1 = require("../utils/audit");
const router = (0, express_1.Router)();
// GET /api/unifi/status
router.get('/status', async (_req, res) => {
    try {
        const result = await (0, unifi_1.testConnection)();
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ connected: false, error: err.message });
    }
});
// GET /api/unifi/sites
router.get('/sites', async (_req, res) => {
    try {
        const sites = await (0, unifi_1.getSites)();
        res.json(sites);
    }
    catch (err) {
        res.status(503).json({ error: `Failed to reach UniFi controller: ${err.message}` });
    }
});
// POST /api/unifi/discover
router.post('/discover', async (_req, res) => {
    const results = { sites: 0, discovered: 0, synced: 0, errors: [] };
    try {
        const sites = await (0, unifi_1.getSites)();
        results.sites = sites.length;
        for (const site of sites) {
            let clients = [];
            let devices = [];
            try {
                [clients, devices] = await Promise.all([(0, unifi_1.getClients)(site.id), (0, unifi_1.getDevices)(site.id)]);
            }
            catch (err) {
                results.errors.push(`Site ${site.name}: ${err.message}`);
                continue;
            }
            const allEntries = [
                ...clients.map(c => ({ mac: c.macAddress?.toLowerCase(), ip: c.ipAddress, name: c.name || c.macAddress, vendor: undefined, lastSeen: c.connectedAt ? new Date(c.connectedAt).getTime() / 1000 : undefined })),
                ...devices.map(d => ({ mac: d.macAddress?.toLowerCase(), ip: d.ipAddress, name: d.name || d.model || d.macAddress, vendor: d.model, lastSeen: undefined })),
            ].filter(e => e.mac);
            results.discovered += allEntries.length;
            for (const entry of allEntries) {
                try {
                    let ipAddressId = null;
                    if (entry.ip) {
                        const ipRecord = await prisma_1.prisma.iPAddress.findFirst({ where: { address: entry.ip } });
                        if (ipRecord) {
                            ipAddressId = ipRecord.id;
                            await prisma_1.prisma.iPAddress.update({ where: { id: ipRecord.id }, data: { status: 'IN_USE' } });
                        }
                    }
                    await prisma_1.prisma.device.upsert({
                        where: { macAddress: entry.mac },
                        create: { name: entry.name, macAddress: entry.mac, vendor: entry.vendor ?? null, source: 'UNIFI', lastSeen: entry.lastSeen ? new Date(entry.lastSeen * 1000) : new Date(), ipAddressId },
                        update: { name: entry.name, vendor: entry.vendor ?? null, source: 'UNIFI', lastSeen: entry.lastSeen ? new Date(entry.lastSeen * 1000) : new Date(), ...(ipAddressId && { ipAddressId }) },
                    });
                    results.synced++;
                }
                catch (err) {
                    results.errors.push(`Device ${entry.mac}: ${err.message}`);
                }
            }
        }
        res.json(results);
    }
    catch (err) {
        res.status(503).json({ error: `Failed to reach UniFi controller: ${err.message}`, results });
    }
});
// POST /api/unifi/sync - Full sync with reconciliation
router.post('/sync', async (_req, res) => {
    const results = {
        sites: 0,
        networks: { created: 0, updated: 0 },
        ipAddresses: { created: 0, updated: 0 },
        devices: { synced: 0 },
        reconciled: 0,
        errors: [],
    };
    try {
        const sites = await (0, unifi_1.getSites)();
        results.sites = sites.length;
        for (const site of sites) {
            let unifiNetworks = [];
            let clients = [];
            let devices = [];
            try {
                [unifiNetworks, clients, devices] = await Promise.all([
                    (0, unifi_1.getNetworks)(site.id),
                    (0, unifi_1.getClients)(site.id),
                    (0, unifi_1.getDevices)(site.id),
                ]);
            }
            catch (err) {
                results.errors.push(`Site ${site.name}: ${err.message}`);
                continue;
            }
            // All IPs seen in this sync (private only)
            const allIPs = [
                ...clients.filter(c => c.ipAddress).map(c => ({ mac: c.macAddress?.toLowerCase(), ip: c.ipAddress })),
                ...devices.filter(d => d.ipAddress && !d.ipAddress.startsWith('73.')).map(d => ({ mac: d.macAddress?.toLowerCase(), ip: d.ipAddress })),
            ];
            const seenIPSet = new Set(allIPs.map(e => e.ip));
            // Group into /24 subnets
            const subnetGroups = new Map();
            for (const entry of allIPs) {
                const prefix = entry.ip.split('.').slice(0, 3).join('.');
                if (!subnetGroups.has(prefix))
                    subnetGroups.set(prefix, []);
                subnetGroups.get(prefix).push(entry);
            }
            // Upsert networks
            const prefixToNetworkId = new Map();
            for (const [prefix] of subnetGroups) {
                const cidr = `${prefix}.0/24`;
                const gateway = `${prefix}.1`;
                const thirdOctet = parseInt(prefix.split('.')[2]);
                const matched = unifiNetworks.find(n => n.vlanId === thirdOctet);
                const name = matched?.name ?? cidr;
                const vlanId = matched?.vlanId ?? null;
                try {
                    let network = await prisma_1.prisma.network.findFirst({ where: { cidr } });
                    if (!network) {
                        network = await prisma_1.prisma.network.create({ data: { name, cidr, gateway, vlanId } });
                        results.networks.created++;
                    }
                    else {
                        network = await prisma_1.prisma.network.update({ where: { id: network.id }, data: { name, vlanId } });
                        results.networks.updated++;
                    }
                    prefixToNetworkId.set(prefix, network.id);
                }
                catch (err) {
                    results.errors.push(`Network ${cidr}: ${err.message}`);
                }
            }
            // Upsert IP addresses
            for (const { mac, ip } of allIPs) {
                const prefix = ip.split('.').slice(0, 3).join('.');
                const networkId = prefixToNetworkId.get(prefix);
                if (!networkId)
                    continue;
                try {
                    let ipRecord = await prisma_1.prisma.iPAddress.findFirst({ where: { address: ip } });
                    if (!ipRecord) {
                        ipRecord = await prisma_1.prisma.iPAddress.create({ data: { address: ip, networkId, status: 'IN_USE' } });
                        results.ipAddresses.created++;
                    }
                    else {
                        ipRecord = await prisma_1.prisma.iPAddress.update({ where: { id: ipRecord.id }, data: { status: 'IN_USE', networkId } });
                        results.ipAddresses.updated++;
                    }
                    if (mac) {
                        const device = await prisma_1.prisma.device.findUnique({ where: { macAddress: mac } });
                        if (device && device.ipAddressId !== ipRecord.id) {
                            await prisma_1.prisma.device.update({ where: { macAddress: mac }, data: { ipAddressId: ipRecord.id } });
                        }
                    }
                }
                catch (err) {
                    results.errors.push(`IP ${ip}: ${err.message}`);
                }
            }
            // Upsert devices
            const allEntries = [
                ...clients.map(c => ({ mac: c.macAddress?.toLowerCase(), ip: c.ipAddress, name: c.name || c.macAddress, vendor: undefined, lastSeen: c.connectedAt ? new Date(c.connectedAt).getTime() / 1000 : undefined })),
                ...devices.map(d => ({ mac: d.macAddress?.toLowerCase(), ip: d.ipAddress, name: d.name || d.model || d.macAddress, vendor: d.model, lastSeen: undefined })),
            ].filter(e => e.mac);
            for (const entry of allEntries) {
                try {
                    const ipRecord = entry.ip ? await prisma_1.prisma.iPAddress.findFirst({ where: { address: entry.ip } }) : null;
                    await prisma_1.prisma.device.upsert({
                        where: { macAddress: entry.mac },
                        create: { name: entry.name, macAddress: entry.mac, vendor: entry.vendor ?? null, source: 'UNIFI', lastSeen: entry.lastSeen ? new Date(entry.lastSeen * 1000) : new Date(), ipAddressId: ipRecord?.id ?? null },
                        update: { name: entry.name, vendor: entry.vendor ?? null, source: 'UNIFI', lastSeen: entry.lastSeen ? new Date(entry.lastSeen * 1000) : new Date(), ...(ipRecord && { ipAddressId: ipRecord.id }) },
                    });
                    results.devices.synced++;
                }
                catch (err) {
                    results.errors.push(`Device ${entry.mac}: ${err.message}`);
                }
            }
            // ── Reconciliation ────────────────────────────────────────────────────────
            // Mark IPs as AVAILABLE if they had a UniFi device but weren't seen this sync
            const seenIPArray = Array.from(seenIPSet);
            for (const networkId of Array.from(prefixToNetworkId.values())) {
                try {
                    const staleIPs = await prisma_1.prisma.iPAddress.findMany({
                        where: {
                            networkId,
                            status: 'IN_USE',
                            device: { source: 'UNIFI' },
                            NOT: { address: { in: seenIPArray } },
                        },
                        include: { device: true },
                    });
                    for (const ip of staleIPs) {
                        await prisma_1.prisma.iPAddress.update({ where: { id: ip.id }, data: { status: 'AVAILABLE' } });
                        if (ip.device) {
                            await prisma_1.prisma.device.update({ where: { id: ip.device.id }, data: { ipAddressId: null } });
                        }
                        results.reconciled++;
                    }
                }
                catch (err) {
                    results.errors.push(`Reconcile network ${networkId}: ${err.message}`);
                }
            }
        }
        await (0, audit_1.writeAudit)({
            action: 'SYNC',
            entityType: 'Device',
            entityName: `UniFi sync — ${results.sites} site(s)`,
            source: 'SYSTEM',
            changes: {
                networks: results.networks,
                ipAddresses: results.ipAddresses,
                devices: results.devices,
                reconciled: results.reconciled,
                errors: results.errors.length,
            },
        });
        res.json(results);
    }
    catch (err) {
        res.status(503).json({ error: `Failed to reach UniFi controller: ${err.message}`, results });
    }
});
// GET /api/unifi/devices
router.get('/devices', async (_req, res) => {
    try {
        const devices = await prisma_1.prisma.device.findMany({
            where: { source: 'UNIFI' },
            include: { ipAddress: { include: { network: true } } },
            orderBy: { lastSeen: 'desc' },
        });
        res.json(devices);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
