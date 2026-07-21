import Link from "next/link"
import { LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"

export function GuestAuthActions({ loading, authenticated }: { loading: boolean; authenticated: boolean }) {
  if (loading) return <div className="h-9 w-28 rounded-md bg-muted animate-pulse" aria-label="Cargando sesión" />
  if (authenticated) return null
  return (
    <nav aria-label="Acciones públicas de autenticación" className="flex items-center gap-2 shrink-0">
      <Button variant="outline" size="sm" asChild>
        <Link href="/auth/login"><LogIn className="h-3.5 w-3.5 mr-1.5" aria-hidden />Iniciar sesión</Link>
      </Button>
      <Button size="sm" asChild><Link href="/auth/register">Crear cuenta</Link></Button>
    </nav>
  )
}
