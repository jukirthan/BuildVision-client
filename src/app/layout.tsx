import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
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

export const metadata: Metadata = {
  title: "BuildVision — Design Tomorrow's Buildings Today",
  description:
    "Create intelligent 3D buildings with AI-powered planning, structural validation, quantity estimation, and real-time collaboration — in the browser.",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "64x64", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BuildVision",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#ffffff",
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
        {children}
      </body>
    </html>
  );
}
