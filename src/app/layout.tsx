import type { Metadata } from "next";
import "./globals.css";
import { DustMotes, AmbientCourtHum } from "@/components/court-components";

export const metadata: Metadata = {
  title: "Feature Court — Put your product decision on trial",
  description:
    "Your product decision goes on trial. The prosecution tears it apart, the defense fights for it, and you deliver the verdict.",
  openGraph: {
    title: "Feature Court",
    description: "Put your product decision on trial.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">
        <AmbientCourtHum />
        <DustMotes count={8} />
        <div className="light-beam" />
        {children}
      </body>
    </html>
  );
}