import { Router } from 'express'
import { prisma } from '../prisma'

const router = Router()

// GET /api/auditlog?page=1&limit=50&entityType=Network&action=CREATE
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50))
    const entityType = req.query.entityType as string | undefined
    const action = req.query.action as string | undefined

    const where: Record<string, string> = {}
    if (entityType && entityType !== 'all') where.entityType = entityType
    if (action && action !== 'all') where.action = action

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    res.json({ total, page, limit, logs })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
