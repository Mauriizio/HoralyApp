import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import {
  ACADEMIC_TICKER_TOUCH_RESUME_DELAY_MS,
  academicTickerDragOffset,
  hasAcademicTickerInteractionMoved,
  shouldManuallyDragAcademicTicker,
} from "../domain/academic-ticker-scroll.ts"

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
  assert.match(source, /ResizeObserver/)
  assert.match(source, /sideCopies/)
  assert.doesNotMatch(source, /CENTER_COPY_INDEX/)
  assert.doesNotMatch(source, /touch-pan-y/)
  assert.match(source, /event\.pointerType === "touch"[^\n]+return/)
  assert.match(source, /setPointerCapture\(event\.pointerId\)/)
})
