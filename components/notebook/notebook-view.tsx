"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Bold, BookOpen, FileDown, FileText, ImagePlus, Italic, List, ListOrdered, Paperclip, Pencil, Plus, Save, Search, Share2, Trash2, Underline } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { ScheduleStore } from "@/hooks/use-schedule-store"
import type { NoteBlock, NoteTextMark, NoteTextRun, SubjectNote, SubjectNoteAttachment } from "@/lib/types"
import { getLucideIcon } from "@/lib/icons"
import { InlineDrawingBlock } from "./inline-drawing-block"
import { documentPlainText, legacyTextToDocument, noteDocument } from "@/domain/notebook/document"
import { applyBlockType, applyFont, insertAttachmentBlock, referencedAttachmentIds, removeAttachmentBlock, toggleMark, type ActiveTextStyle, type TextSelection } from "@/domain/notebook/editor"
import { StructuredNoteEditor } from "./structured-note-editor"
import { completeDrawingDraft, drawingDraftInsertion, type DrawingDraft } from "@/domain/notebook/drawing-draft"
import { validateNoteFile } from "@/domain/notebook/attachments"
import { notebookBlobRepository } from "@/lib/notebook-blob-repository"
import { renderNotebookPdf, shareNotebookPdf } from "@/domain/notebook/pdf"
import { useAuth } from "@/lib/auth-context"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { deleteCloudNoteAttachment, NOTE_FILES_BUCKET, uploadCloudNoteAttachment } from "@/lib/note-attachment-storage"

type SaveStatus = "idle" | "saving" | "saved" | "error"
type Draft = Pick<SubjectNote, "id" | "semesterId" | "subjectId" | "title" | "unit" | "content" | "document" | "createdAt" | "updatedAt">

