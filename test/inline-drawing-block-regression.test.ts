import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"
import { completeDrawingDraft, drawingDraftInsertion, type DrawingDraft } from "../domain/notebook/drawing-draft.ts"
import { commitActiveStroke, redoStroke, undoStroke, type DrawingStroke } from "../domain/notebook/drawing-strokes.ts"

const document = { version: 1 as const, blocks: [{ id: "a", type: "paragraph" as const, content: [{ text: "ANTES" }] }, { id: "b", type: "paragraph" as const, content: [{ text: "DESPUÉS" }] }] }

test("drawing draft se ubica después del bloque seleccionado y cancelar no altera documento", () => {
  const draft = drawingDraftInsertion(document, { blockId: "a", start: 5, end: 5 }, "drawing-logical")
  assert.deepEqual(draft, { id: "drawing-logical", afterBlockId: "a" })
  assert.deepEqual(document.blocks.map((block) => block.id), ["a", "b"])
})

test("complete reemplaza el draft lógico en su posición y exige attachment confirmado", () => {
  const draft: DrawingDraft = { id: "drawing-logical", afterBlockId: "a" }
  assert.throws(() => completeDrawingDraft(document, draft, null), /attachment confirmado/i)
  const completed = completeDrawingDraft(document, draft, { id: "att-1", kind: "drawing", filename: "dibujo.png" })
  assert.deepEqual(completed.blocks.map((block) => block.id), ["a", "drawing-logical", "b"])
  assert.deepEqual(completed.blocks[1], { id: "drawing-logical", type: "drawing", attachmentId: "att-1", alt: "Dibujo" })
})

test("múltiples dibujos conservan orden lógico", () => {
  const first = completeDrawingDraft(document, { id: "d1", afterBlockId: "a" }, { id: "att-1", kind: "drawing", filename: "uno.png" })
  const second = completeDrawingDraft(first, { id: "d2", afterBlockId: "b" }, { id: "att-2", kind: "drawing", filename: "dos.png" })
  assert.deepEqual(second.blocks.map((block) => block.id), ["a", "d1", "b", "d2"])
})

test("pointer commit agrega un solo trazo completo y undo/redo son estables", () => {
  const active: DrawingStroke = { color: "#111827", width: 3, points: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }] }
  const committed = commitActiveStroke([], active)
  assert.equal(committed.length, 1)
  assert.equal(committed[0].points.length, 3)
  const undone = undoStroke(committed, [])
  assert.equal(undone.strokes.length, 0); assert.equal(undone.redo.length, 1)
  const redone = redoStroke(undone.strokes, undone.redo)
  assert.deepEqual(redone.strokes, committed)
})

test("canvas vive dentro de StructuredNoteEditor y no existe drawingOpen global", async () => {
  const notebook = await readFile("components/notebook/notebook-view.tsx", "utf8")
  const editor = await readFile("components/notebook/structured-note-editor.tsx", "utf8")
  const canvas = await readFile("components/notebook/inline-drawing-block.tsx", "utf8")
  assert.doesNotMatch(notebook, /drawingOpen|<DrawingCanvas/)
  assert.match(editor, /renderDrawingDraft/)
  assert.match(editor, /data-testid="drawing-draft-block"/)
  assert.match(canvas, /onPointerCancel=\{finishPointer\}/)
  assert.match(canvas, /await onComplete\(await canvasToBlob/)
  assert.match(canvas, /No se pudo guardar el dibujo\. Intenta nuevamente/)
})
