import { Router } from 'express'
import { prisma } from '../prisma'

const router = Router()

// Keys whose values are masked in GET responses
const SENSITIVE_KEYS = new Set(['UNIFI_API_KEY', 'PROXMOX_TOKEN_SECRET'])
const PLACEHOLDER = '***'

// All known setting keys with their env var fallback names
const ENV_FALLBACKS: Record<string, string[]> = {
  UNIFI_URL: ['UNIFI_URL'],
  UNIFI_API_KEY: ['UNIFI_API_KEY', 'UNIFI-X-APIKEY'],
  PROXMOX_URL: ['PROXMOX_URL'],
  PROXMOX_TOKEN_ID: ['PROXMOX_TOKEN_ID'],
  PROXMOX_TOKEN_SECRET: ['PROXMOX_TOKEN_SECRET'],
}

function getEnvFallback(key: string): string {
  const envKeys = ENV_FALLBACKS[key] ?? [key]
  for (const envKey of envKeys) {
    const val = process.env[envKey]
    if (val) return val
  }
  return ''
}

// GET /api/settings - return all settings, sensitive values masked
router.get('/', async (_, res) => {
  try {
    const rows = await prisma.setting.findMany()
    const stored = Object.fromEntries(rows.map(r => [r.key, r.value ?? '']))

    const result: Record<string, string> = {}

    for (const key of Object.keys(ENV_FALLBACKS)) {
      // DB value takes precedence over env fallback
      const raw = stored[key] !== undefined ? stored[key] : getEnvFallback(key)
      result[key] = SENSITIVE_KEYS.has(key) && raw ? PLACEHOLDER : raw
    }

    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/settings - save settings, skip placeholder values for sensitive keys
router.put('/', async (req, res) => {
  try {
    const updates = req.body as Record<string, string>

    for (const [key, value] of Object.entries(updates)) {
      // Skip if user left a sensitive field unchanged (still shows PLACEHOLDER)
      if (SENSITIVE_KEYS.has(key) && value === PLACEHOLDER) continue

      await prisma.setting.upsert({
        where: { key },
        create: { key, value: value || null },
        update: { value: value || null },
      })
    }

    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
