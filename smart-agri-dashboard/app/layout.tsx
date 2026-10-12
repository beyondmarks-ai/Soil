import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TerraLedger | Smart Agriculture",
  description: "IoT and blockchain-enabled smart agriculture dashboard",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
