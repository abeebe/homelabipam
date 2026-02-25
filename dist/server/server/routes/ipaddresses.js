"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const router = (0, express_1.Router)();
router.get('/', async (_, res) => {
    const ips = await prisma_1.prisma.ipAddress.findMany({
        include: {
            device: true,
            network: true
        }
    });
    res.json(ips);
});
exports.default = router;