const emptyDraft = (semesterId: string, subjectId: string): Draft => ({
  id: "",
  semesterId,
  subjectId,
  title: "",
  unit: "",
  content: "",
  document: legacyTextToDocument("draft", ""),
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

function AttachmentBlockView({ block, attachment, loadBlob, onOpen, onRemove }: { block: Extract<NoteBlock, { attachmentId: string }>; attachment?: SubjectNoteAttachment; loadBlob: (item: SubjectNoteAttachment) => Promise<Blob | undefined>; onOpen: (item: SubjectNoteAttachment, download?: boolean) => void; onRemove: (item: SubjectNoteAttachment) => void }) {
  const [url, setUrl] = useState("")
  useEffect(() => {
    if (!attachment || block.type === "attachmentReference") return
    let current = true, objectUrl = ""
    void loadBlob(attachment).then((blob) => { if (current && blob) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl) } })
    return () => { current = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [attachment, block.type, loadBlob])
  if (!attachment) return <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">Archivo no disponible.</div>
  if (block.type === "image" || block.type === "drawing") return <figure className="rounded-lg border p-2"><img src={url} alt={block.alt} className="max-h-[28rem] w-auto max-w-full rounded object-contain" /><figcaption className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{attachment.filename}</span><Button variant="ghost" size="sm" onClick={() => onRemove(attachment)}>Quitar</Button></figcaption></figure>
  return <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><span className="flex items-center gap-2"><FileText className="size-4" />{attachment.filename} · {(attachment.sizeBytes / 1024 / 1024).toFixed(1)} MB</span><span className="flex gap-1"><Button variant="outline" size="sm" onClick={() => onOpen(attachment)}>Abrir</Button><Button variant="outline" size="sm" onClick={() => onOpen(attachment, true)}>Descargar</Button><Button variant="ghost" size="sm" onClick={() => onRemove(attachment)}>Quitar</Button></span></div>
}

export function NotebookView({ store, onAddSubject }: { store: ScheduleStore; onAddSubject: () => void }) {
  const { data } = store
  const auth = useAuth()
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<"updated" | "title">("updated")
  const [status, setStatus] = useState<SaveStatus>("idle")
  const [error, setError] = useState("")
  const saveSequence = useRef(0)
  const [drawingDraft, setDrawingDraft] = useState<DrawingDraft | null>(null)
  const [selection, setSelection] = useState<TextSelection | null>(null)
  const [activeStyle, setActiveStyle] = useState<ActiveTextStyle>({})
  const [mediaStatus, setMediaStatus] = useState("")

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
    setDraft({ ...note, document: noteDocument(note) })
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
      const document = candidate.document ?? legacyTextToDocument(candidate.id || "draft", candidate.content)
      const saved = await store.saveSubjectNoteConfirmed({ ...candidate, document, content: documentPlainText(document) }, identityContext)
      if (sequence !== saveSequence.current) return
      setSelectedId(saved.id)
      setDraft(saved)
      setStatus("saved")
      return saved
    } catch (saveError) {
      if (sequence !== saveSequence.current) return
      setStatus("error")
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el apunte.")
    }
  }

  const changeDocument = (document: NonNullable<Draft["document"]>) => setDraft((current) => current ? { ...current, document, content: documentPlainText(document) } : current)
  const formatDocument = (kind: NoteTextMark | "heading" | "bulletList" | "numberedList") => {
    if (!draft?.document || !selection) return
    if (kind === "bold" || kind === "italic" || kind === "underline") {
      if (selection.start === selection.end) {
        const marks = new Set(activeStyle.marks ?? []); if (marks.has(kind)) marks.delete(kind); else marks.add(kind)
        setActiveStyle({ ...activeStyle, marks: [...marks] }); return
      }
      changeDocument(toggleMark(draft.document, selection, kind)); return
    }
    changeDocument(applyBlockType(draft.document, selection, kind))
  }
  const changeFont = (font: NonNullable<NoteTextRun["font"]>) => {
    if (!draft?.document || !selection) return
    if (selection.start === selection.end) setActiveStyle({ ...activeStyle, font })
    else changeDocument(applyFont(draft.document, selection, font))
  }

  const persistFile = async (source: File | Blob, forcedKind?: "drawing") => {
    if (!draft) return
    setMediaStatus(forcedKind ? "Guardando dibujo…" : "Subiendo…")
    const saved = draft.id ? draft : await save(draft); if (!saved) return
    const file = source instanceof File ? source : new File([source], "dibujo.png", { type: "image/png" }); const issue = validateNoteFile(file)
    if (issue) { setError(issue); setStatus("error"); return }
    let attachment
    if (auth.authenticated) {
      const expectedUserId = store.dataOwnerUserId; const client = createSupabaseBrowserClient()
      if (!expectedUserId || !client || expectedUserId !== store.repositoryOwnerUserId || !store.identityReady) throw new Error("No se pudo verificar la identidad para subir el archivo.")
      attachment = await uploadCloudNoteAttachment({ client, file, expectedUserId, semesterId: saved.semesterId, subjectId: saved.subjectId, noteId: saved.id, kind: forcedKind, verifyCurrentUser: async () => (await auth.verifyCurrentUser()).id })
    } else {
      const id = crypto.randomUUID(); const storagePath = `guest/${saved.semesterId}/${saved.subjectId}/${saved.id}/${id}`
      await notebookBlobRepository.put(storagePath, file)
      attachment = { id, semesterId: saved.semesterId, subjectId: saved.subjectId, noteId: saved.id, kind: forcedKind ?? (file.type === "application/pdf" ? "pdf" as const : "image" as const), filename: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "application/pdf", sizeBytes: file.size, storagePath, createdAt: Date.now() }
    }
    store.commitSubjectNoteAttachment(attachment)
    return { saved, attachment }
  }

  const addGuestFile = async (source: File | Blob) => {
    const persisted = await persistFile(source); if (!persisted) return
    const { saved, attachment } = persisted
    setMediaStatus("Insertando…")
    const baseDocument = saved.document ?? legacyTextToDocument(saved.id, saved.content)
    const document = insertAttachmentBlock(baseDocument, selection, attachment)
    const updated = await save({ ...saved, document, content: documentPlainText(document) })
    if (!updated) throw new Error("No se pudo insertar el archivo en la nota.")
    setDraft(updated); setSelectedId(saved.id); setSelection({ blockId: `${attachment.id}-block`, start: 0, end: 0 }); setMediaStatus("Guardado")
    return attachment
  }

  const startDrawing = () => {
    if (!draft?.document || drawingDraft) return
    setDrawingDraft(drawingDraftInsertion(draft.document, selection))
  }
  const completeDrawing = async (blob: Blob) => {
    if (!draft?.document || !drawingDraft) throw new Error("El bloque de dibujo ya no está disponible.")
    const activeDraft = drawingDraft, activeDocument = draft.document
    const persisted = await persistFile(blob, "drawing")
    if (!persisted) throw new Error("No se pudo guardar el archivo del dibujo.")
    const document = completeDrawingDraft(activeDocument, activeDraft, persisted.attachment)
    const updated = await save({ ...persisted.saved, document, content: documentPlainText(document) })
    if (!updated || !updated.document?.blocks.some((block) => block.id === activeDraft.id && block.type === "drawing" && block.attachmentId === persisted.attachment.id)) throw new Error("No se pudo confirmar el dibujo en el apunte.")
    setDraft(updated); setDrawingDraft(null); setSelection({ blockId: activeDraft.id, start: 0, end: 0 }); setMediaStatus("Dibujo guardado")
  }

  const attachmentBlob = async (item: (typeof data.subjectNoteAttachments)[number]) => {
    if (!item.storagePath) throw new Error("El archivo no está disponible.")
    if (!auth.authenticated) return notebookBlobRepository.get(item.storagePath)
    const client = createSupabaseBrowserClient(); const expectedUserId = store.dataOwnerUserId
    if (!client || !expectedUserId || !item.storagePath.startsWith(`${expectedUserId}/`) || (await auth.verifyCurrentUser()).id !== expectedUserId) throw new Error("No se pudo verificar el propietario del archivo.")
    const { data: result, error } = await client.storage.from(NOTE_FILES_BUCKET).download(item.storagePath); if (error) throw error
    if ((await auth.verifyCurrentUser()).id !== expectedUserId) throw new Error("La sesión cambió durante la descarga.")
    return result
  }
  const openAttachment = async (item: (typeof data.subjectNoteAttachments)[number], download = false) => { const blob = await attachmentBlob(item); if (!blob) return; const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; if (download) anchor.download = item.filename; else { anchor.target = "_blank"; anchor.rel = "noopener noreferrer" } anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000) }
  const removeAttachment = async (item: (typeof data.subjectNoteAttachments)[number]) => {
    if (draft?.document && referencedAttachmentIds(draft.document).has(item.id)) {
      const document = removeAttachmentBlock(draft.document, item.id)
      await save({ ...draft, document, content: documentPlainText(document) })
    }
    if (auth.authenticated) { const client = createSupabaseBrowserClient(); const expectedUserId = store.dataOwnerUserId; if (!client || !expectedUserId) throw new Error("No se pudo verificar la identidad."); await deleteCloudNoteAttachment(client, item, expectedUserId, async () => (await auth.verifyCurrentUser()).id) }
    else if (item.storagePath) await notebookBlobRepository.remove(item.storagePath)
    store.forgetSubjectNoteAttachment(item.id)
  }
  const removeCurrentNote = async () => {
    if (!selectedId) return
    for (const attachment of data.subjectNoteAttachments.filter((item) => item.noteId === selectedId)) await removeAttachment(attachment)
    const context = store.dataOwnerUserId ? { expectedUserId: store.dataOwnerUserId, expectedAuthGeneration: store.authGeneration } : undefined
    await store.deleteSubjectNoteConfirmed(selectedId, context); setDraft(null); setSelectedId(null)
  }

  const exportPdf = async (all: boolean, share: boolean) => {
    const subject = data.subjects.find((item) => item.id === subjectId); if (!subject) return
    const notes = all ? data.subjectNotes.filter((note) => note.subjectId === subject.id) : draft ? [{ ...draft, document: draft.document ?? legacyTextToDocument(draft.id || "draft", draft.content) }] : []
    const relevantAttachments = data.subjectNoteAttachments.filter((item) => notes.some((note) => note.id === item.noteId)); const assets = new Map<string, Blob>()
    for (const item of relevantAttachments.filter((attachment) => attachment.kind !== "pdf")) { const blob = await attachmentBlob(item); if (blob) assets.set(item.id, blob) }
    const pdf = await renderNotebookPdf({ subject, notes, attachments: relevantAttachments, assets })
    if (share) { if (await shareNotebookPdf({ ...pdf, subjectName: subject.name }) === "download") setError("El PDF se descargó. Adjunta el archivo en la aplicación que prefieras."); return }
    const url = URL.createObjectURL(new Blob([pdf.bytes], { type: "application/pdf" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = pdf.filename; anchor.click(); URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (!draft?.title.trim()) return
    const timeout = window.setTimeout(() => { void save(draft) }, 900)
    return () => window.clearTimeout(timeout)
    // save is intentionally driven by the current draft snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.title, draft?.unit, draft?.content, draft?.document])

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
        <Button variant="outline" onClick={() => void exportPdf(true, false)}><FileDown className="mr-2 size-4" />Exportar cuaderno PDF</Button><Button data-tour="notebook-new" onClick={() => startNew()}><Plus className="mr-2 size-4" />Nueva nota</Button>
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
            <div className="sticky top-0 z-10 flex max-w-full gap-1 overflow-x-auto rounded-lg border bg-background p-2" aria-label="Formato del apunte">
              {([ ["bold", "Negrita", Bold], ["italic", "Cursiva", Italic], ["underline", "Subrayado", Underline] ] as const).map(([mark, label, Icon]) => <Button key={mark} size="icon" variant={activeStyle.marks?.includes(mark) ? "secondary" : "ghost"} aria-label={label} aria-pressed={activeStyle.marks?.includes(mark)} onMouseDown={(event) => event.preventDefault()} onClick={() => formatDocument(mark)}><Icon className="size-4" /></Button>)}
              <Button variant="ghost" onMouseDown={(event) => event.preventDefault()} onClick={() => formatDocument("heading")}>Título</Button>
              <Button size="icon" variant="ghost" aria-label="Lista" onMouseDown={(event) => event.preventDefault()} onClick={() => formatDocument("bulletList")}><List className="size-4" /></Button>
              <Button size="icon" variant="ghost" aria-label="Lista numerada" onMouseDown={(event) => event.preventDefault()} onClick={() => formatDocument("numberedList")}><ListOrdered className="size-4" /></Button>
              <select aria-label="Fuente" value={activeStyle.font ?? "sans"} onChange={(event) => changeFont(event.target.value as NonNullable<NoteTextRun["font"]>)} className="rounded border bg-background px-2 text-sm"><option value="sans">Sans</option><option value="serif">Serif</option><option value="mono">Mono</option><option value="rounded">Rounded</option><option value="clean">Clean</option></select>
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded px-3 text-sm"><ImagePlus className="size-4" />Foto<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; if (file) void addGuestFile(file).catch((reason) => { setError(reason instanceof Error ? reason.message : "No se pudo insertar la imagen."); setStatus("error"); setMediaStatus("Error al insertar") }) }} /></label>
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded px-3 text-sm"><Paperclip className="size-4" />PDF<input className="sr-only" type="file" accept="application/pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) void addGuestFile(file).catch((reason) => { setError(reason instanceof Error ? reason.message : "No se pudo insertar el PDF."); setStatus("error"); setMediaStatus("Error al insertar") }) }} /></label>
              <Button variant="ghost" disabled={Boolean(drawingDraft)} onClick={startDrawing}><Pencil className="mr-2 size-4" />Dibujar</Button>
            </div>
            <StructuredNoteEditor document={draft.document ?? legacyTextToDocument(draft.id || "draft", draft.content)} activeStyle={activeStyle} onChange={changeDocument} onSelection={setSelection} renderMedia={(block) => <AttachmentBlockView block={block} attachment={data.subjectNoteAttachments.find((item) => item.id === block.attachmentId)} loadBlob={attachmentBlob} onOpen={openAttachment} onRemove={(item) => void removeAttachment(item)} />} drawingDraft={drawingDraft} renderDrawingDraft={(drawing) => <InlineDrawingBlock blockId={drawing.id} onComplete={completeDrawing} onCancel={() => setDrawingDraft(null)} />} />
            {(() => { const document = draft.document ?? legacyTextToDocument(draft.id || "draft", draft.content); const referenced = referencedAttachmentIds(document); const orphans = data.subjectNoteAttachments.filter((item) => item.noteId === draft.id && !referenced.has(item.id)); return orphans.length ? <section className="space-y-2 rounded-lg border border-dashed p-3"><h3 className="font-medium">Archivos sin insertar</h3>{orphans.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{item.filename}</span><span className="flex gap-1"><Button size="sm" onClick={() => { const next = insertAttachmentBlock(document, selection, item); void save({ ...draft, document: next, content: documentPlainText(next) }) }}>Insertar en nota</Button><Button variant="outline" size="sm" onClick={() => void openAttachment(item, true)}>Descargar</Button><Button variant="ghost" size="sm" onClick={() => void removeAttachment(item)}>Eliminar</Button></span></div>)}</section> : null })()}
            {mediaStatus ? <p role="status" className="text-sm text-muted-foreground">{mediaStatus}</p> : null}
            <div className="sticky bottom-16 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-background/95 p-2 backdrop-blur md:bottom-2">
              <p role="status" className={`text-sm ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>{status === "saving" ? "Guardando…" : status === "saved" ? "Guardado" : status === "error" ? `Error al guardar: ${error}` : "Los cambios se guardan automáticamente"}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => void exportPdf(false, false)}><FileDown className="mr-2 size-4" />Exportar PDF</Button><Button variant="outline" size="sm" onClick={() => void exportPdf(false, true)}><Share2 className="mr-2 size-4" />Compartir</Button>
                {selectedId && <Button variant="destructive" size="sm" onClick={() => { if (window.confirm("Esta nota y sus archivos adjuntos se eliminarán.")) void removeCurrentNote() }}><Trash2 className="mr-2 size-4" />Eliminar</Button>}
                <Button size="sm" disabled={!draft.title.trim() || status === "saving"} onClick={() => void save()}><Save className="mr-2 size-4" />Guardar</Button>
              </div>
            </div>
          </main>
        ) : <div className="hidden place-items-center rounded-xl border text-muted-foreground md:grid">Selecciona un apunte o crea uno nuevo.</div>}
      </div>
    </div>
  )
}
