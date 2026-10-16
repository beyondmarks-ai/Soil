"use client";

import { useState } from "react";

export function NotificationControl() {
  const supported = typeof window !== "undefined" && "Notification" in window;
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(supported ? Notification.permission : "unsupported");
  async function enable() { if (supported) setPermission(await Notification.requestPermission()); }
  return <div className="button-row"><button className="primary-button" type="button" disabled={!supported || permission === "granted"} onClick={() => void enable()}>{permission === "granted" ? "Browser notifications enabled" : "Enable PC/phone notifications"}</button><small className="form-message">Email and SMS recipients are configured through environment variables.</small></div>;
}
