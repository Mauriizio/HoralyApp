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
  layout: "mascot-left" | "mascot-right" | "stacked"
}

const clamp = (value: number, minimum: number, maximum: number) => Math.min(Math.max(value, minimum), maximum)

export function calculateTourCompositionPosition(
  target: TourRect,
  viewport: TourViewport,
  composition: TourComposition,
): TourCompositionPosition {
  const { bubbleWidth, bubbleHeight, mascotWidth, mascotHeight, gap, safeMargin } = composition
  const sideWidth = bubbleWidth + mascotWidth + gap
  const sideHeight = Math.max(bubbleHeight, mascotHeight)
  const targetRight = target.left + target.width
  const rightSpace = viewport.width - targetRight - gap - safeMargin
  const leftSpace = target.left - gap - safeMargin
  const sideFits = sideWidth <= viewport.width - safeMargin * 2

  if (sideFits && (rightSpace >= sideWidth || leftSpace >= sideWidth)) {
    const useRight = rightSpace >= sideWidth && (leftSpace < sideWidth || rightSpace >= leftSpace)
    const desiredLeft = useRight ? targetRight + gap : target.left - gap - sideWidth
    const left = clamp(desiredLeft, safeMargin, viewport.width - safeMargin - sideWidth)
    const top = clamp(target.top + target.height / 2 - sideHeight / 2, safeMargin, viewport.height - safeMargin - sideHeight)
    return {
      left,
      top,
      width: sideWidth,
      height: sideHeight,
      mascotLeft: useRight ? 0 : bubbleWidth + gap,
      mascotTop: Math.max(0, sideHeight - mascotHeight),
      bubbleLeft: useRight ? mascotWidth + gap : 0,
      bubbleTop: Math.max(0, (sideHeight - bubbleHeight) / 2),
      layout: useRight ? "mascot-left" : "mascot-right",
    }
  }

  const width = Math.min(bubbleWidth, viewport.width - safeMargin * 2)
  const height = mascotHeight + gap + bubbleHeight
  const left = clamp(target.left + target.width / 2 - width / 2, safeMargin, viewport.width - safeMargin - width)
  const below = target.top + target.height + gap
  const top = below + height <= viewport.height - safeMargin
    ? below
    : clamp(target.top - gap - height, safeMargin, viewport.height - safeMargin - height)
  return {
    left,
    top,
    width,
    height,
    mascotLeft: Math.max(0, (width - mascotWidth) / 2),
    mascotTop: 0,
    bubbleLeft: 0,
    bubbleTop: mascotHeight + gap,
    layout: "stacked",
  }
}
