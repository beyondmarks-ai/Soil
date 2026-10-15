import { readAudit } from "../../../lib/cloud-data";
export const dynamic = "force-dynamic";
export async function GET() { return Response.json(await readAudit(), { headers: { "Cache-Control": "no-store" } }); }
