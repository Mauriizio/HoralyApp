import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFile } from "node:fs/promises"
import { classifyCallbackError, classifySignUpResult, mapAuthError, maskEmail } from "../lib/auth-flow.ts"
import { buildAuthRedirectUrl, buildClientAuthRedirectUrl, getClientAuthOrigin, getMetadataBase, getPublicAuthCallbackUrl, getServerSiteUrl, safeInternalRedirect } from "../lib/auth-url.ts"

test("registro con session null produce confirmación pendiente", () => {
  assert.equal(classifySignUpResult({ user: { id: "u1" } as never, session: null }), "confirmation-pending")
})

test("registro con session produce autenticación inmediata", () => {
  assert.equal(classifySignUpResult({ user: { id: "u1" } as never, session: { access_token: "x" } as never }), "authenticated")
})

test("email se muestra enmascarado", () => {
  assert.equal(maskEmail("maria@example.com"), "ma***@example.com")
})

test("email_not_confirmed se clasifica correctamente", () => {
  assert.equal(mapAuthError({ code: "email_not_confirmed", message: "Email not confirmed" }).title, "Tu correo todavía no está confirmado.")
})

test("credenciales inválidas no revelan existencia de usuario", () => {
  const notice = mapAuthError({ message: "Invalid login credentials" })
  assert.equal(notice.title, "Correo o contraseña incorrectos.")
  assert.match(notice.description ?? "", /no confirmamos si el correo está registrado/)
})

