"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, BookOpen, Plus, Save, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ScheduleStore } from "@/hooks/use-schedule-store"
import type { SubjectNote } from "@/lib/types"
import { getLucideIcon } from "@/lib/icons"

type SaveStatus = "idle" | "saving" | "saved" | "error"
type Draft = Pick<SubjectNote, "id" | "semesterId" | "subjectId" | "title" | "unit" | "content" | "createdAt" | "updatedAt">

const emptyDraft = (semesterId: string, subjectId: string): Draft => ({
  id: "",
  semesterId,
  subjectId,
  title: "",
  unit: "",
  content: "",
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

export function NotebookView({ store, onAddSubject }: { store: ScheduleStore; onAddSubject: () => void }) {
  const { data } = store
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<"updated" | "title">("updated")
  const [status, setStatus] = useState<SaveStatus>("idle")
  const [error, setError] = useState("")
  const saveSequence = useRef(0)

  const subjectNotes = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es")
    return data.subjectNotes
      .filter((note) => (!subjectId || note.subjectId === subjectId)
        && (!normalized || [note.title, note.unit ?? "", note.content].some((value) => value.toLocaleLowerCase("es").includes(normalized))))
      .sort((left, right) => sort === "title"
        ? left.title.localeCompare(right.title, "es")
        : right.updatedAt - left.updatedAt)
  }, [data.subjectNotes, query, sort, subjectId])

  const chooseNote = (note: SubjectNote) => {
    saveSequence.current += 1
    setSelectedId(note.id)
    setDraft(note)
    setStatus("idle")
    setError("")
  }

  const startNew = (nextSubjectId = subjectId) => {
    if (!nextSubjectId || !data.activeSemesterId) return
    saveSequence.current += 1
    setSubjectId(nextSubjectId)
    setSelectedId(null)
    setDraft(emptyDraft(data.activeSemesterId, nextSubjectId))
    setStatus("idle")
    setError("")
  }

  const save = async (candidate = draft) => {
    if (!candidate || !candidate.title.trim()) return
    const sequence = ++saveSequence.current
    setStatus("saving")
    setError("")
    try {
      const identityContext = store.dataOwnerUserId ? {
        expectedUserId: store.dataOwnerUserId,
        expectedAuthGeneration: store.authGeneration,
      } : undefined
      const saved = await store.saveSubjectNoteConfirmed(candidate, identityContext)
      if (sequence !== saveSequence.current) return
      setSelectedId(saved.id)
      setDraft(saved)
      setStatus("saved")
    } catch (saveError) {
      if (sequence !== saveSequence.current) return
      setStatus("error")
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el apunte.")
    }
  }

  useEffect(() => {
    if (!draft?.title.trim()) return
    const timeout = window.setTimeout(() => { void save(draft) }, 900)
    return () => window.clearTimeout(timeout)
    // save is intentionally driven by the current draft snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.title, draft?.unit, draft?.content])

  if (data.subjects.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <BookOpen className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold">Cuaderno de estudio</h1>
        <p className="mt-2 text-muted-foreground">No tienes materias disponibles.</p>
        <Button className="mt-5" onClick={onAddSubject}>Agregar materia</Button>
      </div>
    )
  }

  if (!subjectId) {
    return (
      <div data-tour="notebook-subjects" className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Cuaderno de estudio</h1>
          <p className="text-sm text-muted-foreground">Organiza apuntes independientes para cada materia.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.subjects.map((subject) => {
            const SubjectIcon = getLucideIcon(subject.icon)
            const notes = data.subjectNotes.filter((note) => note.subjectId === subject.id)
            const latest = notes.sort((a, b) => b.updatedAt - a.updatedAt)[0]
            return (
              <Card key={subject.id} style={{ borderTopColor: subject.color, borderTopWidth: 4 }}>
                <CardHeader><CardTitle className="flex items-center gap-2 text-lg">{SubjectIcon ? <SubjectIcon className="size-5" style={{ color: subject.color }} aria-hidden /> : <BookOpen className="size-5" style={{ color: subject.color }} aria-hidden />}<span>{subject.name}</span></CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{notes.length} {notes.length === 1 ? "apunte" : "apuntes"}</p>
                  <p className="text-xs text-muted-foreground">{latest ? `Actualizado ${new Date(latest.updatedAt).toLocaleDateString("es-CL")}` : "Sin apuntes todavía"}</p>
                  <Button className="w-full" onClick={() => setSubjectId(subject.id)}>Abrir cuaderno</Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  const subject = data.subjects.find((item) => item.id === subjectId)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => { setSubjectId(null); setDraft(null); setSelectedId(null) }}><ArrowLeft className="mr-2 size-4" />Materias</Button>
        <div className="min-w-0 flex-1"><h1 className="truncate text-xl font-semibold">Cuaderno de {subject?.name}</h1></div>
        <Button data-tour="notebook-new" onClick={() => startNew()}><Plus className="mr-2 size-4" />Nueva nota</Button>
      </div>
      <div className="flex flex-wrap gap-2" data-tour="notebook-search">
        <div className="relative min-w-52 flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título, unidad o contenido" /></div>
        <select className="min-h-10 rounded-md border bg-background px-3 text-sm" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="Ordenar apuntes">
          <option value="updated">Última edición</option><option value="title">Título</option>
        </select>
      </div>
      <div className="grid min-h-[60vh] gap-4 md:grid-cols-[18rem_1fr]">
        <aside className={`${draft ? "hidden md:block" : "block"} space-y-2 rounded-xl border p-2`} aria-label="Apuntes">
          {subjectNotes.map((note) => <button key={note.id} onClick={() => chooseNote(note)} className={`w-full rounded-lg p-3 text-left ${selectedId === note.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}><span className="block truncate font-medium">{note.title}</span><span className="block truncate text-xs text-muted-foreground">{note.unit || "Sin unidad"} · {new Date(note.updatedAt).toLocaleDateString("es-CL")}</span></button>)}
          {subjectNotes.length === 0 && <p className="p-4 text-sm text-muted-foreground">No hay apuntes que coincidan.</p>}
        </aside>
        {draft ? (
          <main data-tour="notebook-editor" className="space-y-3 rounded-xl border bg-card p-4">
            <Button className="md:hidden" variant="ghost" size="sm" onClick={() => setDraft(null)}><ArrowLeft className="mr-2 size-4" />Volver a la lista</Button>
            <Input aria-label="Título" placeholder="Título" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            <Input aria-label="Unidad o tema" placeholder="Unidad o tema (opcional)" value={draft.unit ?? ""} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} />
            <Textarea aria-label="Contenido" className="min-h-[42vh] whitespace-pre-wrap" placeholder="Escribe o pega aquí tus apuntes…" value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} />
            <div className="sticky bottom-16 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-background/95 p-2 backdrop-blur md:bottom-2">
              <p role="status" className={`text-sm ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>{status === "saving" ? "Guardando…" : status === "saved" ? "Guardado" : status === "error" ? `Error al guardar: ${error}` : "Los cambios se guardan automáticamente"}</p>
              <div className="flex gap-2">
                {selectedId && <Button variant="destructive" size="sm" onClick={async () => { const context = store.dataOwnerUserId ? { expectedUserId: store.dataOwnerUserId, expectedAuthGeneration: store.authGeneration } : undefined; await store.deleteSubjectNoteConfirmed(selectedId, context); setDraft(null); setSelectedId(null) }}><Trash2 className="mr-2 size-4" />Eliminar</Button>}
                <Button size="sm" disabled={!draft.title.trim() || status === "saving"} onClick={() => void save()}><Save className="mr-2 size-4" />Guardar</Button>
              </div>
            </div>
          </main>
        ) : <div className="hidden place-items-center rounded-xl border text-muted-foreground md:grid">Selecciona un apunte o crea uno nuevo.</div>}
      </div>
    </div>
  )
}
