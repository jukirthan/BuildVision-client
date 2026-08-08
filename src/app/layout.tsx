import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import PWAProvider from "@/components/pwa/PWAProvider";
import "./globals.css";

/*
 * One typeface, two roles. Inter carries both display and body duty —
 * headings differentiate through weight and tight tracking rather than a
 * second family, which keeps the whole product feeling engineered.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const siteOrigin =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  applicationName: "BuildVision",
  title: {
    default: "BuildVision — Design Tomorrow's Buildings Today",
    template: "%s · BuildVision",
  },
  description:
    "Create intelligent 3D buildings with AI-powered planning, structural validation, quantity estimation, and real-time collaboration — in the browser.",
  keywords: [
    "3D building design",
    "structural planning",
    "civil engineering software",
    "quantity estimation",
    "BuildVision",
  ],
  authors: [{ name: "BuildVision" }],
  creator: "BuildVision",
  publisher: "BuildVision",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "64x64", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BuildVision",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "BuildVision",
    title: "BuildVision — Design Tomorrow's Buildings Today",
    description:
      "AI-powered 3D building planning, structural validation, and quantity estimation in the browser.",
    images: [
      {
        url: "/buildvision.png",
        width: 1024,
        height: 1024,
        alt: "BuildVision logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "BuildVision — Design Tomorrow's Buildings Today",
    description:
      "AI-powered 3D building planning, structural validation, and quantity estimation in the browser.",
    images: ["/buildvision.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased`}
        style={{ ["--font-display" as string]: "var(--font-body)" }}
      >
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <PWAProvider>{children}</PWAProvider>
      </body>
    </html>
  );
}
