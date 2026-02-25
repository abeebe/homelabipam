"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const router = (0, express_1.Router)();
// Get all networks
router.get('/', async (_, res) => {
    const networks = await prisma_1.prisma.network.findMany({
        include: {
            ipAddresses: true
        }
    });
    res.json(networks);
});
// Create network
router.post('/', async (req, res) => {
    const { name, vlanId, cidr, gateway, description } = req.body;
    const network = await prisma_1.prisma.network.create({
        data: {
            name,
            vlanId,
            cidr,
            gateway,
            description
        }
    });
    res.status(201).json(network);
});
exports.default = router;
