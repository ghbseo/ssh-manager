import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const host = process.env.TAURI_DEV_HOST;
const port = Number(process.env.VITE_PORT) || 5173;

export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port,
    // strict when the port was chosen for us by the tauri-dev wrapper
    // (VITE_PORT set); otherwise let Vite pick the next free port.
    strictPort: Boolean(process.env.VITE_PORT),
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: port + 1 }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
