import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { startCompanionRotation } from "../domain/companion-rotation.ts"

test("rotación avanza a los 8s, pausa, reanuda y limpia con fake timers", (context) => {
  context.mock.timers.enable({ apis: ["setInterval"] })
  let paused = false
  let advances = 0
  const cleanup = startCompanionRotation({ count: 3, isPaused: () => paused, onAdvance: () => { advances += 1 } })
  context.mock.timers.tick(8_000)
  assert.equal(advances, 1)
  paused = true
  context.mock.timers.tick(8_000)
  assert.equal(advances, 1)
  paused = false
  context.mock.timers.tick(8_000)
  assert.equal(advances, 2)
  cleanup()
  context.mock.timers.tick(8_000)
  assert.equal(advances, 2)
})

test("ticker y companion declaran interacción, reduced motion y accesibilidad estática", async () => {
  const [ticker, companion, css] = await Promise.all([
    readFile("components/academic/academic-ticker.tsx", "utf8"),
    readFile("components/horarily/horarily-companion.tsx", "utf8"),
    readFile("app/globals.css", "utf8"),
  ])
  assert.match(ticker, /slice\(0, 8\)/)
  assert.doesNotMatch(ticker, /aria-live/)
  assert.match(companion, /onMouseEnter/)
  assert.match(companion, /onFocusCapture/)
  assert.match(css, /prefers-reduced-motion: reduce/)
  assert.match(ticker, /requestAnimationFrame/)
  assert.doesNotMatch(css, /@keyframes academic-ticker-scroll/)
})
