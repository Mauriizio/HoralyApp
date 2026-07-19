import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFile } from "node:fs/promises"
import { classifyCallbackError, classifySignUpResult, mapAuthError, maskEmail } from "../lib/auth-flow.ts"
import { buildAuthRedirectUrl, safeInternalRedirect } from "../lib/auth-url.ts"

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
  assert.match(source, /buildAuthRedirectUrl\("\/auth\/callback\?next=\/auth\/status\?code=email-confirmed"\)/)
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
  assert.match(source, /metadataBase: new URL\(getPublicSiteUrl\(\)\)/)
})

test("no hay secretos versionados", () => {
  const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  assert.equal(/SERVICE_ROLE|SUPABASE_DB_PASSWORD|postgres:\/\//.test(tracked), false)
})

test("buildAuthRedirectUrl usa origen público y path seguro", () => {
  assert.equal(buildAuthRedirectUrl("/auth/callback", "https://app.example.com"), "https://app.example.com/auth/callback")
  assert.equal(buildAuthRedirectUrl("https://evil.com", "https://app.example.com"), "https://app.example.com/")
})
