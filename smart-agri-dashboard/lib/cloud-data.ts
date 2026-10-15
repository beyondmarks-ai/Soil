import { CosmosClient, type Container } from "@azure/cosmos";
import type { AlertRecord, AuditRecord, LiveSensorData, SensorHistoryPoint } from "./sensor-types";

const databaseName = process.env.COSMOS_DATABASE ?? "soil-agri";
let client: CosmosClient | undefined;

export function cloudConfigured() { return Boolean(process.env.COSMOS_CONNECTION_STRING); }

function getContainer(name: string): Container {
  const connectionString = process.env.COSMOS_CONNECTION_STRING;
  if (!connectionString) throw new Error("Cosmos DB is not configured");
  client ??= new CosmosClient(connectionString);
  return client.database(databaseName).container(name);
}

export async function readCloudLatest(): Promise<LiveSensorData | null> {
  if (!cloudConfigured()) return null;
  const { resources } = await getContainer("deviceState").items.query<LiveSensorData>({
    query: "SELECT TOP 1 * FROM c WHERE c.type = @type ORDER BY c.receivedAt DESC",
    parameters: [{ name: "@type", value: "deviceState" }],
  }).fetchAll();
  const latest = resources[0];
  if (!latest) return null;
  const age = latest.receivedAt ? Date.now() - Date.parse(latest.receivedAt) : Number.POSITIVE_INFINITY;
  return { ...latest, connected: age < 60_000, source: "azure", port: "Azure IoT Hub" };
}

export async function readHistory(limit = 96): Promise<SensorHistoryPoint[]> {
  if (!cloudConfigured()) return [];
  const safeLimit = Math.max(1, Math.min(limit, 500));
  const { resources } = await getContainer("telemetry").items.query<SensorHistoryPoint>({
    query: `SELECT TOP ${safeLimit} * FROM c WHERE c.type = @type ORDER BY c.receivedAt DESC`,
    parameters: [{ name: "@type", value: "telemetry" }],
  }).fetchAll();
  return resources.reverse();
}

export async function readAlerts(limit = 100): Promise<AlertRecord[]> {
  if (!cloudConfigured()) return [];
  const safeLimit = Math.max(1, Math.min(limit, 500));
  const { resources } = await getContainer("alerts").items.query<AlertRecord>({
    query: `SELECT TOP ${safeLimit} * FROM c WHERE c.type = @type ORDER BY c.createdAt DESC`,
    parameters: [{ name: "@type", value: "alert" }],
  }).fetchAll();
  return resources;
}

export async function readAudit(limit = 50): Promise<AuditRecord[]> {
  if (!cloudConfigured()) return [];
  const safeLimit = Math.max(1, Math.min(limit, 200));
  const { resources } = await getContainer("audit").items.query<AuditRecord>({
    query: `SELECT TOP ${safeLimit} * FROM c WHERE c.type = @type ORDER BY c.anchoredAt DESC`,
    parameters: [{ name: "@type", value: "audit" }],
  }).fetchAll();
  return resources;
}

export type FarmSettings = {
  id: string; farmId: string; farmName: string; lowSoilThreshold: number;
  targetSoilThreshold: number; highTemperatureThreshold: number;
  latitude: number; longitude: number; automaticIrrigation: boolean;
};

export const defaultSettings: FarmSettings = {
  id: "greenfield", farmId: "greenfield", farmName: "Greenfield Farm",
  lowSoilThreshold: 25, targetSoilThreshold: 45, highTemperatureThreshold: 38,
  latitude: 17.9133, longitude: 77.5301, automaticIrrigation: false,
};

export async function readSettings(): Promise<FarmSettings> {
  if (!cloudConfigured()) return defaultSettings;
  try {
    const { resource } = await getContainer("settings").item("greenfield", "greenfield").read<FarmSettings>();
    return resource ?? defaultSettings;
  } catch { return defaultSettings; }
}

export async function saveSettings(settings: FarmSettings) {
  if (!cloudConfigured()) throw new Error("Cosmos DB is not configured");
  return getContainer("settings").items.upsert({ ...settings, type: "settings", updatedAt: new Date().toISOString() });
}
