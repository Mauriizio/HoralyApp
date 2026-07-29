export interface TourRect {
  left: number
  top: number
  width: number
  height: number
}

export interface TourViewport {
  width: number
  height: number
}

export interface TourComposition {
  bubbleWidth: number
  bubbleHeight: number
  mascotWidth: number
  mascotHeight: number
  gap: number
  safeMargin: number
}

export interface TourCompositionPosition {
  left: number
  top: number
  width: number
  height: number
  mascotLeft: number
  mascotTop: number
  bubbleLeft: number
  bubbleTop: number
  bubbleWidth: number
  layout: "speech"
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), Math.max(minimum, maximum))

/**
 * Positions one indivisible speech composition. Placement around the target may
 * flip or shift, but Horarily always remains attached below the bubble's left
 * corner so its tail never points into empty space.
 */
export function calculateTourCompositionPosition(
  target: TourRect,
  viewport: TourViewport,
  composition: TourComposition,
): TourCompositionPosition {
  const { bubbleHeight, mascotWidth, mascotHeight, gap, safeMargin } = composition
  const bubbleLeft = Math.min(24, Math.max(12, Math.round(mascotWidth * 0.18)))
  const availableWidth = Math.max(1, viewport.width - safeMargin * 2)
  const bubbleWidth = Math.min(composition.bubbleWidth, availableWidth - bubbleLeft)
  const width = Math.max(mascotWidth, bubbleLeft + bubbleWidth)
  const height = bubbleHeight + gap + mascotHeight
  const targetRight = target.left + target.width
  const targetBottom = target.top + target.height
  const placementGap = 12

  const candidates = [
    { left: targetRight + placementGap, top: target.top + target.height / 2 - height / 2 },
    { left: target.left - placementGap - width, top: target.top + target.height / 2 - height / 2 },
    { left: target.left + target.width / 2 - width / 2, top: targetBottom + placementGap },
    { left: target.left + target.width / 2 - width / 2, top: target.top - placementGap - height },
  ]
  const fits = (candidate: { left: number; top: number }) =>
    candidate.left >= safeMargin
    && candidate.top >= safeMargin
    && candidate.left + width <= viewport.width - safeMargin
    && candidate.top + height <= viewport.height - safeMargin
  const preferred = candidates.find(fits) ?? candidates[2]
  const left = clamp(preferred.left, safeMargin, viewport.width - safeMargin - width)
  const top = clamp(preferred.top, safeMargin, viewport.height - safeMargin - height)

  return {
    left,
    top,
    width,
    height,
    mascotLeft: 0,
    mascotTop: bubbleHeight + gap,
    bubbleLeft,
    bubbleTop: 0,
    bubbleWidth,
    layout: "speech",
  }
}
