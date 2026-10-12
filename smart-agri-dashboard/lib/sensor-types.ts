export type LiveSensorData = {
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
  message?: string;
};
