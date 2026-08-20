"use client"

import { useEffect, useRef, useState } from "react"
import type { HorarilyCompanionMessage } from "@/domain/horarily-companion"
import { advanceAcademicTicker, academicTickerDragOffset, isAcademicTickerDrag } from "@/domain/academic-ticker-scroll"
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
  const suppressClick = useRef(false)
  const [isPointerInteracting, setIsPointerInteracting] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setPrefersReducedMotion(query.matches)
    update(); query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    if (isPointerInteracting || prefersReducedMotion || items.length === 0) return
    let frame = 0
    let previous = performance.now()
    const tick = (timestamp: number) => {
      const scroller = scrollerRef.current
      const loopWidth = originalRef.current?.scrollWidth ?? 0
      if (scroller && loopWidth > 0) scroller.scrollLeft = loopWidth + advanceAcademicTicker(scroller.scrollLeft - loopWidth, Math.min(timestamp - previous, 100), loopWidth)
      previous = timestamp
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isPointerInteracting, items.length, prefersReducedMotion])

  useEffect(() => {
    const scroller = scrollerRef.current
    const width = originalRef.current?.scrollWidth ?? 0
    if (scroller && width > 0 && scroller.scrollLeft < width) scroller.scrollLeft = width
  }, [items.length])

  if (!items.length) return null

  const finishInteraction = (moved: boolean) => {
    suppressClick.current = moved
    setIsPointerInteracting(false)
    pointer.current.id = -1
    globalThis.setTimeout(() => { suppressClick.current = false }, 0)
  }
  const content = (duplicate: boolean) => <div ref={duplicate ? undefined : originalRef} className="flex shrink-0 items-center" aria-hidden={duplicate || undefined}>
    {items.map((item) => <button
      key={`${duplicate ? "duplicate" : "original"}-${item.key}`}
      type="button"
      tabIndex={duplicate ? -1 : 0}
      onClick={() => {
        if (suppressClick.current) return
        if (item.action) onNavigate(item.action)
      }}
      className="academic-ticker-item min-h-11 shrink-0 whitespace-nowrap px-4 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
    >
      <span className="mr-1 font-semibold text-primary">{item.tickerLabel ?? LABELS[item.kind]} ·</span>{item.tickerMessage ?? item.message}<span className="ml-4 text-muted-foreground" aria-hidden>•</span>
    </button>)}
  </div>

  return <section className="academic-ticker flex min-w-0 border-b border-primary/15 bg-primary/[0.06]" aria-label={`Actualidad académica: ${items[0].message}`}>
    <div
      ref={scrollerRef}
      className="academic-ticker-scroller min-w-0 flex-1 touch-pan-y overflow-x-auto"
      onPointerDown={(event) => {
        const scroller = scrollerRef.current
        if (!scroller) return
        pointer.current = { id: event.pointerId, x: event.clientX, scrollLeft: scroller.scrollLeft, moved: false }
        setIsPointerInteracting(true)
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (pointer.current.id !== event.pointerId) return
        const movement = event.clientX - pointer.current.x
        if (isAcademicTickerDrag(movement)) pointer.current.moved = true
        if (pointer.current.moved && scrollerRef.current) scrollerRef.current.scrollLeft = academicTickerDragOffset(pointer.current.x, event.clientX, pointer.current.scrollLeft)
      }}
      onPointerUp={(event) => {
        if (pointer.current.id !== event.pointerId) return
        finishInteraction(pointer.current.moved)
      }}
      onPointerCancel={() => finishInteraction(true)}
    >
      <div className="academic-ticker-track flex w-max">{content(true)}{content(false)}{content(true)}</div>
    </div>
  </section>
}
