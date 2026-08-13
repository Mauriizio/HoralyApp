import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("branding PDF usa exclusivamente los assets oficiales LOGO y QR", async () => {
  const branding = await readFile("domain/notebook/pdf-branding.ts", "utf8")
  assert.match(branding, /\/LOGO\.png/)
  assert.match(branding, /\/qr-code\.png/)
  assert.match(branding, /loadHorarilyLogo/)
  assert.match(branding, /loadHorarilyQr/)
  assert.doesNotMatch(branding, /horarily_simbolo_transparente_1024/)
  assert.match(branding, /Instala Horarily/)
  for (const asset of ["public/LOGO.png", "public/qr-code.png"]) {
    const png = await readFile(asset)
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
    assert.ok(png.byteLength > 50_000)
  }
})

test("selector Foto usa Portal y cámara getUserMedia con fallback capture", async () => {
  const editor = await readFile("components/notebook/notebook-lite-editor.tsx", "utf8")
  const camera = await readFile("domain/notebook/camera.ts", "utf8")
  const dialog = await readFile("components/notebook/camera-capture-dialog.tsx", "utf8")
  const popover = await readFile("components/ui/popover.tsx", "utf8")
  assert.match(editor, /PopoverContent/)
  assert.doesNotMatch(editor, /<details/)
  assert.match(popover, /PopoverPrimitive\.Portal/)
  assert.match(dialog, /getUserMedia/)
  assert.match(camera, /facingMode/)
  assert.match(camera, /audio:\s*false/)
  assert.match(editor, /capture="environment"/)
  assert.match(camera, /getTracks\(\).*stop/)
  assert.match(editor, /\$setSelection\(bookmark\.current\.clone\(\)\)/)
})
