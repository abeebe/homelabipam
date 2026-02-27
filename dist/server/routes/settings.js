"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const audit_1 = require("../utils/audit");
const router = (0, express_1.Router)();
// Keys whose values are masked in GET responses
const SENSITIVE_KEYS = new Set(['UNIFI_API_KEY', 'PROXMOX_TOKEN_SECRET', 'PIHOLE_API_KEY', 'ADGUARD_PASSWORD', 'PORTAINER_API_KEY']);
const PLACEHOLDER = '***';
// All known setting keys with their env var fallback names
const ENV_FALLBACKS = {
    UNIFI_URL: ['UNIFI_URL'],
    UNIFI_API_KEY: ['UNIFI_API_KEY', 'UNIFI-X-APIKEY'],
    PROXMOX_URL: ['PROXMOX_URL'],
    PROXMOX_TOKEN_ID: ['PROXMOX_TOKEN_ID'],
    PROXMOX_TOKEN_SECRET: ['PROXMOX_TOKEN_SECRET'],
    PIHOLE_URL: ['PIHOLE_URL'],
    PIHOLE_API_KEY: ['PIHOLE_API_KEY'],
    ADGUARD_URL: ['ADGUARD_URL'],
    ADGUARD_PASSWORD: ['ADGUARD_PASSWORD'],
    DOCKER_URL: ['DOCKER_URL'],
    PORTAINER_URL: ['PORTAINER_URL'],
    PORTAINER_API_KEY: ['PORTAINER_API_KEY'],
};
function getEnvFallback(key) {
    const envKeys = ENV_FALLBACKS[key] ?? [key];
    for (const envKey of envKeys) {
        const val = process.env[envKey];
        if (val)
            return val;
    }
    return '';
}
// GET /api/settings - return all settings, sensitive values masked
router.get('/', async (_, res) => {
    try {
        const rows = await prisma_1.prisma.setting.findMany();
        const stored = Object.fromEntries(rows.map(r => [r.key, r.value ?? '']));
        const result = {};
        for (const key of Object.keys(ENV_FALLBACKS)) {
            const raw = stored[key] !== undefined ? stored[key] : getEnvFallback(key);
            result[key] = SENSITIVE_KEYS.has(key) && raw ? PLACEHOLDER : raw;
        }
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// PUT /api/settings - save settings, skip placeholder values for sensitive keys
router.put('/', async (req, res) => {
    try {
        const updates = req.body;
        const changed = [];
        for (const [key, value] of Object.entries(updates)) {
            if (SENSITIVE_KEYS.has(key) && value === PLACEHOLDER)
                continue;
            await prisma_1.prisma.setting.upsert({
                where: { key },
                create: { key, value: value || null },
                update: { value: value || null },
            });
            changed.push(key);
        }
        if (changed.length > 0) {
            await (0, audit_1.writeAudit)({
                action: 'UPDATE',
                entityType: 'Setting',
                entityName: changed.join(', '),
                changes: { updatedKeys: changed },
            });
        }
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
