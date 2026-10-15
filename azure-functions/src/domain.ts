import { createHash } from "node:crypto";
import { z } from "zod";

export const telemetrySchema = z.object({
  deviceId: z.string().min(1).default("esp32-greenfield-01"),
  farmId: z.string().min(1).default("greenfield"),
  soilRaw: z.coerce.number().min(0).max(4095),
  soilPercent: z.coerce.number().min(0).max(100),
  temperature: z.coerce.number().min(-40).max(85).nullable(),
  humidity: z.coerce.number().min(0).max(100).nullable(),
  dhtOk: z.boolean(),
  relay: z.enum(["ON", "OFF"]),
  uptimeMs: z.coerce.number().nonnegative(),
  firmwareVersion: z.string().default("unknown"),
  recordedAt: z.string().datetime().optional(),
});

export type TelemetryInput = z.infer<typeof telemetrySchema>;

export type StoredTelemetry = TelemetryInput & {
  id: string;
  type: "telemetry";
  recordedAt: string;
  receivedAt: string;
  hash: string;
};

export function canonicalTelemetry(value: TelemetryInput, receivedAt: string) {
  return JSON.stringify({
    deviceId: value.deviceId,
    farmId: value.farmId,
    soilRaw: value.soilRaw,
    soilPercent: value.soilPercent,
    temperature: value.temperature,
    humidity: value.humidity,
    dhtOk: value.dhtOk,
    relay: value.relay,
    uptimeMs: value.uptimeMs,
    firmwareVersion: value.firmwareVersion,
    recordedAt: value.recordedAt ?? receivedAt,
  });
}

export function buildStoredTelemetry(value: TelemetryInput, receivedAt = new Date().toISOString()): StoredTelemetry {
  const canonical = canonicalTelemetry(value, receivedAt);
  const hash = createHash("sha256").update(canonical).digest("hex");
  return {
    ...value,
    id: `${value.deviceId}:${Date.parse(receivedAt)}:${hash.slice(0, 10)}`,
    type: "telemetry",
    recordedAt: value.recordedAt ?? receivedAt,
    receivedAt,
    hash,
  };
}

export type AlertRecord = {
  id: string;
  type: "alert";
  deviceId: string;
  farmId: string;
  severity: "warning" | "critical";
  code: "LOW_SOIL" | "HIGH_TEMPERATURE" | "DHT_FAILURE";
  message: string;
  value: number | null;
  createdAt: string;
  resolved: false;
};

export function deriveAlerts(reading: StoredTelemetry): AlertRecord[] {
  const alerts: AlertRecord[] = [];
  const add = (code: AlertRecord["code"], severity: AlertRecord["severity"], message: string, value: number | null) => alerts.push({
    id: `${reading.id}:${code}`,
    type: "alert",
    deviceId: reading.deviceId,
    farmId: reading.farmId,
    severity,
    code,
    message,
    value,
    createdAt: reading.receivedAt,
    resolved: false,
  });
  if (reading.soilPercent < 25) add("LOW_SOIL", reading.soilPercent < 15 ? "critical" : "warning", "Soil moisture is below the safe threshold.", reading.soilPercent);
  if (reading.temperature !== null && reading.temperature > 38) add("HIGH_TEMPERATURE", reading.temperature > 45 ? "critical" : "warning", "Air temperature is above the configured threshold.", reading.temperature);
  if (!reading.dhtOk) add("DHT_FAILURE", "warning", "DHT22 did not return a valid reading.", null);
  return alerts;
}
