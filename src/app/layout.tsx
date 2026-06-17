import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import PendoInitializer from "@/components/PendoInitializer";

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
      <body className="min-h-full antialiased">
        <Script
          id="pendo"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(apiKey){
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track','trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
    y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo.io/agent/static/'+apiKey+'/pendo.js';
    z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('65d162d9-3564-4163-afea-335d005e12ed');`,
          }}
        />
        <PendoInitializer />
        {children}
      </body>
    </html>
  );
}