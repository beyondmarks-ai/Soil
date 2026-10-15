import { readHistory } from "../../../lib/cloud-data";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const rows = await readHistory(500);
  if (new URL(request.url).searchParams.get("format") === "pdf") {
    const document = await PDFDocument.create();
    const page = document.addPage([595, 842]);
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    const latest = rows.at(-1);
    const values = (key: "soilPercent" | "temperature" | "humidity") => rows.map((row) => row[key]).filter((value): value is number => typeof value === "number");
    const average = (items: number[]) => items.length ? (items.reduce((sum, item) => sum + item, 0) / items.length).toFixed(1) : "N/A";
    page.drawRectangle({ x: 0, y: 760, width: 595, height: 82, color: rgb(0.08, 0.38, 0.25) });
    page.drawText("Soil Agri - Farm Summary", { x: 42, y: 798, size: 22, font: bold, color: rgb(1, 1, 1) });
    page.drawText(`Generated ${new Date().toLocaleString("en-IN")}`, { x: 42, y: 778, size: 9, font: regular, color: rgb(0.86, 0.95, 0.89) });
    const lines = [
      `Telemetry samples: ${rows.length}`,
      `Average soil moisture: ${average(values("soilPercent"))}%`,
      `Average temperature: ${average(values("temperature"))} C`,
      `Average humidity: ${average(values("humidity"))}%`,
      `Relay active samples: ${rows.filter((row) => row.relay === "ON").length}`,
      `Latest reading: ${typeof latest?.receivedAt === "string" ? new Date(latest.receivedAt).toLocaleString("en-IN") : "No data"}`,
    ];
    page.drawText("Operational overview", { x: 42, y: 715, size: 16, font: bold, color: rgb(0.08, 0.28, 0.2) });
    lines.forEach((line, index) => page.drawText(line, { x: 48, y: 680 - index * 30, size: 11, font: regular, color: rgb(0.15, 0.2, 0.17) }));
    page.drawText("Every cloud reading is SHA-256 hashed; see the dashboard audit page for verification status.", { x: 42, y: 455, size: 9, font: regular, color: rgb(0.35, 0.4, 0.37), maxWidth: 500 });
    const bytes = await document.save();
    return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=soil-agri-summary.pdf" } });
  }
  const header = ["receivedAt", "deviceId", "soilPercent", "soilRaw", "temperature", "humidity", "relay", "dhtOk", "hash"];
  const csv = [header.join(","), ...rows.map((row) => header.map((key) => JSON.stringify((row as unknown as Record<string, unknown>)[key] ?? "")).join(","))].join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=soil-agri-telemetry.csv" } });
}
