import { readLiveData } from "../../../lib/read-live-data";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await readLiveData(), { headers: { "Cache-Control": "no-store, max-age=0" } });
}
