"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const router = (0, express_1.Router)();
router.get('/', async (_, res) => {
    await prisma_1.prisma.$queryRaw `SELECT 1`;
    res.json({ status: 'ok' });
});
exports.default = router;
