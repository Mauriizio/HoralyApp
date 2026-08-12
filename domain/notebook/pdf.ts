import type { NoteTextRun, Subject, SubjectNote, SubjectNoteAttachment } from "../../lib/types"
import { noteDocument } from "./document"

export async function renderNotebookPdf(input: { subject: Pick<Subject, "name">; notes: SubjectNote[]; attachments: SubjectNoteAttachment[]; assets?: Map<string, Blob> }): Promise<{ bytes: Uint8Array; filename: string }> {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ unit: "pt", format: "a4" }); const margin = 42; const width = 511; let y = 48
  const footer = () => { doc.setFontSize(8); doc.setTextColor(100); doc.text("Creado con Horarily · https://horaly-app.vercel.app", margin, 812); doc.setTextColor(0) }
  doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.text(input.notes.length === 1 ? "Horarily · Apunte" : `Cuaderno de ${input.subject.name}`, margin, y); y += 32
  for (const [index, note] of input.notes.entries()) {
    if (index > 0) { footer(); doc.addPage(); y = 48 }
    doc.setFontSize(16); doc.text(note.title || "Sin título", margin, y); y += 20
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(`${input.subject.name}${note.unit ? ` · ${note.unit}` : ""} · ${new Date(note.updatedAt).toLocaleDateString("es-CL")}`, margin, y); y += 22
    doc.setFontSize(10)
    for (const block of noteDocument(note).blocks) {
      if (block.type === "image" || block.type === "drawing") {
        const blob = input.assets?.get(block.attachmentId)
        if (blob) { if (y > 610) { footer(); doc.addPage(); y = 48 }; const bytes = new Uint8Array(await blob.arrayBuffer()); doc.addImage(bytes, blob.type === "image/jpeg" ? "JPEG" : blob.type === "image/webp" ? "WEBP" : "PNG", margin, y, 260, 150, undefined, "FAST"); y += 164 } else { doc.text(block.alt, margin, y); y += 14 }
        continue
      }
      if (block.type === "attachmentReference") { doc.text(`Adjunto: ${block.filename}`, margin, y); y += 14; continue }
      const isList = block.type === "bulletList" || block.type === "numberedList"
      const runs: NoteTextRun[][] = "items" in block ? block.items : "content" in block ? [block.content] : []
      doc.setFont("helvetica", block.type === "heading" || runs.some((line) => line.some((run) => run.marks?.includes("bold"))) ? "bold" : "normal")
      doc.setFontSize(block.type === "heading" ? (block.level === 1 ? 15 : 13) : 10)
      for (const [itemIndex, lineRuns] of runs.entries()) { const prefix = isList ? (block.type === "bulletList" ? "• " : `${itemIndex + 1}. `) : ""; const lines = doc.splitTextToSize(prefix + lineRuns.map((run) => run.text).join(""), width); for (const line of lines) { if (y > 780) { footer(); doc.addPage(); y = 48 } doc.text(line, margin, y); if (lineRuns.some((run) => run.marks?.includes("underline"))) doc.line(margin, y + 2, margin + doc.getTextWidth(line), y + 2); y += 14 } }
      y += 4
    }
    const files = input.attachments.filter((item) => item.noteId === note.id)
    if (files.length) { y += 10; doc.setFont("helvetica", "bold"); doc.text("Adjuntos", margin, y); y += 15; doc.setFont("helvetica", "normal"); for (const file of files) { doc.text(`${file.kind === "pdf" ? "PDF" : file.kind === "drawing" ? "Dibujo" : "Imagen"}: ${file.filename}`, margin, y); y += 14 } }
  }
  footer(); return { bytes: new Uint8Array(doc.output("arraybuffer")), filename: `${input.notes.length === 1 ? "apunte" : "cuaderno"}-${input.subject.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.pdf` }
}

export async function shareNotebookPdf(input: { bytes: Uint8Array; filename: string; subjectName: string }): Promise<"shared" | "download"> {
  const blob = new Blob([input.bytes], { type: "application/pdf" }); const file = new File([blob], input.filename, { type: blob.type })
  const data = { title: `Apuntes de ${input.subjectName}`, text: `Te comparto mis apuntes de ${input.subjectName}.\nCreado con Horarily:\nhttps://horaly-app.vercel.app`, files: [file] }
  if (navigator.share && navigator.canShare?.(data)) { await navigator.share(data); return "shared" }
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = input.filename; anchor.click(); URL.revokeObjectURL(url); return "download"
}
