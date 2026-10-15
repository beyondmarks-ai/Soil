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

  return data;
}
