import { Icon } from "./icons";

type Section = "sensors" | "irrigation" | "blockchain" | "devices" | "alerts" | "reports" | "settings";

const configs: Record<Section, { title: string; subtitle: string; icon: string; description: string; actions: string[] }> = {
  sensors: { title: "Live sensors", subtitle: "Monitor every environmental reading in one place", icon: "sensors", description: "Live readings will appear here after the ESP32 or Arduino gateway is connected to the dashboard API.", actions: ["Soil moisture history", "Temperature & humidity", "Sampling intervals"] },
  irrigation: { title: "Irrigation control", subtitle: "Review recommendations and control the water relay", icon: "irrigation", description: "Create manual or automatic irrigation schedules, set moisture thresholds, and monitor relay activity.", actions: ["Manual relay control", "Moisture automation", "Irrigation schedule"] },
  blockchain: { title: "Blockchain records", subtitle: "Verify that important sensor records have not changed", icon: "blockchain", description: "Raw sensor data will stay in the database while hashes and timestamps are committed to the project ledger.", actions: ["Record explorer", "Hash verification", "Smart-contract status"] },
  devices: { title: "Connected devices", subtitle: "Configure gateways, sensors, and control modules", icon: "devices", description: "Manage the ESP32 gateway, Arduino sensor node, DHT22, soil sensor, and relay module from this page.", actions: ["Gateway connection", "Pin configuration", "Device diagnostics"] },
  alerts: { title: "Alerts", subtitle: "Catch dry soil, high temperature, and offline devices early", icon: "alerts", description: "Define thresholds and choose how the system should notify the project team when attention is needed.", actions: ["Moisture alerts", "Climate alerts", "Offline warnings"] },
  reports: { title: "Reports", subtitle: "Turn sensor history into useful farm insights", icon: "reports", description: "Export daily and weekly summaries after real sensor storage is connected.", actions: ["Daily conditions", "Water usage", "Sensor uptime"] },
  settings: { title: "Settings", subtitle: "Configure the farm, API, units, and user access", icon: "settings", description: "Project-level settings will live here as the dashboard grows.", actions: ["Farm profile", "API connection", "Roles & security"] },
};

export function getSectionConfig(section: string) { return configs[section as Section]; }

export function SectionContent({ section }: { section: Section }) {
  const config = configs[section];
  return <section className="section-layout">
    <article className="section-hero panel"><div className="section-icon"><Icon name={config.icon} size={34} /></div><span className="eyebrow">Module ready</span><h2>{config.title}</h2><p>{config.description}</p><button className="primary-button">Configure module <Icon name="arrow" size={17}/></button></article>
    <div className="feature-grid">{config.actions.map((action, index) => <article className="feature-card panel" key={action}><span className="feature-number">0{index + 1}</span><div className="feature-icon"><Icon name={config.icon} /></div><h3>{action}</h3><p>Placeholder interface ready for the next development stage.</p><button className="text-link">Open section <Icon name="arrow" size={15}/></button></article>)}</div>
    <article className="connection-banner"><div><span className="connection-icon"><Icon name="devices" /></span><span><strong>Hardware integration is the next step</strong><small>Connect the gateway through REST, MQTT, or WebSocket when the firmware is ready.</small></span></div><span className="status-pill warning">Not connected</span></article>
  </section>;
}
