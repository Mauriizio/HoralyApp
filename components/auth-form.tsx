"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { friendlyAuthError, validateEmail, validatePassword } from "@/lib/auth-utils"

type Mode = "login" | "register" | "reset"

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const configured = isSupabaseConfigured()
  const title = mode === "login" ? "Iniciar sesión" : mode === "register" ? "Crear cuenta" : "Recuperar contraseña"

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setMessage("")
    if (!validateEmail(email)) return setMessage("Ingresa un correo válido.")
    if (mode !== "reset" && !validatePassword(password)) return setMessage("La contraseña debe tener al menos 8 caracteres.")
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return setMessage("La nube no está configurada. Puedes continuar en modo invitado.")
    setLoading(true)
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : mode === "register"
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/` } })
        : await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/reset-password` })
    setLoading(false)
    if (result.error) return setMessage(friendlyAuthError(result.error.message))
    if (mode === "reset") return setMessage("Te enviamos instrucciones para recuperar tu contraseña.")
    router.push("/")
    router.refresh()
  }

  return <main className="min-h-screen grid place-items-center bg-muted/30 p-4">
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Sincroniza tus materias, horarios, notas y recordatorios por usuario.</CardDescription>
      </CardHeader>
      <CardContent>
        {!configured && process.env.NODE_ENV === "development" && <p className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Nube no configurada: completa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY para activar autenticación.</p>}
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="email">Correo</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          {mode !== "reset" && <div className="space-y-2"><Label htmlFor="password">Contraseña</Label><Input id="password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>}
          {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
          <Button className="w-full" disabled={loading || !configured}>{loading ? "Procesando..." : title}</Button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          {mode !== "login" ? <Link href="/auth/login">Iniciar sesión</Link> : <Link href="/auth/register">Crear cuenta</Link>}
          {mode !== "reset" && <Link href="/auth/reset-password">Olvidé mi contraseña</Link>}
        </div>
        <Button variant="ghost" className="mt-2 w-full" asChild><Link href="/">Continuar como invitado</Link></Button>
      </CardContent>
    </Card>
  </main>
}
