"use client";

import { Icon } from "./icons";
import { useLiveSensors } from "./use-live-sensors";
import type { LiveSensorData } from "../lib/sensor-types";

function value(value: number | null, suffix: string) { return value === null ? "—" : `${value.toFixed(1)}${suffix}`; }

export function LiveSensors({ initialData }: { initialData: LiveSensorData }) {
  const data = useLiveSensors(initialData);
  const updated = data.receivedAt ? new Date(data.receivedAt).toLocaleTimeString() : "Waiting";
  return <section className="section-layout">
    <div className={data.connected ? "live-banner connected" : "live-banner disconnected"}>
      <span className="live-pulse" />
      <span><strong>{data.connected ? `Live hardware connected on ${data.port}` : "Hardware stream offline"}</strong><small>Last reading: {updated}</small></span>
    </div>
    <div className="live-sensor-grid">
      <article className="live-card panel"><span className="live-card-icon soil"><Icon name="irrigation" /></span><small>Soil moisture</small><h2>{data.soilPercent ?? "—"}%</h2><p>Raw A0: {data.soilRaw?.toFixed(1) ?? "—"}</p><span className={data.soilRaw !== null ? "status-pill online" : "status-pill warning"}>{data.soilRaw !== null ? "Reading" : "Offline"}</span></article>
      <article className="live-card panel"><span className="live-card-icon temp"><Icon name="sensors" /></span><small>Temperature</small><h2>{value(data.temperature, "°C")}</h2><p>DHT22 · Digital pin 2</p><span className={data.dhtOk ? "status-pill online" : "status-pill warning"}>{data.dhtOk ? "Healthy" : "Check sensor"}</span></article>
      <article className="live-card panel"><span className="live-card-icon humidity"><Icon name="irrigation" /></span><small>Air humidity</small><h2>{value(data.humidity, "%")}</h2><p>DHT22 · Digital pin 2</p><span className={data.dhtOk ? "status-pill online" : "status-pill warning"}>{data.dhtOk ? "Healthy" : "Check sensor"}</span></article>
      <article className="live-card panel"><span className="live-card-icon relay"><Icon name="devices" /></span><small>Relay module</small><h2>{data.relay}</h2><p>Arduino · Digital pin 7</p><span className="status-pill online">Safe state</span></article>
    </div>
    <article className="panel diagnostics-panel"><div><span className="eyebrow">Connection diagnostics</span><h3>Live serial pipeline</h3></div><dl><div><dt>Serial port</dt><dd>{data.port}</dd></div><div><dt>Arduino uptime</dt><dd>{data.uptimeMs === null ? "—" : `${Math.floor(data.uptimeMs / 1000)} sec`}</dd></div><div><dt>DHT checksum</dt><dd>{data.dhtOk ? "Passing" : "Failing"}</dd></div><div><dt>Relay state</dt><dd>{data.relay}</dd></div></dl></article>
  </section>;
}
