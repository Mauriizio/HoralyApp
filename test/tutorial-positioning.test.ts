import test from "node:test"
import assert from "node:assert/strict"
import { calculateTourCompositionPosition } from "../lib/tutorial-positioning.ts"

const viewport = { width: 1280, height: 800 }
const composition = { bubbleWidth: 430, bubbleHeight: 260, mascotWidth: 112, mascotHeight: 112, gap: 16, safeMargin: 16 }

test("composición completa permanece dentro del viewport en todos los bordes", () => {
  const targets = [
    { left: 0, top: 300, width: 40, height: 40 },
    { left: 1240, top: 300, width: 40, height: 40 },
    { left: 600, top: 0, width: 40, height: 40 },
    { left: 600, top: 760, width: 40, height: 40 },
    { left: 600, top: 380, width: 40, height: 40 },
  ]
  for (const target of targets) {
    const result = calculateTourCompositionPosition(target, viewport, composition)
    assert.ok(result.left >= 16)
    assert.ok(result.top >= 16)
    assert.ok(result.left + result.width <= viewport.width - 16)
    assert.ok(result.top + result.height <= viewport.height - 16)
    assert.ok(result.left + result.mascotLeft >= 16)
    assert.ok(result.left + result.mascotLeft + composition.mascotWidth <= viewport.width - 16)
  }
})
