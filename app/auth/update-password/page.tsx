"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { friendlyAuthError, validatePassword } from "@/lib/auth-utils"

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const configured = isSupabaseConfigured()

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setMessage("")
    if (!validatePassword(password)) return setMessage("La contraseña debe tener al menos 8 caracteres.")
    if (password !== confirm) return setMessage("Las contraseñas no coinciden.")
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return setMessage("La nube no está configurada.")
    setLoading(true)
    const session = await supabase.auth.getSession()
    if (!session.data.session) {
      setLoading(false)
      return setMessage("El enlace de recuperación no está activo o expiró. Solicita uno nuevo.")
    }
    const result = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (result.error) return setMessage(friendlyAuthError(result.error.message))
    setMessage("Contraseña actualizada correctamente.")
    router.push("/auth/login")
  }

  return <main className="min-h-screen grid place-items-center bg-muted/30 p-4">
    <Card className="w-full max-w-md">
      <CardHeader><CardTitle>Crear nueva contraseña</CardTitle><CardDescription>Ingresa y confirma tu nueva contraseña para completar la recuperación.</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="password">Nueva contraseña</Label><Input id="password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="confirm">Confirmar contraseña</Label><Input id="confirm" type="password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>
          {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
          <Button className="w-full" disabled={loading || !configured}>{loading ? "Actualizando..." : "Actualizar contraseña"}</Button>
        </form>
        <Button variant="ghost" className="mt-2 w-full" asChild><Link href="/auth/reset-password">Solicitar otro enlace</Link></Button>
      </CardContent>
    </Card>
  </main>
}
