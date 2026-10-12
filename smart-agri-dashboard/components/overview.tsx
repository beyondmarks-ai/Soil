"use client";

import Link from "next/link";
import { Icon } from "./icons";
import { useLiveSensors } from "./use-live-sensors";
import type { LiveSensorData } from "../lib/sensor-types";

export function Overview({ initialData }: { initialData: LiveSensorData }) {
  const live = useLiveSensors(initialData);
  const metrics = [
    { label: "Soil moisture", value: live.soilPercent === null ? "—" : `${live.soilPercent}%`, detail: live.connected ? `Raw ${live.soilRaw?.toFixed(0) ?? "—"}` : "Waiting for hardware", tone: "green", icon: "irrigation", trend: live.connected ? "Live" : "Offline" },
    { label: "Air temperature", value: live.temperature === null ? "—" : `${live.temperature.toFixed(1)}°C`, detail: live.dhtOk ? "DHT22 healthy" : "Check DHT22", tone: "amber", icon: "sensors", trend: live.connected ? "Live" : "Offline" },
    { label: "Humidity", value: live.humidity === null ? "—" : `${live.humidity.toFixed(1)}%`, detail: live.dhtOk ? "DHT22 healthy" : "Check DHT22", tone: "blue", icon: "sensors", trend: live.connected ? "Live" : "Offline" },
    { label: "Irrigation relay", value: live.relay, detail: "Safe default state", tone: "purple", icon: "devices", trend: live.connected ? "Ready" : "Offline" },
  ];
  return (
    <>
      <section className="metrics-grid">
        {metrics.map((metric) => <article className="metric-card" key={metric.label}>
          <div className={`metric-icon ${metric.tone}`}><Icon name={metric.icon} /></div>
          <span className="metric-trend">{metric.trend}</span>
          <p>{metric.label}</p><h2>{metric.value}</h2><small><span className="status-dot" />{metric.detail}</small>
        </article>)}
      </section>

      <section className="overview-grid">
        <article className="panel chart-panel">
          <div className="panel-heading"><div><span className="eyebrow">Field conditions</span><h3>Moisture trend</h3></div><select aria-label="Chart period" defaultValue="7d"><option value="24h">24 hours</option><option value="7d">7 days</option><option value="30d">30 days</option></select></div>
          <div className="chart-legend"><span><i className="legend-line green-line" />Soil moisture</span><span><i className="legend-line blue-line" />Target</span></div>
          <div className="chart-area">
            <div className="y-axis"><span>80%</span><span>60%</span><span>40%</span><span>20%</span></div>
            <svg viewBox="0 0 720 245" preserveAspectRatio="none" role="img" aria-label="Soil moisture trend chart">
              <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2c8c62" stopOpacity=".3"/><stop offset="1" stopColor="#2c8c62" stopOpacity="0"/></linearGradient></defs>
              <g className="grid-lines"><path d="M0 20H720M0 80H720M0 140H720M0 200H720" /></g>
              <path className="target-line" d="M0 108H720" />
              <path className="area-fill" d="M0 162C52 150 68 124 116 130s80 39 126 24 62-53 112-46 75 34 120 18 61-60 112-48 70 51 134 32V245H0Z" />
              <path className="data-line" d="M0 162C52 150 68 124 116 130s80 39 126 24 62-53 112-46 75 34 120 18 61-60 112-48 70 51 134 32" />
              <circle cx="720" cy="110" r="5" />
            </svg>
            <div className="x-axis"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
          </div>
        </article>

        <article className="panel recommendation-panel">
          <div className="recommendation-visual"><span className="water-ring"><Icon name="irrigation" size={30} /></span><span className="sun-orbit" /></div>
          <span className="eyebrow">Smart recommendation</span><h3>Next irrigation in 6 hours</h3><p>Moisture is healthy now. Based on the current trend, a 12-minute irrigation cycle is recommended at 6:30 PM.</p>
          <div className="recommendation-stats"><span><small>Duration</small><strong>12 min</strong></span><span><small>Est. water</small><strong>18 L</strong></span></div>
          <Link href="/irrigation" className="primary-button">Review irrigation <Icon name="arrow" size={17} /></Link>
        </article>
      </section>

      <section className="lower-grid">
        <article className="panel device-panel">
          <div className="panel-heading"><div><span className="eyebrow">Hardware</span><h3>Device status</h3></div><Link href="/devices" className="text-link">View all <Icon name="arrow" size={15} /></Link></div>
          <div className="device-table">
            <div className="table-row table-head"><span>Device</span><span>Reading</span><span>Status</span><span>Updated</span></div>
            <div className="table-row"><span className="device-name"><i className="device-symbol soil"><Icon name="irrigation" size={17}/></i><span><strong>Soil sensor</strong><small>Arduino A0</small></span></span><strong>{live.soilPercent ?? "—"}%</strong><span className={live.connected ? "status-pill online" : "status-pill warning"}>{live.connected ? "Online" : "Offline"}</span><small>Raw {live.soilRaw?.toFixed(0) ?? "—"}</small></div>
            <div className="table-row"><span className="device-name"><i className="device-symbol temp"><Icon name="sensors" size={17}/></i><span><strong>DHT22</strong><small>Digital pin 2</small></span></span><strong>{live.temperature?.toFixed(1) ?? "—"}°C</strong><span className={live.dhtOk ? "status-pill online" : "status-pill warning"}>{live.dhtOk ? "Online" : "Error"}</span><small>{live.humidity?.toFixed(1) ?? "—"}% RH</small></div>
            <div className="table-row"><span className="device-name"><i className="device-symbol relay"><Icon name="devices" size={17}/></i><span><strong>Relay module</strong><small>Digital pin 7</small></span></span><strong>{live.relay}</strong><span className="status-pill online">Ready</span><small>Safe state</small></div>
          </div>
        </article>

        <article className="panel ledger-panel">
          <div className="panel-heading"><div><span className="eyebrow">Data integrity</span><h3>Latest ledger record</h3></div><span className="verified-badge">Verified</span></div>
          <div className="block-graphic"><span>1842</span><i /><span>1843</span><i /><span className="current-block">1844</span></div>
          <dl><div><dt>Record hash</dt><dd>0x71a9...c42e</dd></div><div><dt>Sensor batch</dt><dd>#GF-2408</dd></div><div><dt>Committed</dt><dd>2 min ago</dd></div></dl>
          <Link href="/blockchain" className="secondary-button">Open ledger explorer</Link>
        </article>
      </section>
    </>
  );
}
