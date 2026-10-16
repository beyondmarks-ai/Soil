"use client";

import { useEffect, useState } from "react";
import { WebPubSubClient } from "@azure/web-pubsub-client";
import type { LiveSensorData } from "../lib/sensor-types";

const fallback: LiveSensorData = {
  soilRaw: null,
  soilPercent: null,
  temperature: null,
  humidity: null,
  dhtOk: false,
  relay: "OFF",
  uptimeMs: null,
  connected: false,
  port: "COM3",
  receivedAt: null,
};

export function useLiveSensors(initialData: LiveSensorData = fallback) {
  const [data, setData] = useState<LiveSensorData>(initialData);

  useEffect(() => {
    let active = true;
    let realtime: WebPubSubClient | undefined;
    const load = async () => {
      try {
        const response = await fetch("/api/live", { cache: "no-store" });
        if (!response.ok) throw new Error("Sensor API unavailable");
        const next = (await response.json()) as LiveSensorData;
        if (active) setData(next);
      } catch {
        if (active) setData((current) => ({ ...current, connected: false }));
      }
    };
    load();
    const timer = window.setInterval(load, 2000);
    const connectRealtime = async () => {
      try {
        const response = await fetch("/api/realtime?farmId=greenfield", { cache: "no-store" });
        if (!response.ok) return;
        const { url } = await response.json() as { url?: string };
        if (!url || !active) return;
        realtime = new WebPubSubClient(url, { autoRejoinGroups: true });
        realtime.on("group-message", (event) => {
          const payload = event.message.data as { type?: string; data?: LiveSensorData };
          if (active && payload?.type === "telemetry" && payload.data) setData({ ...payload.data, connected: true, source: "azure", port: "Azure IoT Hub" });
        });
        await realtime.start();
        await realtime.joinGroup("farm:greenfield");
      } catch { /* Polling remains the reliable fallback. */ }
    };
    connectRealtime();
    return () => { active = false; window.clearInterval(timer); realtime?.stop(); };
  }, []);

  useEffect(() => {
    if (!data.connected || data.source !== "serial") return;
    const alert = !data.dhtOk
      ? { code: "DHT_FAILURE", severity: "warning" as const, message: "DHT22 is not returning valid temperature and humidity readings." }
      : data.soilPercent !== null && data.soilPercent < 25
        ? { code: "LOW_SOIL", severity: data.soilPercent < 15 ? "critical" as const : "warning" as const, message: `Soil moisture is low at ${data.soilPercent}%. Verify calibration before watering.` }
        : data.temperature !== null && data.temperature > 38
          ? { code: "HIGH_TEMPERATURE", severity: data.temperature > 45 ? "critical" as const : "warning" as const, message: `Air temperature is high at ${data.temperature.toFixed(1)} C.` }
          : null;
    if (!alert) return;
    const cooldownKey = `soil-agri-notification-${alert.code}`;
    const now = Date.now();
    const previous = Number(window.localStorage.getItem(cooldownKey) ?? 0);
    if (now - previous < 30 * 60 * 1000) return;
    window.localStorage.setItem(cooldownKey, String(now));
    if ("Notification" in window && Notification.permission === "granted") new Notification(`Soil Agri: ${alert.code}`, { body: alert.message });
    void fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...alert, deviceId: data.deviceId ?? "local-arduino" }) });
  }, [data.connected, data.source, data.soilPercent, data.temperature, data.dhtOk, data.deviceId]);

  return data;
}
