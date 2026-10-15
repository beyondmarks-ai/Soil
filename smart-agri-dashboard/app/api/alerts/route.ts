import { readAlerts } from "../../../lib/cloud-data";
export const dynamic = "force-dynamic";
export async function GET() { return Response.json(await readAlerts(), { headers: { "Cache-Control": "no-store" } }); }
