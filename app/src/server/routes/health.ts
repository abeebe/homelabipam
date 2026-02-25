import { Router } from 'express'
import { prisma } from '../prisma'

const router = Router()

router.get('/', async (_, res) => {
  await prisma.$queryRaw`SELECT 1`
  res.json({ status: 'ok' })
})

export default router