import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { PwaRegister } from "@/components/pwa-register"
import { getPublicSiteUrl } from "@/lib/auth-url"
import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(getPublicSiteUrl()),
  title: "Horario Escolar — Organiza tu semana",
  description:
    "Planifica tu horario de clases, bloques de estudio y recordatorios con una interfaz moderna y personalizable.",
  applicationName: "Horario Escolar",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Horario Escolar — Organiza tu semana",
    description:
      "Planifica tu horario de clases, bloques de estudio y recordatorios con una interfaz moderna y personalizable.",
    images: ["/og-1200x630.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Horario Escolar — Organiza tu semana",
    description:
      "Planifica tu horario de clases, bloques de estudio y recordatorios con una interfaz moderna y personalizable.",
    images: ["/og-1200x630.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Horario",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#000000",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es-419"
      className="bg-background"
      suppressHydrationWarning
    >
      <body className="font-sans antialiased min-h-svh">
        {children}
        <Toaster position="top-right" richColors closeButton />
        <PwaRegister />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
