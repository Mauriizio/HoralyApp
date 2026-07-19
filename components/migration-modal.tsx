"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { loadDataResult } from "@/lib/storage"
import { migrateLocalStorageToSupabase, summarizeLocalData } from "@/lib/local-migration"
import type { ScheduleStore } from "@/hooks/use-schedule-store"

export function MigrationModal({ store }: { store: ScheduleStore }) {
  const { authenticated, user } = useAuth()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [migrating, setMigrating] = useState(false)
  const [summary, setSummary] = useState<ReturnType<typeof summarizeLocalData> | null>(null)

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (!authenticated || !user) return
      const local = loadDataResult()
      if (!local.ok) return
      const nextSummary = summarizeLocalData(local.data)
      const hasData = Object.values(nextSummary).some((count) => count > 0)
      if (!hasData) return
      const supabase = createSupabaseBrowserClient()
      if (!supabase) return
      const existing = await supabase.from("migration_status").select("completed_at").eq("user_id", user.id).eq("id", "localstorage-v1").maybeSingle()
      if (!cancelled && !existing.data?.completed_at) {
        setSummary(nextSummary)
        setOpen(true)
      }
    }
    void check()
    return () => { cancelled = true }
  }, [authenticated, user])

  async function migrate() {
    if (!user) return
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return
    setMigrating(true)
    setMessage("Migrando datos locales...")
    try {
      const result = await migrateLocalStorageToSupabase(supabase, user.id)
      setMessage(result.skipped ? "La migración ya estaba completada." : "Migración completada. Tus datos locales se conservaron como respaldo.")
      await store.retrySync()
      setOpen(false)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falló la migración. Puedes reintentar.")
    } finally {
      setMigrating(false)
    }
  }

  if (!summary) return null
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent>
      <DialogHeader><DialogTitle>Migrar datos locales</DialogTitle><DialogDescription>Encontramos datos guardados en este navegador. Puedes copiarlos a tu cuenta sin borrar localStorage.</DialogDescription></DialogHeader>
      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
        <div>Materias: {summary.materias}</div><div>Bloques: {summary.bloques}</div><div>Notas: {summary.notas}</div><div>Recordatorios: {summary.recordatorios}</div><div>Estudio: {summary.bloquesDeEstudio}</div>
      </div>
      {message && <p className="text-sm" role="status">{message}</p>}
      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={migrating}>Cancelar</Button>
        <Button variant="outline" onClick={() => setOpen(false)} disabled={migrating}>Continuar sin migrar</Button>
        <Button onClick={migrate} disabled={migrating}>{migrating ? "Migrando..." : "Migrar ahora"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
