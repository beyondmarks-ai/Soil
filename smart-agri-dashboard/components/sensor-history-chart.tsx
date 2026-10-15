"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SensorHistoryPoint } from "../lib/sensor-types";

export function SensorHistoryChart({ history }: { history: SensorHistoryPoint[] }) {
  if (!history.length) return <div className="chart-empty">Historical readings will appear after Azure telemetry is stored.</div>;
  const data = history.map((item) => ({ time: item.receivedAt ? new Date(item.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "", moisture: item.soilPercent }));
  return <div className="recharts-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 12, right: 12, left: -24, bottom: 0 }}><defs><linearGradient id="moistureFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#287c58" stopOpacity={0.28}/><stop offset="1" stopColor="#287c58" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid stroke="#e9ede9" vertical={false}/><XAxis dataKey="time" tick={{ fontSize: 9, fill: "#7b8a82" }} axisLine={false} tickLine={false}/><YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#7b8a82" }} axisLine={false} tickLine={false}/><Tooltip contentStyle={{ borderRadius: 10, borderColor: "#dce5df", fontSize: 11 }}/><Area type="monotone" dataKey="moisture" name="Soil moisture" stroke="#287c58" strokeWidth={2.5} fill="url(#moistureFill)" connectNulls/></AreaChart></ResponsiveContainer></div>;
}
