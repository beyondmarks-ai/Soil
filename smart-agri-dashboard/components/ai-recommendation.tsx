"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { LiveSensorData } from "../lib/sensor-types";
import { Icon } from "./icons";

type Advice = { title: string; explanation: string; durationMinutes: number; confidence: string; source: "azure-openai" | "rules" };

export function AiRecommendation({ live }: { live: LiveSensorData }) {
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!live.connected) return;
    setLoading(true);
    try {
      const response = await fetch("/api/recommendations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ soilPercent: live.soilPercent, temperature: live.temperature, humidity: live.humidity, relay: live.relay, dhtOk: live.dhtOk }) });
      if (response.ok) setAdvice(await response.json());
    } finally { setLoading(false); }
  }, [live.connected, live.soilPercent, live.temperature, live.humidity, live.relay, live.dhtOk]);
  useEffect(() => { if (live.connected && !advice) void load(); }, [live.connected, advice, load]);
  return <article className="panel recommendation-panel"><div className="recommendation-visual"><span className="water-ring"><Icon name="irrigation" size={30}/></span><span className="sun-orbit"/></div><span className="eyebrow">{advice?.source === "azure-openai" ? "Azure AI recommendation" : "Smart recommendation"}</span><h3>{loading ? "Analysing field conditions..." : advice?.title ?? "Waiting for sensor data"}</h3><p>{advice?.explanation ?? "Connect the sensor gateway to calculate a recommendation."}</p><div className="recommendation-stats"><span><small>Suggested cycle</small><strong>{advice?.durationMinutes ?? 0} min</strong></span><span><small>Confidence</small><strong>{advice?.confidence ?? "—"}</strong></span></div><div className="button-row"><Link href="/irrigation" className="primary-button">Review irrigation <Icon name="arrow" size={17}/></Link><button className="secondary-button compact" disabled={loading || !live.connected} onClick={() => void load()}>Refresh AI</button></div></article>;
}
