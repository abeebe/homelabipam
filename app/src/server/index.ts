import "dotenv/config"

console.log("DATABASE_URL:", process.env.DATABASE_URL)

import { createApp } from "./app"

const app = createApp()
const port = Number(process.env.API_PORT) || 3000

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`)
})