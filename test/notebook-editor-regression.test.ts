import assert from "node:assert/strict"
import test from "node:test"
import {
  applyBlockType,
  applyFont,
  insertAttachmentBlock,
  insertText,
  referencedAttachmentIds,
  toggleMark,
  type TextSelection,
} from "../domain/notebook/editor.ts"
import { documentPlainText } from "../domain/notebook/document.ts"

const paragraph = () => ({ version: 1 as const, blocks: [{ id: "p", type: "paragraph" as const, content: [{ text: "Hola mundo" }] }] })
const selected: TextSelection = { blockId: "p", start: 5, end: 10 }

test("rich editor aplica marks y fuente solamente a la selección", () => {
  for (const mark of ["bold", "italic", "underline"] as const) {
    const result = toggleMark(paragraph(), selected, mark)
    assert.deepEqual(result.blocks[0], { id: "p", type: "paragraph", content: [{ text: "Hola " }, { text: "mundo", marks: [mark] }] })
  }
  const font = applyFont(paragraph(), selected, "mono")
  assert.deepEqual(font.blocks[0], { id: "p", type: "paragraph", content: [{ text: "Hola " }, { text: "mundo", font: "mono" }] })
})

test("rich editor conserva marks activos al escribir sin selección", () => {
  const result = insertText(paragraph(), { blockId: "p", start: 10, end: 10 }, " nuevo", { marks: ["bold"], font: "serif" })
  assert.deepEqual(result.blocks[0], { id: "p", type: "paragraph", content: [{ text: "Hola mundo" }, { text: " nuevo", marks: ["bold"], font: "serif" }] })
})

test("heading y listas transforman solo el bloque activo", () => {
  const document = { version: 1 as const, blocks: [...paragraph().blocks, { id: "q", type: "paragraph" as const, content: [{ text: "Segundo" }] }] }
  assert.equal(applyBlockType(document, selected, "heading").blocks[0].type, "heading")
  assert.equal(applyBlockType(document, selected, "bulletList").blocks[0].type, "bulletList")
  assert.equal(applyBlockType(document, selected, "numberedList").blocks[0].type, "numberedList")
  assert.deepEqual(applyBlockType(document, selected, "heading").blocks[1], document.blocks[1])
})

test("media crea bloques en posición, persiste en plain text y detecta huérfanos", () => {
  let document = insertAttachmentBlock(paragraph(), selected, { id: "img", kind: "image", filename: "pizarra.png" })
  document = insertAttachmentBlock(document, { blockId: "img-block", start: 0, end: 0 }, { id: "draw", kind: "drawing", filename: "dibujo.png" })
  document = insertAttachmentBlock(document, { blockId: "draw-block", start: 0, end: 0 }, { id: "pdf", kind: "pdf", filename: "guia.pdf" })
  assert.deepEqual([...referencedAttachmentIds(document)], ["img", "draw", "pdf"])
  assert.match(documentPlainText(document), /pizarra|Dibujo|guia\.pdf/i)
  assert.ok(!referencedAttachmentIds(document).has("orphan"))
})
