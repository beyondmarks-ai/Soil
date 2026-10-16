import { readFile } from "node:fs/promises";
import path from "node:path";
import type { LiveSensorData } from "./sensor-types";
import { readCloudLatest } from "./cloud-data";

export const emptyLiveData: LiveSensorData = {
  soilRaw: null, soilPercent: null, temperature: null, humidity: null,
  dhtOk: false, relay: "OFF", uptimeMs: null, connected: false,
  port: process.env.SERIAL_PORT ?? "COM3", receivedAt: null,
  source: "none",
  message: "Waiting for the serial bridge",
};

async function readSerialData(): Promise<LiveSensorData | null> {
  try {
    const file = path.join(process.cwd(), "data", "live-sensors.json");
    const data = JSON.parse(await readFile(file, "utf8")) as LiveSensorData;
    const age = data.receivedAt ? Date.now() - new Date(data.receivedAt).getTime() : Number.POSITIVE_INFINITY;
    return { ...data, connected: data.connected && age < 12000, source: "serial" };
  } catch { return null; }
}

export async function readLiveData(): Promise<LiveSensorData> {
  const preferSerial = process.env.LOCAL_SERIAL_CONTROL === "true" || process.env.NODE_ENV !== "production";
  const serial = preferSerial ? await readSerialData() : null;
  if (serial?.connected) return serial;
  try {
    const cloud = await readCloudLatest();
    if (cloud?.connected || !serial) return cloud ?? emptyLiveData;
  } catch (error) { console.error("Unable to read Azure telemetry", error); }
  if (serial) return serial;
  return await readSerialData() ?? emptyLiveData;
}
