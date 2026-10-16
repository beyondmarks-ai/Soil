import { z } from "zod";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const schema = z.object({ deviceId: z.string().min(1).default("esp32-greenfield-01"), enabled: z.boolean() });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid relay command" }, { status: 400 });
  if (process.env.LOCAL_SERIAL_CONTROL === "true" || process.env.NODE_ENV !== "production") {
    const dataDirectory = path.resolve("data");
    await mkdir(dataDirectory, { recursive: true });
    await writeFile(path.join(dataDirectory, "relay-command.json"), JSON.stringify({ enabled: parsed.data.enabled, createdAt: new Date().toISOString() }), "utf8");
    return Response.json({ accepted: true, transport: "serial", ...parsed.data }, { status: 202 });
  }
  const base = process.env.AZURE_FUNCTION_BASE_URL;
  const key = process.env.AZURE_FUNCTION_KEY;
  if (!base || !key) return Response.json({ error: "Cloud relay control is not configured" }, { status: 503 });
  const response = await fetch(`${base.replace(/\/$/, "")}/api/relay?code=${encodeURIComponent(key)}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data),
  });
  const body = await response.json().catch(() => ({}));
  return Response.json(body, { status: response.status });
}
