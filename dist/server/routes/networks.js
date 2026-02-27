"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const audit_1 = require("../utils/audit");
const router = (0, express_1.Router)();
// Get all networks
router.get('/', async (_, res) => {
    try {
        const networks = await prisma_1.prisma.network.findMany({
            include: { ipAddresses: true }
        });
        res.json(networks);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get network by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const network = await prisma_1.prisma.network.findUnique({
            where: { id },
            include: { ipAddresses: { include: { device: true } } }
        });
        if (!network)
            return res.status(404).json({ error: 'Network not found' });
        res.json(network);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Create network
router.post('/', async (req, res) => {
    try {
        const { name, vlanId, cidr, gateway, description } = req.body;
        if (!name || !cidr)
            return res.status(400).json({ error: 'Name and CIDR are required' });
        const network = await prisma_1.prisma.network.create({
            data: {
                name,
                vlanId: vlanId ? parseInt(vlanId) : undefined,
                cidr,
                gateway,
                description
            }
        });
        await (0, audit_1.writeAudit)({
            action: 'CREATE',
            entityType: 'Network',
            entityId: network.id,
            entityName: `${name} (${cidr})`,
            changes: { name, cidr, gateway, vlanId: vlanId ?? null, description: description ?? null },
        });
        res.status(201).json(network);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Update network
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, vlanId, cidr, gateway, description } = req.body;
        // Fetch before for change tracking
        const before = await prisma_1.prisma.network.findUnique({ where: { id } });
        const network = await prisma_1.prisma.network.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(vlanId !== undefined && { vlanId: vlanId ? parseInt(vlanId) : null }),
                ...(cidr && { cidr }),
                ...(gateway !== undefined && { gateway }),
                ...(description !== undefined && { description })
            },
            include: { ipAddresses: true }
        });
        const changes = {};
        if (before) {
            if (name && name !== before.name)
                changes.name = { from: before.name, to: name };
            if (cidr && cidr !== before.cidr)
                changes.cidr = { from: before.cidr, to: cidr };
            if (gateway !== undefined && gateway !== before.gateway)
                changes.gateway = { from: before.gateway, to: gateway };
            if (vlanId !== undefined && vlanId !== before.vlanId)
                changes.vlanId = { from: before.vlanId, to: vlanId };
            if (description !== undefined && description !== before.description)
                changes.description = { from: before.description, to: description };
        }
        await (0, audit_1.writeAudit)({
            action: 'UPDATE',
            entityType: 'Network',
            entityId: id,
            entityName: `${network.name} (${network.cidr})`,
            changes,
        });
        res.json(network);
    }
    catch (error) {
        if (error.code === 'P2025')
            return res.status(404).json({ error: 'Network not found' });
        res.status(500).json({ error: error.message });
    }
});
// POST /api/networks/:id/populate - Create all host IPs in the subnet as AVAILABLE
router.post('/:id/populate', async (req, res) => {
    try {
        const { id } = req.params;
        const network = await prisma_1.prisma.network.findUnique({ where: { id } });
        if (!network)
            return res.status(404).json({ error: 'Network not found' });
        const [ipStr, prefixStr] = network.cidr.split('/');
        const prefix = parseInt(prefixStr);
        if (prefix < 20)
            return res.status(400).json({ error: 'Network too large to auto-populate (use /20 or smaller)' });
        const ipToNum = (ip) => ip.split('.').reduce((acc, o) => (acc * 256) + parseInt(o), 0);
        const numToIP = (n) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join('.');
        const mask = (~0 << (32 - prefix)) >>> 0;
        const networkNum = (ipToNum(ipStr) & mask) >>> 0;
        const broadcast = (networkNum | (~mask >>> 0)) >>> 0;
        const first = networkNum + 1;
        const last = broadcast - 1;
        const existing = await prisma_1.prisma.iPAddress.findMany({ where: { networkId: id }, select: { address: true } });
        const existingSet = new Set(existing.map(ip => ip.address));
        const toCreate = [];
        for (let i = first; i <= last; i++) {
            const address = numToIP(i);
            if (!existingSet.has(address)) {
                toCreate.push({ address, networkId: id, status: 'AVAILABLE' });
            }
        }
        if (toCreate.length > 0) {
            await prisma_1.prisma.iPAddress.createMany({ data: toCreate });
        }
        await (0, audit_1.writeAudit)({
            action: 'POPULATE',
            entityType: 'Network',
            entityId: id,
            entityName: `${network.name} (${network.cidr})`,
            changes: { created: toCreate.length, existing: existingSet.size, total: last - first + 1 },
        });
        res.json({ created: toCreate.length, existing: existingSet.size, total: last - first + 1 });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Delete network
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Fetch before deletion for audit name
        const network = await prisma_1.prisma.network.findUnique({ where: { id } });
        // Delete in dependency order to satisfy FK constraints:
        // 1. Unlink devices from IPs in this network (keep devices, just remove IP assignment)
        // 2. Delete all IPs in the network
        // 3. Delete the network itself
        const ips = await prisma_1.prisma.iPAddress.findMany({
            where: { networkId: id },
            select: { id: true },
        });
        if (ips.length > 0) {
            const ipIds = ips.map(ip => ip.id);
            await prisma_1.prisma.device.updateMany({
                where: { ipAddressId: { in: ipIds } },
                data: { ipAddressId: null },
            });
            await prisma_1.prisma.iPAddress.deleteMany({ where: { networkId: id } });
        }
        await prisma_1.prisma.network.delete({ where: { id } });
        await (0, audit_1.writeAudit)({
            action: 'DELETE',
            entityType: 'Network',
            entityId: id,
            entityName: network ? `${network.name} (${network.cidr})` : id,
        });
        res.status(204).send();
    }
    catch (error) {
        if (error.code === 'P2025')
            return res.status(404).json({ error: 'Network not found' });
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
