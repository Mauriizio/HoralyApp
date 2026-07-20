"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PasswordInput } from "@/components/password-input"
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { validatePassword } from "@/lib/auth-utils"
import { type AuthNotice, mapAuthError } from "@/lib/auth-flow"

const noticeClasses = { success: "border-green-300 bg-green-50 text-green-900", warning: "border-amber-300 bg-amber-50 text-amber-900", error: "border-destructive/40 bg-destructive/10 text-destructive", info: "border-border bg-muted/50 text-foreground" }

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [notice, setNotice] = useState<AuthNotice | null>(null)
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)
  const noticeRef = useRef<HTMLDivElement>(null)
  const configured = isSupabaseConfigured()
  useEffect(() => { if (notice) noticeRef.current?.focus() }, [notice])

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setNotice(null)
    if (!validatePassword(password)) return setNotice({ type: "error", title: "La contraseña debe tener al menos 8 caracteres.", description: "Usa una contraseña única para proteger tus datos." })
    if (password !== confirm) return setNotice({ type: "error", title: "Las contraseñas no coinciden." })
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return setNotice({ type: "warning", title: "La nube no está configurada." })
    setLoading(true)
    const session = await supabase.auth.getSession()
    if (!session.data.session) { setLoading(false); return setNotice({ type: "warning", title: "El enlace de recuperación no está activo o expiró.", description: "Solicita uno nuevo para continuar." }) }
    const result = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (result.error) return setNotice(mapAuthError(result.error))
    setCompleted(true); setNotice({ type: "success", title: "Contraseña actualizada correctamente.", description: "Ya puedes iniciar sesión con tu nueva contraseña." })
  }
  const noticeBox = notice && <div ref={noticeRef} tabIndex={-1} role={notice.type === "error" ? "alert" : "status"} aria-live={notice.type === "error" ? "assertive" : "polite"} className={`rounded-md border p-3 text-sm outline-none ${noticeClasses[notice.type]}`}><p className="font-medium">{notice.title}</p>{notice.description && <p className="mt-1">{notice.description}</p>}</div>
  return <main className="min-h-screen grid place-items-center bg-muted/30 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Crear nueva contraseña</CardTitle><CardDescription>Ingresa y confirma tu nueva contraseña para completar la recuperación.</CardDescription></CardHeader><CardContent>{completed ? <div className="space-y-4">{noticeBox}<Button className="w-full" asChild><Link href="/auth/login">Ir al login</Link></Button></div> : <form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="password">Nueva contraseña</Label><PasswordInput id="password" minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required /><p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p></div><div className="space-y-2"><Label htmlFor="confirm">Confirmar contraseña</Label><PasswordInput id="confirm" minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>{noticeBox}<Button className="w-full" disabled={loading || !configured}>{loading ? "Actualizando..." : "Actualizar contraseña"}</Button></form>}<Button variant="ghost" className="mt-2 w-full" asChild><Link href="/auth/reset-password">Solicitar otro enlace</Link></Button></CardContent></Card></main>
}
