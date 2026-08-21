/** Constant physical speed keeps the ticker readable regardless of content width. */
export const ACADEMIC_TICKER_SPEED = 40
export const ACADEMIC_TICKER_DRAG_THRESHOLD = 6
export const ACADEMIC_TICKER_TOUCH_RESUME_DELAY_MS = 100

export function advanceAcademicTicker(scrollLeft: number, deltaMs: number, loopWidth: number, speed = ACADEMIC_TICKER_SPEED) {
  if (loopWidth <= 0) return scrollLeft
  return (scrollLeft + speed * deltaMs / 1_000) % loopWidth
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
