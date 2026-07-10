import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";
import "./globals.css";

export function generateMetadata(): Metadata {
  return {
    title: "Maya · Inbox",
    description: "UV Gullas counsellor inbox",
    other: {
      ...Sentry.getTraceData(),
    },
  };
}
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
