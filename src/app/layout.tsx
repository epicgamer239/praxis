// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import BottomNav from "@/components/navigation/BottomNav";
import MobileHeader from "@/components/navigation/MobileHeader";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
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
      <body className="bg-canvas-base text-ink-primary antialiased min-h-full">
        <AuthProvider>
          <ToastProvider>
            <div className="praxis-shell">
              <MobileHeader />
              <main className="praxis-main">
                <div className="max-w-lg mx-auto">{children}</div>
              </main>
            </div>
            <BottomNav />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
