"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { loadDataResult } from "@/lib/storage"
import {
  loadMigrationBackup,
  loadMigrationDecision,
  saveMigrationBackup,
  saveMigrationDecision,
} from "@/lib/local-cloud-storage"
import {
  migrateLocalStorageToSupabase,
  readMigrationCompleted,
  summarizeLocalData,
} from "@/lib/local-migration"
import type { AppData } from "@/lib/types"
import type { ScheduleStore } from "@/hooks/use-schedule-store"

export function MigrationModal({ store }: { store: ScheduleStore }) {
  const { authenticated, user } = useAuth()
  const userId = user?.id ?? null
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [migrating, setMigrating] = useState(false)
  const [checking, setChecking] = useState(false)
  const [pendingSnapshot, setPendingSnapshot] = useState<AppData | null>(null)
  const [summary, setSummary] = useState<ReturnType<typeof summarizeLocalData> | null>(null)

  const checkMigration = useCallback(async (manual = false) => {
    if (!authenticated || !userId) return
    if (!manual && loadMigrationDecision(userId)) return

    setChecking(true)
    setMessage("")
    try {
      const backup = loadMigrationBackup(userId)
      const local = backup ? { ok: true as const, data: backup.data } : loadDataResult()
      if (!local.ok) {
        if (manual) {
          setSummary(null)
          setMessage("Los datos locales necesitan recuperación antes de poder migrarlos. Revisa Preferencias > Recuperación de datos locales.")
          setOpen(true)
        }
        return
      }

      const snapshot = store.migrationSnapshot ?? backup?.data ?? local.data
      if (!backup) saveMigrationBackup(userId, snapshot)
      setPendingSnapshot(snapshot)

      const nextSummary = summarizeLocalData(snapshot)
      const hasData = Object.values(nextSummary).some((count) => count > 0)
      setSummary(nextSummary)

      if (!hasData) {
        if (manual) {
          setMessage("No encontramos datos locales pendientes en este dispositivo.")
          setOpen(true)
        }
        return
      }

      const supabase = createSupabaseBrowserClient()
      if (!supabase) {
        if (manual) {
          setMessage("La nube no está configurada en esta instalación.")
          setOpen(true)
        }
        return
      }

      const completed = await readMigrationCompleted(supabase, userId)
      if (completed) {
        saveMigrationDecision(userId, "completed")
        if (manual) {
          setMessage("Esta cuenta ya tiene registrada la migración local. Puedes actualizar desde la nube en Preferencias.")
          setOpen(true)
        }
        return
      }

      setOpen(true)
    } catch (error) {
      const detail = error instanceof Error ? error.message : "No se pudo comprobar el estado de migración."
      if (manual) {
        setMessage(detail)
        setOpen(true)
      } else {
        console.warn("[Horaly] No se abrió la migración automática:", error)
      }
    } finally {
      setChecking(false)
    }
  }, [authenticated, store.migrationSnapshot, userId])

  useEffect(() => {
    void checkMigration(false)
  }, [checkMigration])

  useEffect(() => {
    const openMigration = () => { void checkMigration(true) }
    window.addEventListener("horarily:open-migration", openMigration)
    return () => window.removeEventListener("horarily:open-migration", openMigration)
  }, [checkMigration])

  async function migrate() {
    if (!userId) return
    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      setMessage("La nube no está configurada en esta instalación.")
      return
    }

    setMigrating(true)
    setMessage("Migrando datos locales...")
    try {
      const snapshot = pendingSnapshot ?? store.migrationSnapshot ?? loadMigrationBackup(userId)?.data
      if (!snapshot) throw new Error("No hay snapshot local disponible para migrar.")

      const result = await migrateLocalStorageToSupabase(supabase, userId, snapshot)
      saveMigrationDecision(userId, "completed")
      setMessage(result.skipped ? "La migración ya estaba completada. Actualizando tus datos…" : "Migración completada. Actualizando tu cuenta…")

      await store.refreshFromCloud()
      setMessage(result.skipped ? "Tu cuenta ya estaba migrada y quedó actualizada." : "Migración completada y verificada en la nube.")
      setOpen(false)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falló la migración. Tus datos locales siguen intactos.")
    } finally {
      setMigrating(false)
    }
  }

  const continueWithoutMigrating = () => {
    if (userId) saveMigrationDecision(userId, "deferred")
    setOpen(false)
  }

  if (!summary && !message) return null
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!migrating) setOpen(next) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Migrar datos locales</DialogTitle>
          <DialogDescription>
            Encontramos datos guardados en este dispositivo. Puedes copiarlos a tu cuenta sin borrar el respaldo local.
          </DialogDescription>
        </DialogHeader>

        {summary && (
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div>Semestres: {summary.semestres}</div>
            <div>Materias: {summary.materias}</div>
            <div>Horario: {summary.bloques}</div>
            <div>Notas: {summary.notas}</div>
            <div>Apuntes: {summary.apuntes}</div>
            <div>Recordatorios: {summary.recordatorios}</div>
          </div>
        )}

        {message && <p className="text-sm" role="status">{message}</p>}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={migrating || checking}>Cancelar</Button>
          <Button variant="outline" onClick={continueWithoutMigrating} disabled={migrating || checking}>Continuar sin migrar</Button>
          <Button onClick={() => void migrate()} disabled={migrating || checking || !pendingSnapshot}>
            {migrating ? "Migrando..." : checking ? "Comprobando..." : "Migrar ahora"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
