"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAudit = writeAudit;
const prisma_1 = require("../prisma");
/** Write an audit log entry. Failures are silently swallowed so they never
 *  break the main operation. */
async function writeAudit(params) {
    try {
        await prisma_1.prisma.auditLog.create({
            data: {
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId ?? null,
                entityName: params.entityName ?? null,
                changes: params.changes ? JSON.stringify(params.changes) : null,
                source: params.source ?? 'USER',
            },
        });
    }
    catch (err) {
        console.error('[audit] write failed:', err);
    }
}
