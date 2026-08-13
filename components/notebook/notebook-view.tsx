"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, BookOpen, Download, FileDown, FileText, Info, Plus, Save, Search, Share2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { NotebookLiteEditor, type NotebookLiteEditorHandle } from "./notebook-lite-editor"
import type { ScheduleStore } from "@/hooks/use-schedule-store"
import type { NoteDocumentV1, SubjectNote, SubjectNoteAttachment } from "@/lib/types"
import { getLucideIcon } from "@/lib/icons"
import { documentPlainText, legacyTextToDocument, localImageAssetIds, noteDocument, toLiteDocument } from "@/domain/notebook/document"
import { processLocalImage } from "@/domain/notebook/local-images"
import { notebookBlobRepository } from "@/lib/notebook-blob-repository"
import { renderNotebookPdf, shareNotebookPdf } from "@/domain/notebook/pdf"
import { useAuth } from "@/lib/auth-context"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { deleteCloudNoteAttachment, NOTE_FILES_BUCKET } from "@/lib/note-attachment-storage"

type SaveStatus = "idle" | "saving" | "saved" | "error"
type Draft = Pick<SubjectNote, "id" | "semesterId" | "subjectId" | "title" | "unit" | "content" | "document" | "createdAt" | "updatedAt">

const emptyDraft = (semesterId: string, subjectId: string): Draft => { const id = crypto.randomUUID(); return { id, semesterId, subjectId, title: "", unit: "", content: "", document: legacyTextToDocument(id, ""), createdAt: Date.now(), updatedAt: Date.now() } }

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
  const [mediaStatus, setMediaStatus] = useState("")
  const editorRef = useRef<NotebookLiteEditorHandle>(null)
  const revision = useRef(0)
  const pendingDeletedAssets = useRef(new Set<string>())

  const subjectNotes = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es")
    return data.subjectNotes.filter((note) => (!subjectId || note.subjectId === subjectId) && (!normalized || [note.title, note.unit ?? "", note.content].some((value) => value.toLocaleLowerCase("es").includes(normalized))))
      .sort((left, right) => sort === "title" ? left.title.localeCompare(right.title, "es") : right.updatedAt - left.updatedAt)
  }, [data.subjectNotes, query, sort, subjectId])

  const updateDraft = useCallback((transform: (current: Draft) => Draft) => {
    revision.current += 1
    setDraft((current) => current ? transform(current) : current)
  }, [])

  const chooseNote = (note: SubjectNote) => {
    revision.current += 1; setSelectedId(note.id); setDraft({ ...note, document: toLiteDocument(noteDocument(note), note.content) }); setStatus("idle"); setError("")
  }
  const startNew = (nextSubjectId = subjectId) => {
    if (!nextSubjectId || !data.activeSemesterId) return
    revision.current += 1; setSubjectId(nextSubjectId); setSelectedId(null); setDraft(emptyDraft(data.activeSemesterId, nextSubjectId)); setStatus("idle"); setError("")
  }

  const save = useCallback(async (candidate: Draft, applyResult = true) => {
    if (!candidate.title.trim()) return undefined
    const startedRevision = revision.current
    setStatus("saving"); setError("")
    try {
      const identityContext = store.dataOwnerUserId ? { expectedUserId: store.dataOwnerUserId, expectedAuthGeneration: store.authGeneration } : undefined
      const document = candidate.document ?? legacyTextToDocument(candidate.id || "draft", candidate.content)
      const saved = await store.saveSubjectNoteConfirmed({ ...candidate, document, content: documentPlainText(document) }, identityContext)
      if (applyResult && startedRevision === revision.current) { setSelectedId(saved.id); setDraft(saved) }
      setStatus("saved")
      for (const assetId of pendingDeletedAssets.current) { await notebookBlobRepository.remove(assetId); pendingDeletedAssets.current.delete(assetId) }
      return saved
    } catch (reason) { setStatus("error"); setError(reason instanceof Error ? reason.message : "No se pudo guardar el apunte."); return undefined }
  }, [store])

  const changeDocument = useCallback((document: NoteDocumentV1) => updateDraft((current) => ({ ...current, document, content: documentPlainText(document) })), [updateDraft])
  const removeLocalImage = useCallback((assetId: string) => { pendingDeletedAssets.current.add(assetId); setMediaStatus("Foto eliminada") }, [])

  const addPhoto = useCallback(async (file: File) => {
    if (!draft) return
    setMediaStatus("Procesando foto…"); setError("")
    let assetId = ""
    try {
      const exists = data.subjectNotes.some((note) => note.id === draft.id)
      const base = exists ? draft : await save({ ...draft, title: draft.title.trim() || "Apunte sin título" })
      if (!base) throw new Error("No se pudo crear el apunte antes de agregar la foto.")
      const processed = await processLocalImage(file)
      assetId = `lite/${base.semesterId}/${base.subjectId}/${base.id}/${crypto.randomUUID()}`
      setMediaStatus("Guardando foto…"); await notebookBlobRepository.put(assetId, processed.blob)
      const inserted = editorRef.current?.insertLocalImage({ localAssetId: assetId, alt: "Foto del apunte", width: processed.width, height: processed.height })
      if (!inserted) throw new Error("No se pudo insertar la foto en el apunte.")
      setMediaStatus("Foto insertada")
    } catch (reason) {
      if (assetId) await notebookBlobRepository.remove(assetId).catch(() => undefined)
      setMediaStatus(""); setStatus("error"); setError(reason instanceof Error ? reason.message : "No se pudo agregar la foto.")
    }
  }, [data.subjectNotes, draft, save])

  const attachmentBlob = useCallback(async (item: SubjectNoteAttachment) => {
    if (!auth.authenticated) return item.storagePath ? notebookBlobRepository.get(item.storagePath) : undefined
    const expectedUserId = store.dataOwnerUserId, client = createSupabaseBrowserClient()
    if (!client || !expectedUserId || !store.identityReady || expectedUserId !== store.repositoryOwnerUserId) throw new Error("No se pudo verificar la identidad.")
    if ((await auth.verifyCurrentUser()).id !== expectedUserId) throw new Error("La sesión cambió durante la descarga.")
    if (!item.storagePath) return undefined
    const { data: result, error: downloadError } = await client.storage.from(NOTE_FILES_BUCKET).download(item.storagePath)
    if (downloadError) throw downloadError
    if ((await auth.verifyCurrentUser()).id !== expectedUserId) throw new Error("La sesión cambió durante la descarga.")
    return result
  }, [auth, store.dataOwnerUserId, store.identityReady, store.repositoryOwnerUserId])
  const downloadLegacy = async (item: SubjectNoteAttachment) => { const blob = await attachmentBlob(item); if (!blob) return; const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = item.filename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000) }

  const removeCurrentNote = async () => {
    if (!selectedId || !draft) return
    const assets = localImageAssetIds(draft.document ?? noteDocument(draft))
    const context = store.dataOwnerUserId ? { expectedUserId: store.dataOwnerUserId, expectedAuthGeneration: store.authGeneration } : undefined
    const legacy = data.subjectNoteAttachments.filter((item) => item.noteId === selectedId)
    for (const attachment of legacy) {
      if (auth.authenticated) {
        const client = createSupabaseBrowserClient(), expectedUserId = store.dataOwnerUserId
        if (!client || !expectedUserId) throw new Error("No se pudo verificar la identidad.")
        await deleteCloudNoteAttachment(client, attachment, expectedUserId, async () => (await auth.verifyCurrentUser()).id)
      } else if (attachment.storagePath) await notebookBlobRepository.remove(attachment.storagePath)
      store.forgetSubjectNoteAttachment(attachment.id)
    }
    await store.deleteSubjectNoteConfirmed(selectedId, context)
    await Promise.allSettled(assets.map((id) => notebookBlobRepository.remove(id)))
    setDraft(null); setSelectedId(null)
  }

  const exportPdf = async (all: boolean, share: boolean) => {
    const subject = data.subjects.find((item) => item.id === subjectId); if (!subject) return
    const notes = all ? data.subjectNotes.filter((note) => note.subjectId === subject.id).map((note) => ({ ...note, document: toLiteDocument(noteDocument(note), note.content) })) : draft ? [{ ...draft, document: draft.document ?? legacyTextToDocument(draft.id || "draft", draft.content) }] : []
    const relevantAttachments = data.subjectNoteAttachments.filter((item) => notes.some((note) => note.id === item.noteId))
    const assets = new Map<string, Blob>(), assetIds = notes.flatMap((note) => localImageAssetIds(note.document))
    const blobs = await Promise.all(assetIds.map((id) => notebookBlobRepository.get(id)))
    assetIds.forEach((id, index) => { const blob = blobs[index]; if (blob) assets.set(id, blob) })
    const semesterName = data.semesters.find((semester) => semester.id === data.activeSemesterId)?.name
    const pdf = await renderNotebookPdf({ subject, notes, attachments: relevantAttachments, assets, semesterName })
    if (share) { if (await shareNotebookPdf({ ...pdf, subjectName: subject.name }) === "download") setMediaStatus("El PDF se descargó. Puedes adjuntarlo en WhatsApp o la aplicación que prefieras."); return }
    const url = URL.createObjectURL(new Blob([pdf.bytes], { type: "application/pdf" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = pdf.filename; anchor.click(); URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (!draft?.title.trim()) return
    const snapshot = draft
    const timeout = window.setTimeout(() => { void save(snapshot, false) }, 950)
    return () => window.clearTimeout(timeout)
  }, [draft, save])

  if (!data.subjects.length) return <div className="mx-auto max-w-xl py-16 text-center"><BookOpen className="mx-auto size-10 text-muted-foreground" /><h1 className="mt-4 text-2xl font-semibold">Cuaderno de estudio</h1><p className="mt-2 text-muted-foreground">No tienes materias disponibles.</p><Button className="mt-5" onClick={onAddSubject}>Agregar materia</Button></div>
  if (!subjectId) return <div data-tour="notebook-subjects" className="space-y-5"><div><h1 className="text-2xl font-semibold">Cuaderno de estudio</h1><p className="text-sm text-muted-foreground">Organiza apuntes independientes para cada materia.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.subjects.map((subject) => { const SubjectIcon = getLucideIcon(subject.icon) ?? BookOpen; const notes = data.subjectNotes.filter((note) => note.subjectId === subject.id); const latest = [...notes].sort((a, b) => b.updatedAt - a.updatedAt)[0]; return <Card key={subject.id} style={{ borderTopColor: subject.color, borderTopWidth: 4 }}><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><SubjectIcon className="size-5" style={{ color: subject.color }} aria-hidden /><span>{subject.name}</span></CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">{notes.length} {notes.length === 1 ? "apunte" : "apuntes"}</p><p className="text-xs text-muted-foreground">{latest ? `Actualizado ${new Date(latest.updatedAt).toLocaleDateString("es-CL")}` : "Sin apuntes todavía"}</p><Button className="w-full" onClick={() => setSubjectId(subject.id)}>Abrir cuaderno</Button></CardContent></Card> })}</div></div>

  const subject = data.subjects.find((item) => item.id === subjectId)
  const legacyAttachments = draft ? data.subjectNoteAttachments.filter((item) => item.noteId === draft.id) : []
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-3"><Button variant="ghost" size="sm" onClick={() => { setSubjectId(null); setDraft(null); setSelectedId(null) }}><ArrowLeft className="mr-2 size-4" />Materias</Button><div className="min-w-0 flex-1"><h1 className="truncate text-xl font-semibold">Cuaderno de {subject?.name}</h1></div><Button variant="outline" onClick={() => void exportPdf(true, false)}><FileDown className="mr-2 size-4" />Exportar cuaderno PDF</Button><Button data-tour="notebook-new" onClick={() => startNew()}><Plus className="mr-2 size-4" />Nueva nota</Button></div>
    <div className="flex flex-wrap gap-2"><div className="relative min-w-52 flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título, unidad o contenido" /></div><select className="min-h-10 rounded-md border bg-background px-3 text-sm" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="Ordenar apuntes"><option value="updated">Última edición</option><option value="title">Título</option></select></div>
    <p className="flex items-center gap-2 text-xs text-muted-foreground"><Info className="size-4" />Las fotos de tus apuntes se guardan actualmente en este dispositivo.</p>
    <div className="grid min-h-[60vh] gap-4 md:grid-cols-[18rem_1fr]"><aside className={`${draft ? "hidden md:block" : "block"} space-y-2 rounded-xl border p-2`} aria-label="Apuntes">{subjectNotes.map((note) => <button key={note.id} onClick={() => chooseNote(note)} className={`w-full rounded-lg p-3 text-left ${selectedId === note.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}><span className="block truncate font-medium">{note.title}</span><span className="block truncate text-xs text-muted-foreground">{note.unit || "Sin unidad"} · {new Date(note.updatedAt).toLocaleDateString("es-CL")}</span></button>)}{!subjectNotes.length && <p className="p-4 text-sm text-muted-foreground">No hay apuntes que coincidan.</p>}</aside>
      {draft ? <main data-tour="notebook-editor" className="space-y-3 rounded-xl border bg-card p-3 md:p-4"><Button className="md:hidden" variant="ghost" size="sm" onClick={() => setDraft(null)}><ArrowLeft className="mr-2 size-4" />Volver a la lista</Button><Input aria-label="Título" placeholder="Título" value={draft.title} onChange={(event) => updateDraft((current) => ({ ...current, title: event.target.value }))} /><Input aria-label="Unidad o tema" placeholder="Unidad o tema (opcional)" value={draft.unit ?? ""} onChange={(event) => updateDraft((current) => ({ ...current, unit: event.target.value }))} />
        <NotebookLiteEditor key={draft.id || "new"} ref={editorRef} document={draft.document ?? legacyTextToDocument(draft.id || "draft", draft.content)} onChange={changeDocument} onPhoto={(file) => void addPhoto(file)} onLocalImageRemoved={removeLocalImage} />
        {legacyAttachments.length ? <section className="space-y-2 rounded-lg border border-dashed p-3"><h3 className="font-medium">Archivos de una versión anterior</h3><p className="text-xs text-muted-foreground">Se conservan en modo de solo lectura.</p>{legacyAttachments.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2"><FileText className="size-4" />{item.filename}</span><Button variant="outline" size="sm" onClick={() => void downloadLegacy(item)}><Download className="mr-2 size-4" />Descargar</Button></div>)}</section> : null}
        {mediaStatus ? <p role="status" className="text-sm text-muted-foreground">{mediaStatus}</p> : null}
        <div className="sticky bottom-16 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-background/95 p-2 backdrop-blur md:bottom-2"><p role="status" className={`text-sm ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>{status === "saving" ? "Guardando…" : status === "saved" ? "Guardado" : status === "error" ? `Error al guardar: ${error}` : "Los cambios se guardan automáticamente"}</p><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => void exportPdf(false, false)}><FileDown className="mr-2 size-4" />Exportar PDF</Button><Button variant="outline" size="sm" onClick={() => void exportPdf(false, true)}><Share2 className="mr-2 size-4" />Compartir</Button>{selectedId && <Button variant="destructive" size="sm" onClick={() => { if (window.confirm("Esta nota y sus fotos locales se eliminarán.")) void removeCurrentNote() }}><Trash2 className="mr-2 size-4" />Eliminar</Button>}<Button size="sm" disabled={!draft.title.trim() || status === "saving"} onClick={() => void save(draft)}><Save className="mr-2 size-4" />Guardar</Button></div></div>
      </main> : <div className="hidden place-items-center rounded-xl border text-muted-foreground md:grid">Selecciona un apunte o crea uno nuevo.</div>}</div>
  </div>
}
