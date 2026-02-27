import { prisma } from '../prisma'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'SYNC' | 'POPULATE'
export type AuditSource = 'USER' | 'SYSTEM'

export interface AuditParams {
  action: AuditAction
  entityType: 'Network' | 'IPAddress' | 'Device' | 'Setting'
  entityId?: string
  entityName?: string
  changes?: Record<string, unknown>
  source?: AuditSource
}

/** Write an audit log entry. Failures are silently swallowed so they never
 *  break the main operation. */
export async function writeAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        entityName: params.entityName ?? null,
        changes: params.changes ? JSON.stringify(params.changes) : null,
        source: params.source ?? 'USER',
      },
    })
  } catch (err) {
    console.error('[audit] write failed:', err)
  }
}
