import { spawn } from "node:child_process";
import path from "node:path";

const node = process.execPath;
const nextBin = path.resolve("node_modules", "next", "dist", "bin", "next");
const bridge = spawn(node, ["scripts/serial-bridge.mjs"], { stdio: "inherit", env: process.env });
const web = spawn(node, [nextBin, "dev"], { stdio: "inherit", env: process.env });

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  bridge.kill("SIGTERM");
  web.kill("SIGTERM");
  setTimeout(() => process.exit(code), 400);
}

bridge.on("exit", (code) => { if (!stopping && code) console.error(`[serial] Bridge exited with code ${code}`); });
web.on("exit", (code) => stop(code ?? 0));
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
