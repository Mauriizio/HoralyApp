import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

test("Android conserva una acción de instalación aunque el prompt nativo aún no esté disponible", async () => {
  const hook = await readFile("hooks/use-pwa-install.ts", "utf8")
  assert.match(hook, /platform === "android"/)
  assert.match(hook, /showInstructions/)
})

test("la instalación móvil ofrece instrucciones específicas para Android y iPhone", async () => {
  const button = await readFile("components/install-app-button.tsx", "utf8")
  const translations = await readFile("lib/i18n.ts", "utf8")
  assert.match(button, /platform === "android"/)
  assert.match(button, /install\.android\.step1/)
  assert.match(translations, /"install\.android\.step1"/)
  assert.match(translations, /"install\.ios\.step1"/)
  assert.match(button, /<Dialog/)
})

test("el botón de instalación permanece disponible en la interfaz principal", async () => {
  const page = await readFile("app/page.tsx", "utf8")
  const profile = await readFile("components/profile-button.tsx", "utf8")
  assert.match(page, /<InstallAppButton/)
  assert.match(profile, /<InstallAppButton/)
})
