import { z } from "zod";
import { defaultSettings, readSettings, saveSettings } from "../../../lib/cloud-data";
const schema = z.object({
  farmName: z.string().min(2).max(80), lowSoilThreshold: z.number().min(0).max(100),
  targetSoilThreshold: z.number().min(0).max(100), highTemperatureThreshold: z.number().min(0).max(80),
  latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), automaticIrrigation: z.boolean(),
});
export const dynamic = "force-dynamic";
export async function GET() { return Response.json(await readSettings()); }
export async function PUT(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.targetSoilThreshold <= parsed.data.lowSoilThreshold) return Response.json({ error: "Target moisture must be above the low threshold." }, { status: 400 });
  const settings = { ...defaultSettings, ...parsed.data };
  try {
    await saveSettings(settings);
    const base = process.env.AZURE_FUNCTION_BASE_URL;
    const key = process.env.AZURE_FUNCTION_KEY;
    if (base && key) {
      const response = await fetch(`${base.replace(/\/$/, "")}/api/irrigation/config?code=${encodeURIComponent(key)}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: "esp32-greenfield-01", enabled: settings.automaticIrrigation, startPercent: settings.lowSoilThreshold, stopPercent: settings.targetSoilThreshold }),
      });
      if (!response.ok) return Response.json({ ...settings, warning: "Settings saved, but the device did not accept the synchronization command." }, { status: 202 });
    }
    return Response.json(settings);
  }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to save settings" }, { status: 503 }); }
}
