import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { z } from "zod";
import { buildStoredTelemetry, deriveAlerts, telemetrySchema } from "./domain.js";
import { anchorHash, container, realtime, sendDeviceCommand, sendRelayCommand } from "./services.js";

function payloads(event: unknown): unknown[] {
  const values = Array.isArray(event) ? event : [event];
  return values.flatMap((value) => {
    if (typeof value === "string") {
      try { return [JSON.parse(value)]; } catch { return []; }
    }
    if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
      try { return [JSON.parse(Buffer.from(value).toString("utf8"))]; } catch { return []; }
    }
    return [value];
  });
}

app.eventHub("telemetry-ingest", {
  connection: "IOT_HUB_EVENTHUB_CONNECTION",
  eventHubName: "%IOT_HUB_EVENTHUB_NAME%",
  cardinality: "many",
  consumerGroup: "%IOT_HUB_CONSUMER_GROUP%",
  handler: async (events: unknown[], context: InvocationContext) => {
    for (const raw of payloads(events)) {
      const parsed = telemetrySchema.safeParse(raw);
      if (!parsed.success) {
        context.warn("Discarded invalid telemetry", parsed.error.flatten());
        continue;
      }
      const reading = buildStoredTelemetry(parsed.data);
      await container("telemetry").items.upsert(reading);
      await container("deviceState").items.upsert({ ...reading, id: reading.deviceId, type: "deviceState" });
      for (const alert of deriveAlerts(reading)) await container("alerts").items.upsert(alert);
      await realtime().group(`farm:${reading.farmId}`).sendToAll({ type: "telemetry", data: reading });

      const anchor = await anchorHash(reading.hash, reading.id);
      await container("audit").items.upsert({
        id: reading.id,
        type: "audit",
        deviceId: reading.deviceId,
        farmId: reading.farmId,
        hash: reading.hash,
        telemetryId: reading.id,
        anchoredAt: new Date().toISOString(),
        ...anchor,
      });
    }
  },
});

const relaySchema = z.object({ deviceId: z.string().min(1), enabled: z.boolean() });
app.http("relay-command", {
  methods: ["POST"],
  authLevel: "function",
  route: "relay",
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const parsed = relaySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return { status: 400, jsonBody: { error: "Invalid relay command" } };
    await sendRelayCommand(parsed.data.deviceId, parsed.data.enabled);
    return { status: 202, jsonBody: { accepted: true, ...parsed.data } };
  },
});

const irrigationConfigSchema = z.object({
  deviceId: z.string().min(1),
  enabled: z.boolean(),
  startPercent: z.number().int().min(0).max(99),
  stopPercent: z.number().int().min(1).max(100),
}).refine((value) => value.stopPercent > value.startPercent);
app.http("irrigation-config", {
  methods: ["POST"],
  authLevel: "function",
  route: "irrigation/config",
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const parsed = irrigationConfigSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return { status: 400, jsonBody: { error: "Invalid irrigation configuration" } };
    const { deviceId, ...configuration } = parsed.data;
    await sendDeviceCommand(deviceId, { type: "automatic", ...configuration });
    return { status: 202, jsonBody: { accepted: true, deviceId, ...configuration } };
  },
});

app.http("realtime-negotiate", {
  methods: ["GET"],
  authLevel: "function",
  route: "realtime/negotiate",
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const farmId = request.query.get("farmId") ?? "greenfield";
    const token = await realtime().getClientAccessToken({ groups: [`farm:${farmId}`], roles: [`webpubsub.joinLeaveGroup.farm:${farmId}`] });
    return { jsonBody: { url: token.url } };
  },
});

app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: async (): Promise<HttpResponseInit> => ({ jsonBody: { status: "ok", service: "soil-agri-functions", time: new Date().toISOString() } }),
});
