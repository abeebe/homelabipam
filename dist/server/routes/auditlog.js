"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const router = (0, express_1.Router)();
// GET /api/auditlog?page=1&limit=50&entityType=Network&action=CREATE
router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
        const entityType = req.query.entityType;
        const action = req.query.action;
        const where = {};
        if (entityType && entityType !== 'all')
            where.entityType = entityType;
        if (action && action !== 'all')
            where.action = action;
        const [total, logs] = await Promise.all([
            prisma_1.prisma.auditLog.count({ where }),
            prisma_1.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);
        res.json({ total, page, limit, logs });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
