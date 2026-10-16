import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";

const requestedPort = process.env.SERIAL_PORT;
let portPath = requestedPort ?? null;
const baudRate = Number(process.env.SERIAL_BAUD ?? 9600);
const dataDir = path.resolve("data");
const dataFile = path.join(dataDir, "live-sensors.json");
const relayCommandFile = path.join(dataDir, "relay-command.json");
let serial;
let retryTimer;
let lastCloudUploadAt = 0;

await mkdir(dataDir, { recursive: true });

async function save(payload) {
  await writeFile(dataFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function uploadToAzure(reading) {
  const base = process.env.AZURE_FUNCTION_BASE_URL;
  const key = process.env.AZURE_FUNCTION_KEY;
  if (!base || !key || Date.now() - lastCloudUploadAt < 10000) return;
  lastCloudUploadAt = Date.now();
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/api/telemetry/local?code=${encodeURIComponent(key)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: "arduino-local-01", farmId: "greenfield", firmwareVersion: "uno-usb-1.0", ...reading }),
    });
    if (!response.ok) console.error(`[serial] Azure upload rejected: ${response.status}`);
  } catch (error) { console.error(`[serial] Azure upload failed: ${error.message}`); }
}

async function markDisconnected(message) {
  await save({
    soilRaw: null, soilPercent: null, temperature: null, humidity: null,
    dhtOk: false, relay: "OFF", uptimeMs: null, connected: false,
    port: portPath ?? "Auto-detect", receivedAt: null, message,
  });
}

function scheduleRetry() {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => void connect(), 3000);
}

async function detectPort() {
  const ports = await SerialPort.list();
  if (requestedPort) return ports.some((port) => port.path === requestedPort) ? requestedPort : null;
  const recognizable = ports.find((port) => /arduino|usb|wch|ch340|cp210|ftdi/i.test(`${port.manufacturer ?? ""} ${port.friendlyName ?? ""} ${port.pnpId ?? ""}`));
  return recognizable?.path ?? ports[0]?.path ?? null;
}

async function connect() {
  if (serial?.isOpen) return;
  portPath = await detectPort();
  if (!portPath) {
    await markDisconnected("No Arduino or ESP serial port detected");
    scheduleRetry();
    return;
  }
  serial = new SerialPort({ path: portPath, baudRate, autoOpen: false });
  const parser = serial.pipe(new ReadlineParser({ delimiter: "\n" }));

  parser.on("data", async (line) => {
    const text = line.trim();
    if (!text.startsWith("{") || !text.endsWith("}")) return;
    try {
      const reading = JSON.parse(text);
      await save({ ...reading, connected: true, port: portPath, receivedAt: new Date().toISOString() });
      void uploadToAzure(reading);
    } catch (error) {
      console.error("[serial] Invalid sensor line:", error.message);
    }
  });

  serial.on("open", () => console.log(`[serial] Connected to ${portPath} at ${baudRate} baud`));
  serial.on("error", async (error) => {
    console.error(`[serial] ${error.message}`);
    await markDisconnected(error.message);
    scheduleRetry();
  });
  serial.on("close", async () => {
    console.log("[serial] Port closed; retrying");
    await markDisconnected("Serial port closed");
    scheduleRetry();
  });

  serial.open((error) => {
    if (!error) return;
    markDisconnected(error.message).finally(scheduleRetry);
  });
}

function shutdown() {
  clearTimeout(retryTimer);
  if (serial?.isOpen) serial.close(() => process.exit(0));
  else process.exit(0);
}

const commandTimer = setInterval(async () => {
  if (!serial?.isOpen) return;
  try {
    const command = JSON.parse(await readFile(relayCommandFile, "utf8"));
    if (typeof command.enabled !== "boolean") return;
    serial.write(command.enabled ? "RELAY_ON\n" : "RELAY_OFF\n");
    await unlink(relayCommandFile);
    console.log(`[serial] Relay command sent: ${command.enabled ? "ON" : "OFF"}`);
  } catch (error) {
    if (error?.code !== "ENOENT") console.error(`[serial] Relay command failed: ${error.message}`);
  }
}, 500);

process.on("exit", () => clearInterval(commandTimer));

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
void connect();
