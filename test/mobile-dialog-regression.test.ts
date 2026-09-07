import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

test("los diálogos globales permanecen dentro del viewport móvil y permiten scroll", async () => {
  const dialog = await readFile("components/ui/dialog.tsx", "utf8")
  const alertDialog = await readFile("components/ui/alert-dialog.tsx", "utf8")

  for (const source of [dialog, alertDialog]) {
    assert.match(source, /100dvh/)
    assert.match(source, /safe-area-inset-top/)
    assert.match(source, /safe-area-inset-bottom/)
    assert.match(source, /overflow-y-auto/)
    assert.match(source, /overscroll-contain/)
  }
})

test("el cierre de Dialog tiene un objetivo táctil amplio y los footers no superponen acciones", async () => {
  const dialog = await readFile("components/ui/dialog.tsx", "utf8")
  const alertDialog = await readFile("components/ui/alert-dialog.tsx", "utf8")

  assert.match(dialog, /size-11/)
  assert.match(dialog, /touch-manipulation/)
  assert.match(dialog, />Cerrar</)
  assert.match(dialog, /flex-col-reverse[\s\S]*?\[&>\*\]:w-full[\s\S]*?sm:flex-row/)
  assert.match(alertDialog, /flex-col-reverse[\s\S]*?\[&>\*\]:w-full[\s\S]*?sm:flex-row/)
})
