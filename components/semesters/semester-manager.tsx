"use client"

import { useMemo, useState } from "react"
import { ArchiveRestore, CalendarPlus, Pencil, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ScheduleStore } from "@/hooks/use-schedule-store"
import type { Semester } from "@/lib/types"
import { canArchiveSemester, countSubjectsBySemester, validateSemesterDates } from "@/application/semesters"

const STATUS_LABEL: Record<Semester["status"], string> = { active: "Activo", planned: "Planificado", archived: "Archivado" }

export function SemesterManager({ store }: { store: ScheduleStore }) {
  const { allData } = store
  const [draft, setDraft] = useState({ name: "", startsOn: "", endsOn: "" })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ name: "", startsOn: "", endsOn: "" })
  const subjectCounts = useMemo(() => countSubjectsBySemester(allData), [allData])

  const create = () => {
    const name = draft.name.trim()
    const dateError = validateSemesterDates(draft.startsOn || undefined, draft.endsOn || undefined)
    if (!name) return toast.error("Escribe un nombre para el semestre.")
    if (dateError) return toast.error(dateError)
    store.createSemester({ name, startsOn: draft.startsOn || undefined, endsOn: draft.endsOn || undefined, status: allData.semesters.length === 0 ? "active" : "planned" })
    setDraft({ name: "", startsOn: "", endsOn: "" })
    toast.success("Semestre creado.")
  }

  const startEdit = (semester: Semester) => {
    setEditingId(semester.id)
    setEditDraft({ name: semester.name, startsOn: semester.startsOn ?? "", endsOn: semester.endsOn ?? "" })
  }

  const saveEdit = (semester: Semester) => {
    const name = editDraft.name.trim()
    const dateError = validateSemesterDates(editDraft.startsOn || undefined, editDraft.endsOn || undefined)
    if (!name) return toast.error("El nombre del semestre no puede quedar vacío.")
    if (dateError) return toast.error(dateError)
    store.updateSemester(semester.id, { name, startsOn: editDraft.startsOn || undefined, endsOn: editDraft.endsOn || undefined })
    setEditingId(null)
    toast.success("Semestre actualizado sin modificar sus datos académicos.")
  }

  const activate = (semester: Semester) => {
    store.selectActiveSemester(semester.id)
    toast.success(`Semestre activo: ${semester.name}`)
  }

  const archive = (semester: Semester) => {
    const allowed = canArchiveSemester(allData, semester.id)
    if (!allowed.ok) return toast.error(allowed.reason)
    store.archiveSemester(semester.id)
    toast.success("Semestre archivado. Su historial se conserva.")
  }

  const restore = (semester: Semester) => {
    store.updateSemester(semester.id, { status: "planned" })
    toast.success("Semestre restaurado y disponible para activar.")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><CalendarPlus className="h-4 w-4" />Semestres académicos</CardTitle>
        <CardDescription>Crea, activa, archiva o restaura semestres sin eliminar materias, notas, horarios ni historial.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_160px_160px_auto]">
          <div className="space-y-1"><Label htmlFor="new-semester-name">Nombre</Label><Input id="new-semester-name" value={draft.name} onChange={(e) => setDraft((value) => ({ ...value, name: e.target.value }))} placeholder="Ej: 2026 · Segundo semestre" /></div>
          <div className="space-y-1"><Label htmlFor="new-semester-start">Inicio</Label><Input id="new-semester-start" type="date" value={draft.startsOn} onChange={(e) => setDraft((value) => ({ ...value, startsOn: e.target.value }))} /></div>
          <div className="space-y-1"><Label htmlFor="new-semester-end">Término</Label><Input id="new-semester-end" type="date" value={draft.endsOn} onChange={(e) => setDraft((value) => ({ ...value, endsOn: e.target.value }))} /></div>
          <Button className="self-end" onClick={create}>Crear semestre</Button>
        </div>

        <div className="space-y-3">
          {allData.semesters.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay semestres. Crea uno para empezar.</p>}
          {allData.semesters.map((semester) => {
            const editing = editingId === semester.id
            return (
              <div key={semester.id} className="rounded-lg border p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    {editing ? (
                      <div className="grid gap-2 md:grid-cols-[1fr_150px_150px]">
                        <Input aria-label="Editar nombre del semestre" value={editDraft.name} onChange={(e) => setEditDraft((value) => ({ ...value, name: e.target.value }))} />
                        <Input aria-label="Editar inicio del semestre" type="date" value={editDraft.startsOn} onChange={(e) => setEditDraft((value) => ({ ...value, startsOn: e.target.value }))} />
                        <Input aria-label="Editar término del semestre" type="date" value={editDraft.endsOn} onChange={(e) => setEditDraft((value) => ({ ...value, endsOn: e.target.value }))} />
                      </div>
                    ) : (
                      <><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{semester.name}</h3><Badge variant={semester.status === "active" ? "default" : "secondary"}>{STATUS_LABEL[semester.status]}</Badge></div><p className="text-xs text-muted-foreground">{semester.startsOn ?? "Sin inicio"} → {semester.endsOn ?? "Sin término"} · {subjectCounts[semester.id] ?? 0} materia(s)</p></>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editing ? <><Button size="sm" onClick={() => saveEdit(semester)}>Guardar</Button><Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button></> : <Button size="sm" variant="outline" onClick={() => startEdit(semester)}><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button>}
                    {semester.status !== "active" && semester.status !== "archived" && <Button size="sm" onClick={() => activate(semester)}>Activar</Button>}
                    {semester.status === "archived" ? <Button size="sm" variant="outline" onClick={() => restore(semester)}><RotateCcw className="mr-1 h-3.5 w-3.5" />Restaurar</Button> : <Button size="sm" variant="outline" onClick={() => archive(semester)}><ArchiveRestore className="mr-1 h-3.5 w-3.5" />Archivar</Button>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
