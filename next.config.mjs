const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "https://*.supabase.co"
const isDev = process.env.NODE_ENV !== "production"
const scriptSrc = ["script-src 'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])].join(" ")

// 'unsafe-inline' se mantiene temporalmente por compatibilidad con Next.js/Turbopack y estilos/scripts inyectados.
const csp = [
  "default-src 'self'",
  `connect-src 'self' ${supabaseOrigin} https://*.supabase.co${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
  `img-src 'self' data: blob: ${supabaseOrigin} https://*.supabase.co`,
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ")

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: csp },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    }]
  },
}

export default nextConfig
