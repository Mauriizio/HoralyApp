import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("Cuaderno Lite delega Enter, selection y caret al motor de editor", async () => {
  const editor = await readFile("components/notebook/notebook-lite-editor.tsx", "utf8")

  assert.doesNotMatch(editor, /beforeinput|insertParagraph|TreeWalker|restoreCaret|selectionOffsets|execCommand/)
  assert.match(editor, /LexicalComposer/)
  assert.match(editor, /FORMAT_TEXT_COMMAND/)
})

test("la toolbar Lite expone solo B, I, U y fotos", async () => {
  const notebook = await readFile("components/notebook/notebook-view.tsx", "utf8")
  const editor = await readFile("components/notebook/notebook-lite-editor.tsx", "utf8")

  assert.doesNotMatch(notebook, /Dibujar|Adjuntar PDF|Lista numerada|aria-label="Fuente"/)
  assert.match(editor, /Tomar foto/)
  assert.match(editor, /Elegir de galería/)
})
