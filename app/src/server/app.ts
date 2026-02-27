import express from "express"
import cors from "cors"

import healthRoutes from "./routes/health"
import networksRoutes from "./routes/networks"
import ipaddressesRoutes from "./routes/ipaddresses"
import unifiRoutes from "./routes/unifi"
import settingsRoutes from "./routes/settings"
import auditLogRoutes from "./routes/auditlog"

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.use("/api/health", healthRoutes)
  app.use("/api/networks", networksRoutes)
  app.use("/api/ipaddresses", ipaddressesRoutes)
  app.use("/api/unifi", unifiRoutes)
  app.use("/api/settings", settingsRoutes)
  app.use("/api/auditlog", auditLogRoutes)

  // Error handling middleware
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Error:", err)
    res.status(err.status || 500).json({
      error: err.message || "Internal server error"
    })
  })

  return app
}