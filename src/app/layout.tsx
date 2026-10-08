// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import AppChrome from "@/components/app/AppChrome";
import "./globals.css";

export const metadata: Metadata = {
  title: "Praxis",
  description: "Real-world social action RPG.",
  applicationName: "Praxis",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Praxis",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#111312",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-canvas-base text-ink-primary antialiased">
        <AuthProvider>
          <ToastProvider>
            <div
              className="pointer-events-none fixed inset-0 z-50 mix-blend-overlay opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOCIgbnVtT2N0YXZlcz0iMyIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiLz48L3N2Zz4=")`,
              }}
              aria-hidden="true"
            />
            <AppChrome>{children}</AppChrome>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
