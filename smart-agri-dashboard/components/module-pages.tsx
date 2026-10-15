"use client";

import { useState } from "react";
import type { AlertRecord, AuditRecord, LiveSensorData } from "../lib/sensor-types";
import type { FarmSettings } from "../lib/cloud-data";
import { useLiveSensors } from "./use-live-sensors";

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

export function IrrigationModule({ initialData }: { initialData: LiveSensorData }) {
  const live = useLiveSensors(initialData);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function setRelay(enabled: boolean) {
    setPending(true); setMessage("");
    try {
      const response = await fetch("/api/relay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceId: live.deviceId ?? "esp32-greenfield-01", enabled }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Command failed");
      setMessage(`Relay ${enabled ? "ON" : "OFF"} command accepted.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Command failed"); }
    finally { setPending(false); }
  }
  return <section className="section-layout">
    <article className="control-panel panel">
      <div><span className="eyebrow">Pump control</span><h2>Manual irrigation</h2><p>Commands travel securely through Azure IoT Hub. The ESP32 still enforces the ten-minute safety cutoff.</p></div>
      <div className="relay-state"><small>Current relay state</small><strong className={live.relay === "ON" ? "state-on" : ""}>{live.relay}</strong><span>{live.connected ? "Device online" : "Device offline"}</span></div>
      <div className="button-row"><button disabled={pending || !live.connected} className="primary-button" onClick={() => setRelay(true)}>Start irrigation</button><button disabled={pending || !live.connected} className="secondary-button compact" onClick={() => setRelay(false)}>Stop irrigation</button></div>
      {message && <p className="form-message">{message}</p>}
    </article>
    <div className="info-grid"><article className="panel info-card"><small>Soil moisture</small><strong>{live.soilPercent ?? "—"}%</strong><p>Start automation below the configured low threshold.</p></article><article className="panel info-card"><small>Safety policy</small><strong>10 min</strong><p>Maximum continuous pump runtime enforced on the ESP32.</p></article><article className="panel info-card"><small>Control path</small><strong>Cloud</strong><p>Dashboard → Azure Function → IoT Hub → ESP32.</p></article></div>
  </section>;
}

export function BlockchainModule({ records }: { records: AuditRecord[] }) {
  return <section className="section-layout">
    <article className="section-summary panel"><div><span className="eyebrow">Tamper evidence</span><h2>Sensor audit ledger</h2><p>Each accepted reading is SHA-256 hashed. When the Polygon contract is configured, that hash is anchored on-chain.</p></div><span className="summary-metric"><strong>{records.length}</strong><small>recent records</small></span></article>
    <article className="panel data-panel"><div className="panel-heading"><div><span className="eyebrow">Verification records</span><h3>Latest hashes</h3></div></div>{records.length ? <div className="simple-table"><div className="simple-row simple-head"><span>Time</span><span>Hash</span><span>Device</span><span>Status</span></div>{records.map((record) => <div className="simple-row" key={record.id}><span>{new Date(record.anchoredAt).toLocaleString()}</span><code title={record.hash}>{record.hash.slice(0, 14)}…</code><span>{record.deviceId}</span><span className={record.status === "anchored" ? "status-pill online" : "status-pill warning"}>{record.status === "anchored" ? "On-chain" : "Hash stored"}</span></div>)}</div> : <EmptyState>No cloud audit records yet. Upload ESP32 telemetry to create the first hash.</EmptyState>}</article>
  </section>;
}

export function DevicesModule({ initialData }: { initialData: LiveSensorData }) {
  const live = useLiveSensors(initialData);
  const devices = [
    ["ESP32 gateway", live.connected ? "Online" : "Offline", live.firmwareVersion ?? "Awaiting firmware"],
    ["DHT22", live.dhtOk ? "Healthy" : "Check sensor", "GPIO 4"],
    ["Soil moisture", live.soilRaw !== null ? "Reading" : "Offline", "GPIO 34 (ADC)"],
    ["Irrigation relay", live.connected ? "Ready" : "Offline", "GPIO 26 · active-low"],
  ];
  return <section className="section-layout"><article className="section-summary panel"><div><span className="eyebrow">Hardware inventory</span><h2>Connected devices</h2><p>Health is calculated from the latest Azure or local serial telemetry.</p></div><span className="summary-metric"><strong>{devices.filter((item) => !["Offline", "Check sensor"].includes(item[1])).length}/4</strong><small>healthy</small></span></article><article className="panel data-panel"><div className="device-list">{devices.map(([name, status, detail]) => <div className="device-list-row" key={name}><span className={status === "Offline" || status === "Check sensor" ? "device-indicator warning" : "device-indicator"}/><span><strong>{name}</strong><small>{detail}</small></span><span className={status === "Offline" || status === "Check sensor" ? "status-pill warning" : "status-pill online"}>{status}</span></div>)}</div></article></section>;
}

export function AlertsModule({ alerts }: { alerts: AlertRecord[] }) {
  const active = alerts.filter((alert) => !alert.resolved);
  return <section className="section-layout"><article className="section-summary panel"><div><span className="eyebrow">Rules engine</span><h2>Farm alerts</h2><p>Warnings are generated during telemetry ingestion for dry soil, heat and sensor failures.</p></div><span className="summary-metric"><strong>{active.length}</strong><small>active alerts</small></span></article><article className="panel data-panel">{active.length ? <div className="alert-list">{active.map((alert) => <div className={`alert-row ${alert.severity}`} key={alert.id}><span className="alert-mark">!</span><span><strong>{alert.message}</strong><small>{alert.deviceId} · {new Date(alert.createdAt).toLocaleString()}</small></span><span className="status-pill warning">{alert.severity}</span></div>)}</div> : <EmptyState>No active alerts. Threshold violations will appear here automatically.</EmptyState>}</article></section>;
}

export function ReportsModule({ recordCount }: { recordCount: number }) {
  return <section className="section-layout"><article className="section-summary panel"><div><span className="eyebrow">Data export</span><h2>Farm reports</h2><p>Download timestamped sensor data for analysis, project evidence and record verification.</p></div><span className="summary-metric"><strong>{recordCount}</strong><small>available samples</small></span></article><div className="info-grid"><article className="panel report-card"><span className="eyebrow">CSV</span><h3>Telemetry export</h3><p>Moisture, temperature, humidity, relay state and hashes.</p><a className="primary-button" href="/api/reports">Download CSV</a></article><article className="panel report-card"><span className="eyebrow">PDF</span><h3>Farm summary</h3><p>A print-ready operational summary calculated from cloud telemetry.</p><a className="secondary-button compact" href="/api/reports?format=pdf">Download PDF</a></article></div></section>;
}

export function SettingsModule({ initialSettings }: { initialSettings: FarmSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const numberField = (key: keyof FarmSettings, value: string) => setSettings((current) => ({ ...current, [key]: Number(value) }));
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    const response = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    const body = await response.json();
    setMessage(response.ok ? "Settings saved." : body.error ?? "Unable to save settings."); setSaving(false);
  }
  return <form className="settings-form panel" onSubmit={save}><div><span className="eyebrow">Farm configuration</span><h2>Operating thresholds</h2><p>These values control alerts and will be synchronized with ESP32 automation.</p></div><div className="form-grid"><label>Farm name<input value={settings.farmName} onChange={(e) => setSettings({ ...settings, farmName: e.target.value })}/></label><label>Low soil threshold (%)<input type="number" min="0" max="100" value={settings.lowSoilThreshold} onChange={(e) => numberField("lowSoilThreshold", e.target.value)}/></label><label>Target soil moisture (%)<input type="number" min="0" max="100" value={settings.targetSoilThreshold} onChange={(e) => numberField("targetSoilThreshold", e.target.value)}/></label><label>High temperature (°C)<input type="number" min="0" max="80" value={settings.highTemperatureThreshold} onChange={(e) => numberField("highTemperatureThreshold", e.target.value)}/></label><label>Latitude<input type="number" step="0.0001" value={settings.latitude} onChange={(e) => numberField("latitude", e.target.value)}/></label><label>Longitude<input type="number" step="0.0001" value={settings.longitude} onChange={(e) => numberField("longitude", e.target.value)}/></label></div><label className="toggle-row"><input type="checkbox" checked={settings.automaticIrrigation} onChange={(e) => setSettings({ ...settings, automaticIrrigation: e.target.checked })}/><span><strong>Automatic irrigation</strong><small>Start below the low threshold and stop at target moisture.</small></span></label><div className="button-row"><button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>{message && <span className="form-message">{message}</span>}</div></form>;
}
