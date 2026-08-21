import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import {
  ACADEMIC_TICKER_REDUCED_SPEED,
  ACADEMIC_TICKER_SPEED,
  ACADEMIC_TICKER_TOUCH_RESUME_DELAY_MS,
  advanceAcademicTicker,
  advanceAcademicTickerWithRemainder,
  academicTickerDragOffset,
  hasAcademicTickerInteractionMoved,
  shouldManuallyDragAcademicTicker,
} from "../domain/academic-ticker-scroll.ts"

test("reduced motion ralentiza el autoplay sin detenerlo", () => {
  const loopWidth = 1_000
  const normalA = 100
  const normalB = advanceAcademicTicker(normalA, 500, loopWidth, ACADEMIC_TICKER_SPEED)
  const normalC = advanceAcademicTicker(normalB, 500, loopWidth, ACADEMIC_TICKER_SPEED)
  const reducedA = 100
  const reducedB = advanceAcademicTicker(reducedA, 500, loopWidth, ACADEMIC_TICKER_REDUCED_SPEED)
  const reducedC = advanceAcademicTicker(reducedB, 500, loopWidth, ACADEMIC_TICKER_REDUCED_SPEED)

  assert.deepEqual([normalA, normalB, normalC], [100, 120, 140])
  assert.deepEqual([reducedA, reducedB, reducedC], [100, 107, 114])
  assert.ok(reducedB > reducedA && reducedC > reducedB)
  assert.ok(reducedC - reducedA < normalC - normalA)
})

test("acumula fracciones de píxel entre frames para velocidades reducidas", () => {
  const simulate = (speed: number) => {
    let remainder = 0
    let scrollLeft = 0
    for (let frame = 0; frame < 25; frame += 1) {
      const movement = advanceAcademicTickerWithRemainder(scrollLeft, remainder, 20, 1_000, speed)
      scrollLeft = movement.scrollLeft
      remainder = movement.remainder
    }
    return scrollLeft
  }

  assert.equal(simulate(ACADEMIC_TICKER_SPEED), 20)
  assert.equal(simulate(ACADEMIC_TICKER_REDUCED_SPEED), 7)
})

test("touch usa scroll nativo y mouse/pen conservan drag manual 1:1", () => {
  assert.equal(shouldManuallyDragAcademicTicker("touch"), false)
  assert.equal(shouldManuallyDragAcademicTicker("mouse"), true)
  assert.equal(shouldManuallyDragAcademicTicker("pen"), true)
  assert.equal(academicTickerDragOffset(300, 270, 500), 530)
  assert.equal(academicTickerDragOffset(300, 230, 500), 570)
  assert.equal(academicTickerDragOffset(300, 290, 500), 510)
})

test("threshold distingue navegación sin retrasar el desplazamiento", () => {
  assert.equal(hasAcademicTickerInteractionMoved(100, 104, 0), false)
  assert.equal(hasAcademicTickerInteractionMoved(100, 107, 0), true)
  assert.equal(hasAcademicTickerInteractionMoved(100, 100, 7), true)
  assert.ok(ACADEMIC_TICKER_TOUCH_RESUME_DELAY_MS >= 80)
  assert.ok(ACADEMIC_TICKER_TOUCH_RESUME_DELAY_MS <= 150)
})

test("ticker separa touch nativo de mouse, conserva RAF y no bloquea scroll vertical", async () => {
  const source = await readFile("components/academic/academic-ticker.tsx", "utf8")
  assert.match(source, /pointerType === "touch"/)
  assert.match(source, /shouldManuallyDragAcademicTicker/)
  assert.match(source, /onScroll=/)
  assert.match(source, /touch-auto/)
  assert.match(source, /requestAnimationFrame/)
  assert.doesNotMatch(source, /if \(prefersReducedMotion \|\| items\.length === 0\) return/)
  assert.match(source, /prefersReducedMotion\s*\?\s*ACADEMIC_TICKER_REDUCED_SPEED\s*:\s*ACADEMIC_TICKER_SPEED/)
  assert.match(source, /ResizeObserver/)
  assert.match(source, /sideCopies/)
  assert.doesNotMatch(source, /CENTER_COPY_INDEX/)
  assert.doesNotMatch(source, /touch-pan-y/)
  assert.match(source, /event\.pointerType === "touch"[^\n]+return/)
  assert.match(source, /setPointerCapture\(event\.pointerId\)/)
})
