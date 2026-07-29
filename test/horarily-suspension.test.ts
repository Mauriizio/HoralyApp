import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

test("el asistente principal se suspende mientras existe un tutorial activo", async () => {
  const page = await readFile("app/page.tsx", "utf8")
  const assistant = await readFile("components/HorarilySpeakingCard.tsx", "utf8")
  assert.match(page, /suspended=\{Boolean\(activeTutorial\)\}/)
  assert.match(assistant, /suspended\?: boolean/)
  assert.match(assistant, /if \(suspended\) return null/)
  assert.match(assistant, /autoSpeak && !suspended/)
})

test("la medición de la burbuja se instala después de montar el portal", async () => {
  const tour = await readFile("components/tutorials/guided-tour.tsx", "utf8")
  assert.match(tour, /\[mounted, pausedByDialog, step\]/)
})
