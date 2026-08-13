import type { NoteTextRun, Subject, SubjectNote, SubjectNoteAttachment } from "../../lib/types"
import { noteDocument } from "./document"

export function splitStyledRuns(runs: NoteTextRun[]) {
  return runs.flatMap((run) => run.text.split(/(\s+)/).filter(Boolean).map((text) => ({ ...run, text })))
}

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
        if (blob) {
          const bytes = new Uint8Array(await blob.arrayBuffer()), format = blob.type === "image/jpeg" ? "JPEG" : blob.type === "image/webp" ? "WEBP" : "PNG"
          const properties = doc.getImageProperties(bytes), ratio = properties.width / Math.max(1, properties.height)
          let imageWidth = Math.min(360, width), imageHeight = imageWidth / ratio
          if (imageHeight > 220) { imageHeight = 220; imageWidth = imageHeight * ratio }
          if (y + imageHeight > 780) { footer(); doc.addPage(); y = 48 }
          doc.addImage(bytes, format, margin, y, imageWidth, imageHeight, undefined, "FAST"); y += imageHeight + 14
        } else { doc.text(block.alt, margin, y); y += 14 }
        continue
      }
      if (block.type === "attachmentReference") { doc.text(`Adjunto: ${block.filename}`, margin, y); y += 14; continue }
      const isList = block.type === "bulletList" || block.type === "numberedList"
      const runs: NoteTextRun[][] = "items" in block ? block.items : "content" in block ? [block.content] : []
      doc.setFontSize(block.type === "heading" ? (block.level === 1 ? 15 : 13) : 10)
      for (const [itemIndex, lineRuns] of runs.entries()) {
        const tokens = splitStyledRuns(lineRuns); const prefix = isList ? (block.type === "bulletList" ? "• " : `${itemIndex + 1}. `) : ""
        let x = margin
        if (prefix) { doc.setFont("helvetica", "normal"); doc.text(prefix, x, y); x += doc.getTextWidth(prefix) }
        for (const token of tokens) {
          const family = token.font === "serif" ? "times" : token.font === "mono" ? "courier" : "helvetica"
          const bold = block.type === "heading" || token.marks?.includes("bold"), italic = token.marks?.includes("italic")
          doc.setFont(family, bold && italic ? "bolditalic" : bold ? "bold" : italic ? "italic" : "normal")
          const tokenWidth = doc.getTextWidth(token.text)
          if (x > margin && x + tokenWidth > margin + width && token.text.trim()) { y += 14; x = margin; if (y > 780) { footer(); doc.addPage(); y = 48 } }
          doc.text(token.text, x, y)
          if (token.marks?.includes("underline")) doc.line(x, y + 2, x + tokenWidth, y + 2)
          x += tokenWidth
        }
        y += 14
      }
      y += 4
    }
    const referenced = new Set(noteDocument(note).blocks.flatMap((block) => "attachmentId" in block ? [block.attachmentId] : []))
    const files = input.attachments.filter((item) => item.noteId === note.id && !referenced.has(item.id))
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
