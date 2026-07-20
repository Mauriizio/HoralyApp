import type { Session, User } from "@supabase/supabase-js"

export type AuthNotice = {
  type: "success" | "error" | "info" | "warning"
  title: string
  description?: string
  action?: { label: string; href?: string; onClick?: () => void }
}

export type SignUpResult = { session: Session | null; user: User | null }

export function classifySignUpResult(data: SignUpResult) {
  if (data.session) return "authenticated" as const
  if (data.user) return "confirmation-pending" as const
  return "unknown" as const
}

export function maskEmail(email: string) {
  const [name = "", domain = ""] = email.split("@")
  if (!domain) return email
  const visible = name.length <= 2 ? name.slice(0, 1) : `${name.slice(0, 2)}${"*".repeat(Math.min(5, name.length - 2))}`
  return `${visible}@${domain}`
}

export function mapAuthError(error?: { message?: string; code?: string; status?: number } | null): AuthNotice {
  const raw = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase()
  if (raw.includes("email_not_confirmed") || raw.includes("email not confirmed")) return { type: "warning", title: "Tu correo todavía no está confirmado.", description: "Confirma tu correo o solicita un nuevo enlace para activar el inicio de sesión." }
  if (raw.includes("invalid login") || raw.includes("invalid_credentials") || raw.includes("invalid credentials")) return { type: "error", title: "Correo o contraseña incorrectos.", description: "Revisa tus datos o recupera tu contraseña. Por seguridad no confirmamos si el correo está registrado." }
  if (raw.includes("rate") || raw.includes("over_email_send_rate_limit") || error?.status === 429) return { type: "warning", title: "Límite temporal de envío alcanzado.", description: "Supabase limita temporalmente la cantidad de correos. Espera antes de reintentar; no enviamos otro correo en este intento." }
  if (raw.includes("network") || raw.includes("fetch")) return { type: "error", title: "No pudimos conectar con el servidor.", description: "Revisa tu conexión e intenta nuevamente." }
  return { type: "error", title: "No se pudo completar la operación.", description: "Intenta nuevamente en unos minutos." }
}

export type CallbackStatus = "email-confirmed" | "password-recovery-ready" | "otp-expired" | "access-denied" | "invalid-link" | "callback-failed"

export function classifyCallbackError(params: URLSearchParams, exchangeError?: { message?: string; code?: string } | null): CallbackStatus | null {
  const raw = `${params.get("error") ?? ""} ${params.get("error_code") ?? ""} ${params.get("error_description") ?? ""} ${exchangeError?.code ?? ""} ${exchangeError?.message ?? ""}`.toLowerCase()
  if (!raw.trim()) return null
  if (raw.includes("otp_expired") || raw.includes("expired")) return "otp-expired"
  if (raw.includes("access_denied") || raw.includes("denied")) return "access-denied"
  if (raw.includes("invalid") || raw.includes("already") || raw.includes("used")) return "invalid-link"
  return "callback-failed"
}
