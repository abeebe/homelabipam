import express from "express"
import cors from "cors"
import path from "path"

import healthRoutes from "./routes/health"
import networksRoutes from "./routes/networks"
import ipaddressesRoutes from "./routes/ipaddresses"
import unifiRoutes from "./routes/unifi"
import settingsRoutes from "./routes/settings"
import auditLogRoutes from "./routes/auditlog"
import racksRoutes from "./routes/racks"

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
  app.use("/api/racks", racksRoutes)

  // Serve the client build in production
  const clientDist = path.resolve(__dirname, "../../client-dist")
  app.use(express.static(clientDist))
  app.get("*", (_req, res, next) => {
    if (_req.path.startsWith("/api/")) return next()
    res.sendFile(path.join(clientDist, "index.html"))
  })

  // Error handling middleware
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Error:", err)
    res.status(err.status || 500).json({
      error: err.message || "Internal server error"
    })
  })

  return app
}