test("resend usa type signup y redirect correcto", async () => {
  const source = await readFile("components/auth-form.tsx", "utf8")
  assert.match(source, /auth\.resend\(\{ type: "signup", email, options: \{ emailRedirectTo:/)
  assert.match(source, /getPublicAuthCallbackUrl\("\?next=\/auth\/status\?code=email-confirmed"\)/)
})

test("cooldown impide doble envío", async () => {
  const source = await readFile("components/auth-form.tsx", "utf8")
  assert.match(source, /COOLDOWN_SECONDS = 60/)
  assert.match(source, /if \(resending \|\| cooldown > 0/)
})

test("reset exitoso produce vista de revisar correo", async () => {
  const source = await readFile("components/auth-form.tsx", "utf8")
  assert.match(source, /Revisa tu correo para continuar/)
  assert.match(source, /resetPasswordForEmail/)
})

test("safeInternalRedirect acepta paths internos", () => {
  assert.equal(safeInternalRedirect("/auth/login?x=1"), "/auth/login?x=1")
})

test("safeInternalRedirect rechaza URLs externas y doble slash", () => {
  assert.equal(safeInternalRedirect("https://evil.com", "/safe"), "/safe")
  assert.equal(safeInternalRedirect("//evil.com", "/safe"), "/safe")
})

test("callback interpreta otp_expired", () => {
  assert.equal(classifyCallbackError(new URLSearchParams("error_code=otp_expired")), "otp-expired")
})

test("callback no ignora exchangeCodeForSession error", () => {
  assert.equal(classifyCallbackError(new URLSearchParams(), { message: "expired token" }), "otp-expired")
})

test("update-password detecta sesión ausente", async () => {
  const source = await readFile("app/auth/update-password/page.tsx", "utf8")
  assert.match(source, /getSession\(\)/)
  assert.match(source, /El enlace de recuperación no está activo o expiró/)
})

test("controles de contraseña tienen etiquetas accesibles", async () => {
  const source = await readFile("components/password-input.tsx", "utf8")
  assert.match(source, /Mostrar contraseña/)
  assert.match(source, /Ocultar contraseña/)
  assert.match(source, /aria-pressed/)
})

test("metadataBase está configurado", async () => {
  const source = await readFile("app/layout.tsx", "utf8")
  assert.match(source, /metadataBase: getMetadataBase\(\)/)
})

test("no hay secretos versionados", () => {
  const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  assert.equal(/SERVICE_ROLE|SUPABASE_DB_PASSWORD|postgres:\/\//.test(tracked), false)
})

test("buildAuthRedirectUrl usa origen servidor y path seguro", () => {
  assert.equal(buildAuthRedirectUrl("/auth/callback", "https://app.example.com"), "https://app.example.com/auth/callback")
  assert.equal(buildAuthRedirectUrl("https://evil.com", "https://app.example.com"), "https://app.example.com/")
})

function withWindowOrigin(origin: string, fn: () => void) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window")
  Object.defineProperty(globalThis, "window", { value: { location: { origin } }, configurable: true })
  try { fn() } finally {
    if (original) Object.defineProperty(globalThis, "window", original)
    else Reflect.deleteProperty(globalThis, "window")
  }
}

test("localhost vuelve a localhost en operaciones cliente", () => {
  const previous = process.env.NODE_ENV
  process.env.NODE_ENV = "development"
  withWindowOrigin("http://localhost:3000", () => {
    assert.equal(getClientAuthOrigin(), "http://localhost:3000")
    assert.equal(buildClientAuthRedirectUrl("/auth/callback"), "http://localhost:3000/auth/callback")
  })
  process.env.NODE_ENV = previous
})

test("preview de Vercel usa el callback público estable", () => {
  withWindowOrigin("https://horaly-git-feature-mauriizio.vercel.app", () => {
    assert.equal(getPublicAuthCallbackUrl("?next=/auth/update-password"), "https://horaly-app.vercel.app/auth/callback?next=%2Fauth%2Fupdate-password")
  })
})

test("NEXT_PUBLIC_SITE_URL reemplaza una preview en enlaces Auth", () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL
  process.env.NEXT_PUBLIC_SITE_URL = "https://horaly.app"
  withWindowOrigin("https://preview.vercel.app", () => {
    assert.equal(getPublicAuthCallbackUrl(), "https://horaly.app/auth/callback")
  })
  process.env.NEXT_PUBLIC_SITE_URL = previous
})

test("variable Auth explícita tiene prioridad", () => {
  const previousAuth = process.env.NEXT_PUBLIC_AUTH_SITE_URL
  const previousSite = process.env.NEXT_PUBLIC_SITE_URL
  process.env.NEXT_PUBLIC_AUTH_SITE_URL = "https://cuentas.horarily.example"
  process.env.NEXT_PUBLIC_SITE_URL = "https://horaly.app"
  assert.equal(getPublicAuthCallbackUrl(), "https://cuentas.horarily.example/auth/callback")
  process.env.NEXT_PUBLIC_AUTH_SITE_URL = previousAuth
  process.env.NEXT_PUBLIC_SITE_URL = previousSite
})

test("callback conserva solo destinos internos", () => {
  assert.equal(getPublicAuthCallbackUrl("?next=https://evil.example"), "https://horaly-app.vercel.app/auth/callback?next=%2F")
})

test("metadataBase sí puede usar NEXT_PUBLIC_SITE_URL", () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL
  process.env.NEXT_PUBLIC_SITE_URL = "https://horaly.app"
  assert.equal(getServerSiteUrl(), "https://horaly.app")
  assert.equal(getMetadataBase().origin, "https://horaly.app")
  process.env.NEXT_PUBLIC_SITE_URL = previous
})

test("template de confirmación queda versionado en español y usa ConfirmationURL", async () => {
  const html = await readFile("docs/operations/email-templates/confirm-signup.html", "utf8")
  assert.match(html, /Confirma tu cuenta en HORARILY/)
  assert.match(html, /\{\{ \.ConfirmationURL \}\}/)
  assert.match(html, /Confirmar mi correo/)
  assert.match(html, /copia y pega este enlace/)
  assert.match(html, /horarily_simbolo_transparente_1024\.png/)
  assert.equal(/service_role|access[_ -]?token|SUPABASE_/i.test(html), false)
})


test("rate limit 429 se muestra como límite temporal de envío", () => {
  const notice = mapAuthError({ code: "over_email_send_rate_limit", status: 429, message: "over_email_send_rate_limit" })
  assert.equal(notice.title, "Límite temporal de envío alcanzado.")
  assert.match(notice.description ?? "", /no enviamos otro correo/)
})

test("encabezado invitado define una sola fuente de login y registro", async () => {
  const page = await readFile("app/page.tsx", "utf8")
  const profileButton = await readFile("components/profile-button.tsx", "utf8")
  assert.match(page, /<GuestAuthActions/)
  const actions = await readFile("components/auth/guest-auth-actions.tsx", "utf8")
  assert.match(actions, /Iniciar sesión/)
  assert.match(actions, /Crear cuenta/)
  assert.match(page, /\{authenticated && <ProfileButton store=\{store\} \/>\}/)
  assert.equal((profileButton.match(/Iniciar sesión/g) ?? []).length, 0)
  assert.equal((profileButton.match(/Crear cuenta/g) ?? []).length, 0)
  assert.match(profileButton, /if \(loading \|\| !authenticated\) return null/)
})
