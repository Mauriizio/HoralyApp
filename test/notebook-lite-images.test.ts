import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import { documentPlainText, localImageAssetIds, toLiteDocument } from "../domain/notebook/document.ts"
import { insertLocalImageAfter, localImageBlock, validateLocalImage } from "../domain/notebook/local-images.ts"
import { renderNotebookPdf } from "../domain/notebook/pdf.ts"
import type { NoteDocumentV1 } from "../lib/types.ts"

test("fotos Lite aceptan JPEG/PNG/WebP y rechazan SVG, PDF y oversize", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"]) assert.equal(validateLocalImage({ type, size: 100 }), null)
  assert.match(validateLocalImage({ type: "image/svg+xml", size: 100 })!, /JPEG/)
  assert.match(validateLocalImage({ type: "application/pdf", size: 100 })!, /JPEG/)
  assert.match(validateLocalImage({ type: "image/jpeg", size: 21 * 1024 * 1024 })!, /20 MB/)
})

test("PDF Lite conserva flujo texto-foto-texto, marks y membrete Horarily", async () => {
  const png = new Blob([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64")], { type: "image/png" })
  const note = { id: "n", semesterId: "s", subjectId: "x", title: "Flujo", unit: "Tema", content: "A\nFoto\nB", document: { version: 1 as const, blocks: [
    { id: "a", type: "paragraph" as const, content: [{ text: "Paragraph A" }] },
    { id: "i", type: "localImage" as const, localAssetId: "asset", alt: "Foto", width: 640, height: 360 },
    { id: "b", type: "paragraph" as const, content: [{ text: "Paragraph B", marks: ["bold" as const] }] },
    { id: "c", type: "paragraph" as const, content: [{ text: "Paragraph C", marks: ["underline" as const] }] },
  ] }, createdAt: 1, updatedAt: 2 }
  const result = await renderNotebookPdf({ subject: { name: "Electrotecnia II" }, notes: [note], attachments: [], assets: new Map([["asset", png]]) })
  assert.ok(result.bytes.byteLength > 1500)
  const renderer = await readFile("domain/notebook/pdf.ts", "utf8"), branding = await readFile("domain/notebook/pdf-branding.ts", "utf8")
  assert.match(renderer, /for \(const block of noteDocument\(note\)\.blocks\)/)
  assert.match(renderer, /localImage/)
  assert.match(branding, /HORARILY/)
  assert.match(branding, /https:\/\/horaly-app\.vercel\.app/)
})

test("imagen se inserta en posición y siempre deja párrafo para continuar", () => {
  const document: NoteDocumentV1 = { version: 1, blocks: [{ id: "a", type: "paragraph", content: [{ text: "A" }] }, { id: "b", type: "paragraph", content: [{ text: "B" }] }] }
  const image = localImageBlock("asset-1", { width: 1200, height: 800 })
  const result = insertLocalImageAfter(document, "a", image)
  assert.deepEqual(result.blocks.map((block) => block.type), ["paragraph", "localImage", "paragraph", "paragraph"])
  assert.equal(result.blocks[1], image)
  assert.deepEqual(localImageAssetIds(result), ["asset-1"])
})

test("adaptador legacy conserva texto y B/I/U, ignora formatos retirados sin borrar fallback", () => {
  const legacy: NoteDocumentV1 = { version: 1, blocks: [
    { id: "h", type: "heading", content: [{ text: "Título", marks: ["bold"], font: "serif" }] },
    { id: "l", type: "bulletList", items: [[{ text: "Uno", marks: ["italic"] }], [{ text: "Dos", marks: ["underline"] }]] },
    { id: "d", type: "drawing", attachmentId: "old", alt: "Dibujo" },
  ] }
  const lite = toLiteDocument(legacy, "fallback")
  assert.equal(documentPlainText(lite), "Título\nUno\nDos")
  assert.deepEqual((lite.blocks[0] as { content: unknown }).content, [{ text: "Título", marks: ["bold"] }])
  assert.doesNotMatch(JSON.stringify(lite), /drawing|font/)
  assert.equal(documentPlainText(toLiteDocument({ version: 1, blocks: [legacy.blocks[2]] }, "Texto seguro")), "Texto seguro")
})
