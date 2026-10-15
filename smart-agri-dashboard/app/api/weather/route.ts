import { readSettings } from "../../../lib/cloud-data";
export const dynamic = "force-dynamic";
export async function GET() {
  const settings = await readSettings();
  const key = process.env.AZURE_MAPS_KEY;
  if (!key) return Response.json({ configured: false, message: "Azure Maps is not configured" });
  const query = `${settings.latitude},${settings.longitude}`;
  const response = await fetch(`https://atlas.microsoft.com/weather/currentConditions/json?api-version=1.0&query=${encodeURIComponent(query)}&subscription-key=${encodeURIComponent(key)}`, { cache: "no-store" });
  if (!response.ok) return Response.json({ configured: true, error: "Weather service unavailable" }, { status: 502 });
  const payload = await response.json();
  const result = payload.results?.[0];
  return Response.json({ configured: true, temperature: result?.temperature?.value, phrase: result?.phrase, humidity: result?.relativeHumidity, precipitation: result?.hasPrecipitation ?? false });
}
