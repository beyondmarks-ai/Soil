"use client";

import { useEffect, useState } from "react";
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
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  return data;
}
