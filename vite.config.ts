import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: "app/src/client",
  build: {
    outDir: "../../client-dist",
    emptyOutDir: true
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "app/src")
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        bypass(req) {
          // Don't proxy TypeScript/JavaScript source files (handle query params like ?t=timestamp)
          if (req.url.match(/\.(ts|tsx|js|jsx)(\?|$)/)) {
            return req.url
          }
        }
      }
    }
  }
});