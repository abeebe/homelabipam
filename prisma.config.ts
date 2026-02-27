import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join('app', 'prisma', 'schema.prisma'),
  migrations: {
    path: path.join('app', 'prisma', 'migrations'),
  },
  datasource: {
    // process.env returns undefined when not set (safe for `prisma generate` at build time).
    // prisma migrate deploy (at container start) receives DATABASE_URL from the environment.
    url: process.env.DATABASE_URL,
  },
})
