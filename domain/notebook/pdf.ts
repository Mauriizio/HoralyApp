import type { NoteTextRun, Subject, SubjectNote, SubjectNoteAttachment } from "../../lib/types"
import { noteDocument } from "./document"
import { drawNotebookFooter, drawNotebookHeader, loadHorarilyLogo, loadHorarilyQr, NOTEBOOK_PDF_FOOTER_TOP } from "./pdf-branding"

export function splitStyledRuns(runs: NoteTextRun[]) { return runs.flatMap((run) => run.text.split(/(\s+)/).filter(Boolean).map((text) => ({ ...run, text }))) }

export async function renderNotebookPdf(input: { subject: Pick<Subject, "name">; notes: SubjectNote[]; attachments: SubjectNoteAttachment[]; assets?: Map<string, Blob>; semesterName?: string }): Promise<{ bytes: Uint8Array; filename: string }> {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ unit: "pt", format: "a4" }); const margin = 42, width = 511, contentBottom = NOTEBOOK_PDF_FOOTER_TOP - 14
  const [logo, qr] = await Promise.all([loadHorarilyLogo(), loadHorarilyQr()]); let y = 0
  const pageHeader = (note?: SubjectNote) => { y = drawNotebookHeader(doc, { subjectName: input.subject.name, title: note?.title, unit: note?.unit ?? (note ? undefined : input.semesterName), date: note ? new Date(note.updatedAt).toLocaleDateString("es-CL") : undefined }, logo) }
  const nextPage = (note?: SubjectNote) => { doc.addPage(); pageHeader(note) }
  const ensure = (height: number, note?: SubjectNote) => { if (y + height > contentBottom) nextPage(note) }

  if (input.notes.length > 1) {
    pageHeader(); doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.text(`Cuaderno de ${input.subject.name}`, margin, y + 32)
    doc.setFont("helvetica", "normal"); doc.setFontSize(11); if (input.semesterName) doc.text(`Semestre: ${input.semesterName}`, margin, y + 56)
  }

  for (const [index, note] of input.notes.entries()) {
    if (input.notes.length > 1 || index > 0) nextPage(note); else pageHeader(note)
    for (const block of noteDocument(note).blocks) {
      if (block.type === "localImage" || block.type === "image" || block.type === "drawing") {
        const assetId = block.type === "localImage" ? block.localAssetId : block.attachmentId
        const blob = input.assets?.get(assetId)
        if (!blob) { ensure(18, note); doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.text(block.type === "localImage" ? "[Foto no disponible en este dispositivo]" : `[${block.alt} no disponible]`, margin, y); y += 20; continue }
        const bytes = new Uint8Array(await blob.arrayBuffer()), format = blob.type === "image/jpeg" ? "JPEG" : blob.type === "image/webp" ? "WEBP" : "PNG"
        const properties = doc.getImageProperties(bytes), ratio = properties.width / Math.max(1, properties.height)
        let imageWidth = Math.min(width, 460), imageHeight = imageWidth / ratio
        if (imageHeight > 400) { imageHeight = 400; imageWidth = imageHeight * ratio }
        ensure(imageHeight + 14, note); doc.addImage(bytes, format, margin + (width - imageWidth) / 2, y, imageWidth, imageHeight, undefined, "FAST"); y += imageHeight + 14; continue
      }
      if (block.type === "attachmentReference") continue
      if (!("items" in block) && !("content" in block)) continue
      const paragraphs: NoteTextRun[][] = "items" in block ? block.items : [block.content]
      for (const runs of paragraphs) {
        ensure(18, note); let x = margin
        const tokens = splitStyledRuns(runs)
        if (!tokens.length) { y += 16; continue }
        for (const token of tokens) {
          const bold = token.marks?.includes("bold"), italic = token.marks?.includes("italic")
          doc.setFont("helvetica", bold && italic ? "bolditalic" : bold ? "bold" : italic ? "italic" : "normal"); doc.setFontSize(10)
          const pieces = token.text.trim() && doc.getTextWidth(token.text) > width ? doc.splitTextToSize(token.text, width) as string[] : [token.text]
          for (const piece of pieces) {
            const tokenWidth = doc.getTextWidth(piece)
            if (x > margin && x + tokenWidth > margin + width && piece.trim()) { y += 14; ensure(18, note); x = margin }
            doc.text(piece, x, y); if (token.marks?.includes("underline")) doc.line(x, y + 2, x + tokenWidth, y + 2); x += tokenWidth
          }
        }
        y += 18
      }
    }
    const legacy = input.attachments.filter((item) => item.noteId === note.id)
    if (legacy.length) { ensure(30 + legacy.length * 14, note); y += 8; doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text("Archivos de una versión anterior", margin, y); y += 15; doc.setFont("helvetica", "normal"); for (const item of legacy) { doc.text(item.filename, margin, y); y += 14 } }
  }
  const total = doc.getNumberOfPages(); for (let page = 1; page <= total; page += 1) { doc.setPage(page); drawNotebookFooter(doc, { subjectName: input.subject.name, qrAsset: qr }, page, total) }
  return { bytes: new Uint8Array(doc.output("arraybuffer")), filename: `${input.notes.length === 1 ? "apunte" : "cuaderno"}-${input.subject.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-")}.pdf` }
}

export async function shareNotebookPdf(input: { bytes: Uint8Array; filename: string; subjectName: string }): Promise<"shared" | "download"> {
  const blob = new Blob([input.bytes], { type: "application/pdf" }); const file = new File([blob], input.filename, { type: blob.type })
  const data = { title: `Apuntes de ${input.subjectName}`, text: `Te comparto mis apuntes de ${input.subjectName}.\nTomados con Horarily.\nhttps://horaly-app.vercel.app`, files: [file] }
  if (navigator.share && navigator.canShare?.(data)) { await navigator.share(data); return "shared" }
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = input.filename; anchor.click(); URL.revokeObjectURL(url); return "download"
}
