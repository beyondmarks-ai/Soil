import { DashboardShell } from "../components/dashboard-shell";
import { Overview } from "../components/overview";
import { readAudit, readHistory } from "../lib/cloud-data";
import { readLiveData } from "../lib/read-live-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [live, history, audit] = await Promise.all([readLiveData(), readHistory(96), readAudit(1)]);
  const date = new Date().toLocaleDateString("en-IN", { dateStyle: "full" });
  return <DashboardShell title="Farm overview" subtitle={`${date} · Greenfield Farm`} hardwareConnected={live.connected} hardwarePort={live.port}><Overview initialData={live} history={history} latestAudit={audit[0] ?? null} /></DashboardShell>;
}
