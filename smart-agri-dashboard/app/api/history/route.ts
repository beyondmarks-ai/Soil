import { readHistory } from "../../../lib/cloud-data";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 96);
  return Response.json(await readHistory(limit), { headers: { "Cache-Control": "no-store" } });
}
