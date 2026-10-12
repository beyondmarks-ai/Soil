import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";

const portPath = process.env.SERIAL_PORT ?? "COM3";
const baudRate = Number(process.env.SERIAL_BAUD ?? 9600);
const dataDir = path.resolve("data");
const dataFile = path.join(dataDir, "live-sensors.json");
let serial;
let retryTimer;

await mkdir(dataDir, { recursive: true });

async function save(payload) {
  await writeFile(dataFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function markDisconnected(message) {
  await save({
    soilRaw: null, soilPercent: null, temperature: null, humidity: null,
    dhtOk: false, relay: "OFF", uptimeMs: null, connected: false,
    port: portPath, receivedAt: null, message,
  });
}

function scheduleRetry() {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(connect, 3000);
}

function connect() {
  if (serial?.isOpen) return;
  serial = new SerialPort({ path: portPath, baudRate, autoOpen: false });
  const parser = serial.pipe(new ReadlineParser({ delimiter: "\n" }));

  parser.on("data", async (line) => {
    const text = line.trim();
    if (!text.startsWith("{") || !text.endsWith("}")) return;
    try {
      const reading = JSON.parse(text);
      await save({ ...reading, connected: true, port: portPath, receivedAt: new Date().toISOString() });
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

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
connect();
