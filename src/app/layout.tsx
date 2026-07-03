import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maya · Inbox",
  description: "UV Gullas counsellor inbox",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
