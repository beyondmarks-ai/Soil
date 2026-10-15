export type LiveSensorData = {
  id?: string;
  deviceId?: string;
  farmId?: string;
  soilRaw: number | null;
  soilPercent: number | null;
  temperature: number | null;
  humidity: number | null;
  dhtOk: boolean;
  relay: "ON" | "OFF";
  uptimeMs: number | null;
  connected: boolean;
  port: string;
  receivedAt: string | null;
  firmwareVersion?: string;
  source?: "serial" | "azure" | "none";
  message?: string;
};

export type SensorHistoryPoint = LiveSensorData & { id: string; deviceId: string; farmId: string; hash?: string };

export type AlertRecord = {
  id: string;
  deviceId: string;
  farmId: string;
  severity: "warning" | "critical";
  code: string;
  message: string;
  value: number | null;
  createdAt: string;
  resolved: boolean;
};

export type AuditRecord = {
  id: string;
  deviceId: string;
  farmId: string;
  hash: string;
  telemetryId: string;
  anchoredAt: string;
  status: "anchored" | "configured-later";
  transactionHash?: string;
};
