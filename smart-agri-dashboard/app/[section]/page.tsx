import { notFound } from "next/navigation";
import { DashboardShell } from "../../components/dashboard-shell";
import { getSectionConfig, SectionContent } from "../../components/section-content";
import { LiveSensors } from "../../components/live-sensors";
import { readLiveData } from "../../lib/read-live-data";

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const config = getSectionConfig(section);
  if (!config) notFound();
  const live = await readLiveData();
  return <DashboardShell title={config.title} subtitle={config.subtitle} hardwareConnected={live.connected} hardwarePort={live.port}>{section === "sensors" ? <LiveSensors initialData={live} /> : <SectionContent section={section as Parameters<typeof SectionContent>[0]["section"]} />}</DashboardShell>;
}
