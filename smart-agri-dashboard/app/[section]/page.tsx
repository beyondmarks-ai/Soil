import { notFound } from "next/navigation";
import { DashboardShell } from "../../components/dashboard-shell";
import { getSectionConfig, SectionContent } from "../../components/section-content";
import { LiveSensors } from "../../components/live-sensors";
import { readLiveData } from "../../lib/read-live-data";
import { readAlerts, readAudit, readHistory, readSettings } from "../../lib/cloud-data";
import { AlertsModule, BlockchainModule, DevicesModule, IrrigationModule, ReportsModule, SettingsModule } from "../../components/module-pages";

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const config = getSectionConfig(section);
  if (!config) notFound();
  const live = await readLiveData();
  let content: React.ReactNode;
  if (section === "sensors") content = <LiveSensors initialData={live} />;
  else if (section === "irrigation") content = <IrrigationModule initialData={live} />;
  else if (section === "blockchain") content = <BlockchainModule records={await readAudit()} />;
  else if (section === "devices") content = <DevicesModule initialData={live} />;
  else if (section === "alerts") content = <AlertsModule alerts={await readAlerts()} />;
  else if (section === "reports") content = <ReportsModule recordCount={(await readHistory(500)).length} />;
  else if (section === "settings") content = <SettingsModule initialSettings={await readSettings()} />;
  else content = <SectionContent section={section as Parameters<typeof SectionContent>[0]["section"]} />;
  return <DashboardShell title={config.title} subtitle={config.subtitle} hardwareConnected={live.connected} hardwarePort={live.port}>{content}</DashboardShell>;
}
