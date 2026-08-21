"use client"

import { useEffect, useRef, useState } from "react"
import type { HorarilyCompanionMessage } from "@/domain/horarily-companion"
import {
  ACADEMIC_TICKER_TOUCH_RESUME_DELAY_MS,
  advanceAcademicTicker,
  academicTickerDragOffset,
  calculateAcademicTickerSideCopies,
  hasAcademicTickerInteractionMoved,
  positiveModulo,
  recenterAcademicTicker,
  shouldManuallyDragAcademicTicker,
} from "@/domain/academic-ticker-scroll"
import type { AppTab } from "@/components/app-shell/navigation"

const LABELS: Record<HorarilyCompanionMessage["kind"], string> = {
  "current-class": "AHORA", "next-class": "CLASE", assessment: "EVALUACIÓN", assignment: "ENTREGA",
  event: "EVENTO", overdue: "URGENTE", reminder: "PENDIENTE", "day-summary": "HOY",
  attention: "PENDIENTE", motivation: "HOY", empty: "HOY",
}
export function AcademicTicker({ messages, onNavigate }: { messages: HorarilyCompanionMessage[]; onNavigate: (tab: AppTab) => void }) {
  const items = messages.filter((item) => item.kind !== "empty" && item.kind !== "motivation").slice(0, 8)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const originalRef = useRef<HTMLDivElement>(null)
  const pointer = useRef({ id: -1, x: 0, scrollLeft: 0, moved: false })
  const touch = useRef({ id: -1, x: 0, scrollLeft: 0, moved: false })
  const isTouching = useRef(false)
  const isMouseDragging = useRef(false)
  const touchMomentumPending = useRef(false)
  const resumeAutoplayAt = useRef(0)
  const suppressClickUntil = useRef(0)
  const loopWidthRef = useRef(0)
  const centerOffsetRef = useRef(0)
  const [sideCopies, setSideCopies] = useState(2)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setPrefersReducedMotion(query.matches)
    update(); query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    const scroller = scrollerRef.current
    const canonicalLoop = originalRef.current
    if (!scroller || !canonicalLoop || typeof ResizeObserver === "undefined") return
    const updateBuffer = () => {
      const loopWidth = canonicalLoop.scrollWidth
      if (loopWidth <= 0) return
      setSideCopies(calculateAcademicTickerSideCopies(scroller.clientWidth, loopWidth))
    }
    const observer = new ResizeObserver(updateBuffer)
    observer.observe(scroller)
    observer.observe(canonicalLoop)
    updateBuffer()
    return () => observer.disconnect()
  }, [items.length, sideCopies])

  useEffect(() => {
    const scroller = scrollerRef.current
    const loopWidth = originalRef.current?.scrollWidth ?? 0
    if (!scroller || loopWidth <= 0 || isTouching.current || isMouseDragging.current) return
    const relative = positiveModulo(scroller.scrollLeft - centerOffsetRef.current, loopWidthRef.current || loopWidth)
    const centerOffset = loopWidth * sideCopies
    scroller.scrollLeft = centerOffset + relative
    loopWidthRef.current = loopWidth
    centerOffsetRef.current = centerOffset
  }, [items.length, sideCopies])

  useEffect(() => {
    if (prefersReducedMotion || items.length === 0) return
    let frame = 0
    let previous = performance.now()
    const tick = (timestamp: number) => {
      const scroller = scrollerRef.current
      const loopWidth = originalRef.current?.scrollWidth ?? 0
      const mayAutoplay = !isTouching.current && !isMouseDragging.current && timestamp >= resumeAutoplayAt.current
      if (scroller && loopWidth > 0 && mayAutoplay) {
        touchMomentumPending.current = false
        const centeredPosition = recenterAcademicTicker(scroller.scrollLeft, loopWidth, sideCopies)
        const centerOffset = loopWidth * sideCopies
        scroller.scrollLeft = centerOffset + advanceAcademicTicker(centeredPosition - centerOffset, Math.min(timestamp - previous, 100), loopWidth)
        loopWidthRef.current = loopWidth
        centerOffsetRef.current = centerOffset
      }
      previous = timestamp
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [items.length, prefersReducedMotion, sideCopies])

  if (!items.length) return null

  const suppressNavigationAfterDrag = (moved: boolean) => {
    if (moved) suppressClickUntil.current = performance.now() + 350
  }
  const finishMouseInteraction = (moved: boolean) => {
    suppressNavigationAfterDrag(moved)
    isMouseDragging.current = false
    pointer.current.id = -1
    resumeAutoplayAt.current = performance.now()
  }
  const finishTouchInteraction = () => {
    suppressNavigationAfterDrag(touch.current.moved)
    isTouching.current = false
    touchMomentumPending.current = true
    touch.current.id = -1
    resumeAutoplayAt.current = performance.now() + ACADEMIC_TICKER_TOUCH_RESUME_DELAY_MS
  }
  const content = (copyIndex: number) => {
    const duplicate = copyIndex !== sideCopies
    return <div key={`loop-${copyIndex}`} ref={duplicate ? undefined : originalRef} className="flex shrink-0 items-center" aria-hidden={duplicate || undefined}>
    {items.map((item) => <button
      key={`${duplicate ? "duplicate" : "original"}-${item.key}`}
      type="button"
      tabIndex={duplicate ? -1 : 0}
      onClick={() => {
        if (performance.now() < suppressClickUntil.current) return
        if (item.action) onNavigate(item.action)
      }}
      className="academic-ticker-item min-h-11 shrink-0 whitespace-nowrap px-4 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
    >
      <span className="mr-1 font-semibold text-primary">{item.tickerLabel ?? LABELS[item.kind]} ·</span>{item.tickerMessage ?? item.message}<span className="ml-4 text-muted-foreground" aria-hidden>•</span>
    </button>)}
    </div>
  }

  return <section className="academic-ticker flex min-w-0 border-b border-primary/15 bg-primary/[0.06]" aria-label={`Actualidad académica: ${items[0].message}`}>
    <div
      ref={scrollerRef}
      className="academic-ticker-scroller min-w-0 flex-1 touch-auto overflow-x-auto"
      onTouchStart={(event) => {
        const scroller = scrollerRef.current
        const contact = event.changedTouches[0]
        if (!scroller || !contact) return
        isTouching.current = true
        touchMomentumPending.current = false
        touch.current = { id: contact.identifier, x: contact.clientX, scrollLeft: scroller.scrollLeft, moved: false }
      }}
      onTouchMove={(event) => {
        const contact = Array.from(event.changedTouches).find((entry) => entry.identifier === touch.current.id)
        if (!contact || !scrollerRef.current) return
        touch.current.moved ||= hasAcademicTickerInteractionMoved(
          touch.current.x,
          contact.clientX,
          scrollerRef.current.scrollLeft - touch.current.scrollLeft,
        )
      }}
      onTouchEnd={(event) => {
        if (event.touches.length === 0) finishTouchInteraction()
      }}
      onTouchCancel={finishTouchInteraction}
      onScroll={(event) => {
        if (isTouching.current) {
          touch.current.moved ||= hasAcademicTickerInteractionMoved(
            touch.current.x,
            touch.current.x,
            event.currentTarget.scrollLeft - touch.current.scrollLeft,
          )
        }
        if (touchMomentumPending.current) {
          resumeAutoplayAt.current = performance.now() + ACADEMIC_TICKER_TOUCH_RESUME_DELAY_MS
        }
      }}
      onPointerDown={(event) => {
        if (event.pointerType === "touch" || !shouldManuallyDragAcademicTicker(event.pointerType)) return
        const scroller = scrollerRef.current
        if (!scroller) return
        pointer.current = { id: event.pointerId, x: event.clientX, scrollLeft: scroller.scrollLeft, moved: false }
        isMouseDragging.current = true
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (pointer.current.id !== event.pointerId) return
        const movement = event.clientX - pointer.current.x
        pointer.current.moved ||= hasAcademicTickerInteractionMoved(pointer.current.x, event.clientX, 0)
        if (movement !== 0 && scrollerRef.current) scrollerRef.current.scrollLeft = academicTickerDragOffset(pointer.current.x, event.clientX, pointer.current.scrollLeft)
      }}
      onPointerUp={(event) => {
        if (pointer.current.id !== event.pointerId) return
        finishMouseInteraction(pointer.current.moved)
      }}
      onPointerCancel={(event) => {
        if (event.pointerType !== "touch") finishMouseInteraction(true)
      }}
    >
      <div className="academic-ticker-track flex w-max">{Array.from({ length: sideCopies * 2 + 1 }, (_, copyIndex) => content(copyIndex))}</div>
    </div>
  </section>
}
