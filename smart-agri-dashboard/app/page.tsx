import { DashboardShell } from "../components/dashboard-shell";
import { Overview } from "../components/overview";
import { readLiveData } from "../lib/read-live-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const live = await readLiveData();
  return <DashboardShell title="Farm overview" subtitle="Sunday, 12 October 2026 · Greenfield Farm" hardwareConnected={live.connected} hardwarePort={live.port}><Overview initialData={live} /></DashboardShell>;
}
