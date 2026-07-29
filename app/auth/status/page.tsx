import Link from "next/link"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { CallbackStatus } from "@/lib/auth-flow"

const content: Record<CallbackStatus, { title: string; description: string }> = {
  "email-confirmed": { title: "Correo confirmado", description: "Tu cuenta ya está lista. Inicia sesión para continuar con HORARILY." },
  "password-recovery-ready": { title: "Recuperación lista", description: "Continúa creando una nueva contraseña segura." },
  "otp-expired": { title: "El enlace expiró", description: "Solicita un nuevo correo de confirmación para continuar." },
  "access-denied": { title: "Acceso denegado", description: "No pudimos completar la confirmación porque el proveedor rechazó la solicitud." },
  "invalid-link": { title: "Enlace inválido o ya utilizado", description: "El enlace no es válido, ya fue usado o no corresponde a esta sesión." },
  "callback-failed": { title: "No pudimos completar la operación", description: "Intenta nuevamente o solicita un nuevo enlace desde la pantalla correspondiente." },
}

export default async function AuthStatusPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams
    const safeCode = (code && code in content ? code : "callback-failed") as CallbackStatus
    const item = content[safeCode]
  return <main className="min-h-screen grid place-items-center bg-muted/30 p-4"><Card className="w-full max-w-md"><CardHeader className="relative pr-12"><Button variant="ghost" size="icon" className="absolute right-3 top-3" aria-label="Volver a HORARILY" asChild><Link href="/"><X className="h-4 w-4" aria-hidden /></Link></Button><CardTitle>{item.title}</CardTitle><CardDescription>{item.description}</CardDescription></CardHeader><CardContent className="grid gap-2"><Button asChild><Link href={safeCode === "password-recovery-ready" ? "/auth/update-password" : "/auth/login"}>{safeCode === "password-recovery-ready" ? "Crear nueva contraseña" : safeCode === "email-confirmed" ? "Continuar con HORARILY" : "Volver al login"}</Link></Button>{safeCode !== "email-confirmed" && <Button variant="outline" asChild><Link href="/auth/register">Reenviar correo de confirmación</Link></Button>}<Button variant="ghost" asChild><Link href="/auth/login">Volver al login</Link></Button></CardContent></Card></main>
}
