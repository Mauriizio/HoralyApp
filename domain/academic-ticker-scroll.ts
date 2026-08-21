/** Constant physical speed keeps the ticker readable regardless of content width. */
export const ACADEMIC_TICKER_SPEED = 40
export const ACADEMIC_TICKER_DRAG_THRESHOLD = 6
export const ACADEMIC_TICKER_TOUCH_RESUME_DELAY_MS = 100

export function positiveModulo(value: number, divisor: number) {
  if (divisor <= 0) return 0
  return ((value % divisor) + divisor) % divisor
}

export function calculateAcademicTickerSideCopies(viewportWidth: number, loopWidth: number) {
  if (loopWidth <= 0) return 2
  return Math.max(2, Math.ceil(Math.max(0, viewportWidth) / loopWidth) + 2)
}

export function recenterAcademicTicker(scrollLeft: number, loopWidth: number, sideCopies: number) {
  if (loopWidth <= 0) return scrollLeft
  const centerOffset = loopWidth * sideCopies
  return centerOffset + positiveModulo(scrollLeft - centerOffset, loopWidth)
}

export function advanceAcademicTicker(scrollLeft: number, deltaMs: number, loopWidth: number, speed = ACADEMIC_TICKER_SPEED) {
  if (loopWidth <= 0) return scrollLeft
  return positiveModulo(scrollLeft + speed * deltaMs / 1_000, loopWidth)
}

export function isAcademicTickerDrag(movement: number) {
  return Math.abs(movement) >= ACADEMIC_TICKER_DRAG_THRESHOLD
}

export function shouldManuallyDragAcademicTicker(pointerType: string) {
  return pointerType !== "touch"
}

export function hasAcademicTickerInteractionMoved(startPointerX: number, pointerX: number, scrollDelta: number) {
  return isAcademicTickerDrag(pointerX - startPointerX) || isAcademicTickerDrag(scrollDelta)
}

export function academicTickerDragOffset(startPointerX: number, pointerX: number, startScrollLeft: number) {
  return startScrollLeft - (pointerX - startPointerX)
}
