import { describe, expect, it } from "vitest";
import { buildStoredTelemetry, deriveAlerts, telemetrySchema } from "../src/domain.js";

const valid = {
  deviceId: "esp32-greenfield-01",
  farmId: "greenfield",
  soilRaw: 2100,
  soilPercent: 48,
  temperature: 27.5,
  humidity: 61,
  dhtOk: true,
  relay: "OFF" as const,
  uptimeMs: 1000,
  firmwareVersion: "1.0.0",
};

describe("telemetry domain", () => {
  it("validates and hashes readings deterministically", () => {
    const parsed = telemetrySchema.parse(valid);
    const first = buildStoredTelemetry(parsed, "2026-10-15T10:00:00.000Z");
    const second = buildStoredTelemetry(parsed, "2026-10-15T10:00:00.000Z");
    expect(first.hash).toHaveLength(64);
    expect(first.hash).toBe(second.hash);
  });

  it("creates low-soil and DHT alerts", () => {
    const reading = buildStoredTelemetry({ ...valid, soilPercent: 10, dhtOk: false, temperature: null, humidity: null });
    expect(deriveAlerts(reading).map((alert) => alert.code)).toEqual(["LOW_SOIL", "DHT_FAILURE"]);
  });
});
