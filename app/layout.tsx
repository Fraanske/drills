import "./globals.css";
import type { Metadata } from "next";
import packageJson from "@/package.json";
import { VersionBadge } from "@/components/version-badge";

export const metadata: Metadata = {
  title: "Basketball Drills Workspace",
  description: "Shared basketball drill and practice workspace with editable flow diagrams.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <VersionBadge version={packageJson.version} />
        {children}
      </body>
    </html>
  );
}
