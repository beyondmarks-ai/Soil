import { readFile } from "node:fs/promises";
import path from "node:path";
import type { LiveSensorData } from "./sensor-types";

export const emptyLiveData: LiveSensorData = {
  soilRaw: null, soilPercent: null, temperature: null, humidity: null,
  dhtOk: false, relay: "OFF", uptimeMs: null, connected: false,
  port: process.env.SERIAL_PORT ?? "COM3", receivedAt: null,
  message: "Waiting for the serial bridge",
};

export async function readLiveData(): Promise<LiveSensorData> {
  try {
    const file = path.join(process.cwd(), "data", "live-sensors.json");
    const data = JSON.parse(await readFile(file, "utf8")) as LiveSensorData;
    const age = data.receivedAt ? Date.now() - new Date(data.receivedAt).getTime() : Number.POSITIVE_INFINITY;
    return { ...data, connected: data.connected && age < 12000 };
  } catch {
    return emptyLiveData;
  }
}
