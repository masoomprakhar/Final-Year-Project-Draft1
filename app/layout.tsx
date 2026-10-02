import type { Metadata } from "next";
import { PROJECT_TITLE } from "@/lib/project";
import "./globals.css";

export const metadata: Metadata = {
  title: PROJECT_TITLE,
  description:
    "Simcourt digital twin framework for process monitoring and simulation. Plant data, mock physics, and demo ML run in the browser.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden antialiased">{children}</body>
    </html>
  );
}
