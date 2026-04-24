#!/usr/bin/env node
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function canListen(port, host) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port, host);
  });
}

// A port is considered free only if we can bind it on BOTH IPv4 and IPv6,
// because Vite may be listening on ::1 while 127.0.0.1 is technically free
// (localhost resolution would still clash).
async function isPortFree(port) {
  const v4 = await canListen(port, "127.0.0.1");
  if (!v4) return false;
  const v6 = await canListen(port, "::1");
  return v6;
}

async function findFreePort(start, tries = 50) {
  for (let p = start; p < start + tries; p++) {
    if (await isPortFree(p)) return p;
  }
  throw new Error(`No free TCP port in ${start}..${start + tries - 1}`);
}

const basePort = Number(process.env.VITE_PORT) || 5173;
const port = await findFreePort(basePort);
const devUrl = `http://localhost:${port}`;

if (port !== basePort) {
  console.log(
    `[tauri-dev] port ${basePort} busy → using ${port} (${devUrl})`,
  );
} else {
  console.log(`[tauri-dev] using port ${port} (${devUrl})`);
}

// Write the override to a tmp file — passing a JSON blob via the shell on
// Windows is brittle, but `tauri --config` also accepts a file path.
const configFile = path.join(
  os.tmpdir(),
  `tauri-dev-config-${process.pid}-${Date.now()}.json`,
);
fs.writeFileSync(
  configFile,
  JSON.stringify({ build: { devUrl } }, null, 2),
  "utf8",
);

const cleanup = () => {
  try {
    fs.unlinkSync(configFile);
  } catch {}
};

const child = spawn("npx", ["tauri", "dev", "--config", configFile], {
  stdio: "inherit",
  env: { ...process.env, VITE_PORT: String(port) },
  shell: true,
});

const forward = (sig) => () => child.kill(sig);
process.on("SIGINT", forward("SIGINT"));
process.on("SIGTERM", forward("SIGTERM"));
process.on("exit", cleanup);
child.on("exit", (code) => {
  cleanup();
  process.exit(code ?? 0);
});
