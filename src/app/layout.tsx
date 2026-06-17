import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import PendoPageTracker from "@/components/PendoPageTracker";
import { PENDO_INSTALL_SNIPPET } from "@/lib/pendo";

export const metadata: Metadata = {
  metadataBase: new URL("https://feature-court.vercel.app"),
  title: "Feature Court — Put your product decision on trial",
  description:
    "Your product decision goes on trial. The prosecution tears it apart, the defense fights for it, and you deliver the verdict.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Feature Court — Put your product decision on trial",
    description:
      "Your product decision goes on trial. The prosecution tears it apart, the defense fights for it, and you deliver the verdict.",
    url: "https://feature-court.vercel.app",
    siteName: "Feature Court",
    images: [
      {
        url: "/og",
        width: 1200,
        height: 630,
        alt: "Feature Court — Put your product decision on trial",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Feature Court — Put your product decision on trial",
    description:
      "Your product decision goes on trial. The prosecution tears it apart, the defense fights for it, and you deliver the verdict.",
    images: ["/og"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <script
          id="pendo-install"
          dangerouslySetInnerHTML={{ __html: PENDO_INSTALL_SNIPPET }}
        />
      </head>
      <body className="min-h-full antialiased">
        <Suspense fallback={null}>
          <PendoPageTracker />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
