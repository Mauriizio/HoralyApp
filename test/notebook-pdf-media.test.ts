import assert from "node:assert/strict"
import test from "node:test"
import { renderNotebookPdf } from "../domain/notebook/pdf.ts"

test("PDF de Cuaderno incrusta bytes de imagen y dibujo", async () => {
  const png = new Blob([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64")], { type: "image/png" })
  const note = { id: "n", semesterId: "s", subjectId: "x", title: "Media", content: "", document: { version: 1 as const, blocks: [{ id: "i", type: "image" as const, attachmentId: "i", alt: "Foto" }, { id: "d", type: "drawing" as const, attachmentId: "d", alt: "Dibujo" }] }, createdAt: 1, updatedAt: 2 }
  const attachments = [{ id: "i", semesterId: "s", subjectId: "x", noteId: "n", kind: "image" as const, filename: "foto.png", mimeType: "image/png" as const, sizeBytes: png.size, createdAt: 1 }, { id: "d", semesterId: "s", subjectId: "x", noteId: "n", kind: "drawing" as const, filename: "dibujo.png", mimeType: "image/png" as const, sizeBytes: png.size, createdAt: 1 }]
  const pdf = await renderNotebookPdf({ subject: { name: "Materia" }, notes: [note], attachments, assets: new Map([["i", png], ["d", png]]) })
  const source = Buffer.from(pdf.bytes).toString("latin1"); assert.ok((source.match(/\/Subtype \/Image/g) ?? []).length >= 1); assert.match(source, /\/I0 Do/)
})
