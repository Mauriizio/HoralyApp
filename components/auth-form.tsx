"use client"

import Link from "next/link"
import { X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PasswordInput } from "@/components/password-input"
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { validateEmail, validatePassword } from "@/lib/auth-utils"
import { getPublicAuthCallbackUrl } from "@/lib/auth-url"
import { type AuthNotice, classifySignUpResult, mapAuthError, maskEmail } from "@/lib/auth-flow"

type Mode = "login" | "register" | "reset"
const COOLDOWN_SECONDS = 60

const noticeClasses = {
  success: "border-green-300 bg-green-50 text-green-900",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  error: "border-destructive/40 bg-destructive/10 text-destructive",
  info: "border-border bg-muted/50 text-foreground",
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [notice, setNotice] = useState<AuthNotice | null>(null)
  const [successView, setSuccessView] = useState<"signup" | "reset" | null>(null)
  const noticeRef = useRef<HTMLDivElement>(null)
  const configured = isSupabaseConfigured()
  const title = mode === "login" ? "Iniciar sesión" : mode === "register" ? "Crear cuenta" : "Recuperar contraseña"
  const description = mode === "login"
    ? "Inicia sesión para acceder a tus datos sincronizados."
    : mode === "register"
      ? "Crea tu cuenta y guarda tus materias, horarios y notas de forma privada."
      : "Ingresa el correo asociado a tu cuenta. Te enviaremos un enlace seguro para crear una nueva contraseña."

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  useEffect(() => {
    if (notice) noticeRef.current?.focus()
  }, [notice])

  async function resendConfirmation() {
    if (resending || cooldown > 0 || !validateEmail(email)) return
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return setNotice({ type: "warning", title: "La nube no está configurada.", description: "Puedes continuar en modo invitado." })
    setResending(true)
    const { error } = successView === "reset"
      ? await supabase.auth.resetPasswordForEmail(email, { redirectTo: getPublicAuthCallbackUrl("?next=/auth/update-password") })
      : await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: getPublicAuthCallbackUrl("?next=/auth/status?code=email-confirmed") } })
    setResending(false)
    if (error) {
      const mapped = mapAuthError(error)
      if (mapped.title === "Límite temporal de envío alcanzado.") setCooldown(COOLDOWN_SECONDS)
      return setNotice(mapped)
    }
    setCooldown(COOLDOWN_SECONDS)
    setNotice({ type: "success", title: "Correo reenviado.", description: "Revisa tu bandeja de entrada y spam." })
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setNotice(null)
    if (!validateEmail(email)) return setNotice({ type: "error", title: "Ingresa un correo válido." })
    if (mode !== "reset" && !validatePassword(password)) return setNotice({ type: "error", title: "La contraseña debe tener al menos 8 caracteres." })
    if (mode === "register" && password !== confirmPassword) return setNotice({ type: "error", title: "Las contraseñas no coinciden.", description: "Confirma la misma contraseña antes de crear tu cuenta." })
    if (loading) return
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return setNotice({ type: "warning", title: "La nube no está configurada.", description: "Puedes continuar en modo invitado." })
    setLoading(true)
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : mode === "register"
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: getPublicAuthCallbackUrl("?next=/auth/status?code=email-confirmed") } })
        : await supabase.auth.resetPasswordForEmail(email, { redirectTo: getPublicAuthCallbackUrl("?next=/auth/update-password") })
    setLoading(false)
    if (result.error) {
      const mapped = mapAuthError(result.error)
      if (mapped.title === "Límite temporal de envío alcanzado.") setCooldown(COOLDOWN_SECONDS)
      return setNotice(mapped)
    }
    if (mode === "reset") {
      setSuccessView("reset"); setCooldown(COOLDOWN_SECONDS)
      return setNotice({ type: "success", title: "Revisa tu correo para continuar.", description: "Si existe una cuenta asociada, recibirás un enlace. Puede expirar por seguridad." })
    }
    if (mode === "register") {
      const kind = classifySignUpResult(result.data as { user: never; session: never })
      if (kind === "confirmation-pending") { setSuccessView("signup"); setCooldown(COOLDOWN_SECONDS); return setNotice({ type: "success", title: "Cuenta creada. Te enviamos un enlace de confirmación", description: `Enviado a ${maskEmail(email)}. Revisa también spam.` }) }
      if (kind === "authenticated") { setNotice({ type: "success", title: "Cuenta creada correctamente." }); router.push("/"); router.refresh(); return }
    }
    router.push("/"); router.refresh()
  }

  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true"

  async function signInWithGoogle() {
    if (loading) return
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return setNotice({ type: "warning", title: "La nube no está configurada.", description: "Puedes continuar con correo y contraseña cuando Supabase esté configurado." })
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: getPublicAuthCallbackUrl("?next=/") } })
    setLoading(false)
    if (error) setNotice(mapAuthError(error))
  }

  const configurationNotice = !configured && (
    <div role="status" className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <p>El inicio de sesión no está disponible temporalmente por un problema de configuración. Tus datos locales permanecen seguros.</p>
      {process.env.NODE_ENV === "development" && (
        <p className="mt-1">Detalle técnico: completa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY para activar autenticación.</p>
      )}
      <Link href="/" className="mt-2 inline-flex font-medium underline underline-offset-4">Volver a HORARILY</Link>
    </div>
  )

  const noticeBox = <>{configurationNotice}{notice && <div ref={noticeRef} tabIndex={-1} role={notice.type === "error" ? "alert" : "status"} aria-live={notice.type === "error" ? "assertive" : "polite"} className={`rounded-md border p-3 text-sm outline-none ${noticeClasses[notice.type]}`}><p className="font-medium">{notice.title}</p>{notice.description && <p className="mt-1">{notice.description}</p>}</div>}</>

  if (successView) return <main className="min-h-screen grid place-items-center bg-muted/30 p-4"><Card className="w-full max-w-md"><CardHeader className="relative pr-12"><Button variant="ghost" size="icon" className="absolute right-3 top-3" aria-label="Volver a Horaly" asChild><Link href="/"><X className="h-4 w-4" aria-hidden /></Link></Button><CardTitle>{successView === "signup" ? "Cuenta creada. Te enviamos un enlace de confirmación" : "Revisa tu correo para continuar"}</CardTitle><CardDescription>{successView === "signup" ? "La cuenta todavía no está lista para iniciar sesión hasta confirmar el correo." : "Si Supabase acepta la solicitud, recibirás un enlace para crear una nueva contraseña."}</CardDescription></CardHeader><CardContent className="space-y-4">{noticeBox}<p className="text-sm text-muted-foreground">Correo: <span className="font-medium text-foreground">{maskEmail(email)}</span>. Revisa spam. Los enlaces pueden expirar o quedar inválidos si los usas más de una vez.</p><Button className="w-full" onClick={resendConfirmation} disabled={resending || cooldown > 0}>{resending ? "Reenviando..." : cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar correo"}</Button><div className="grid gap-2"><Button variant="outline" onClick={() => { setSuccessView(null); setNotice(null) }}>Cambiar correo</Button><Button variant="ghost" asChild><Link href="/auth/login">Ir a iniciar sesión</Link></Button><Button variant="ghost" asChild><Link href="/">Volver a Horaly</Link></Button></div></CardContent></Card></main>

  return <main className="min-h-screen grid place-items-center bg-muted/30 p-4"><Card className="w-full max-w-md"><CardHeader className="relative pr-12"><Button variant="ghost" size="icon" className="absolute right-3 top-3" aria-label="Volver a Horaly" asChild><Link href="/"><X className="h-4 w-4" aria-hidden /></Link></Button><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{!configured && process.env.NODE_ENV === "development" && <p className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Nube no configurada: completa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY para activar autenticación.</p>}<form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="email">Correo</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>{mode !== "reset" && <div className="space-y-2"><Label htmlFor="password">Contraseña</Label><PasswordInput id="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>}{mode === "register" && <div className="space-y-2"><Label htmlFor="confirmPassword">Confirmar contraseña</Label><PasswordInput id="confirmPassword" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></div>}{noticeBox}{notice?.title === "Tu correo todavía no está confirmado." && <div className="grid gap-2"><Button type="button" variant="outline" onClick={resendConfirmation} disabled={resending || cooldown > 0}>{resending ? "Reenviando..." : cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar confirmación"}</Button><Button type="button" variant="ghost" onClick={() => { setPassword(""); setNotice(null) }}>Cambiar correo</Button><Button type="button" variant="ghost" asChild><Link href="/auth/reset-password">Recuperar contraseña</Link></Button></div>}<Button className="w-full" disabled={loading || !configured || cooldown > 0}>{loading ? "Procesando..." : cooldown > 0 ? `Reintentar en ${cooldown}s` : title}</Button>{googleEnabled && <Button type="button" variant="outline" className="w-full" onClick={signInWithGoogle} disabled={loading || !configured}>Continuar con Google</Button>}</form><div className="mt-4 flex justify-between text-sm">{mode !== "login" ? <Link href="/auth/login">Iniciar sesión</Link> : <Link href="/auth/register">Crear cuenta</Link>}{mode !== "reset" && <Link href="/auth/reset-password">Olvidé mi contraseña</Link>}</div><Button variant="ghost" className="mt-2 w-full" asChild><Link href="/">Volver a Horaly</Link></Button></CardContent></Card></main>
}
