export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const base = process.env.AZURE_FUNCTION_BASE_URL;
  const key = process.env.AZURE_FUNCTION_KEY;
  if (!base || !key) return Response.json({ error: "Realtime service is not configured" }, { status: 503 });
  const farmId = new URL(request.url).searchParams.get("farmId") ?? "greenfield";
  const response = await fetch(`${base.replace(/\/$/, "")}/api/realtime/negotiate?farmId=${encodeURIComponent(farmId)}&code=${encodeURIComponent(key)}`, { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  return Response.json(body, { status: response.status, headers: { "Cache-Control": "no-store" } });
}
