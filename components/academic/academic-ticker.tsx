"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import type { HorarilyCompanionMessage } from "@/domain/horarily-companion"
import { advanceAcademicTicker, academicTickerDragOffset, isAcademicTickerDrag } from "@/domain/academic-ticker-scroll"
import type { AppTab } from "@/components/app-shell/navigation"

const LABELS: Record<HorarilyCompanionMessage["kind"], string> = {
  "current-class": "AHORA", "next-class": "CLASE", assessment: "EVALUACIÓN", assignment: "ENTREGA",
  event: "EVENTO", overdue: "URGENTE", reminder: "PENDIENTE", "day-summary": "HOY",
  attention: "PENDIENTE", empty: "HOY",
}

export function AcademicTicker({ messages, onNavigate }: { messages: HorarilyCompanionMessage[]; onNavigate: (tab: AppTab) => void }) {
  const items = messages.filter((item) => item.kind !== "empty").slice(0, 8)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const originalRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const pointer = useRef({ id: -1, x: 0, scrollLeft: 0, moved: false, wasPaused: false })
  const [isPausedByUser, setIsPausedByUser] = useState(false)
  const [isPointerInteracting, setIsPointerInteracting] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setPrefersReducedMotion(query.matches)
    update(); query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    if (isPausedByUser || isPointerInteracting || prefersReducedMotion || items.length === 0) return
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
  }, [isPausedByUser, isPointerInteracting, items.length, prefersReducedMotion])

  useEffect(() => {
    const scroller = scrollerRef.current
    const width = originalRef.current?.scrollWidth ?? 0
    if (scroller && width > 0 && scroller.scrollLeft < width) scroller.scrollLeft = width
  }, [items.length])

  if (!items.length) return null

  const normalize = () => {
    const scroller = scrollerRef.current
    const width = originalRef.current?.scrollWidth ?? 0
    if (scroller && width > 0) scroller.scrollLeft = width + (((scroller.scrollLeft - width) % width) + width) % width
  }
  const nearestIndex = () => {
    const scroller = scrollerRef.current
    if (!scroller) return 0
    normalize()
    let best = 0
    let distance = Number.POSITIVE_INFINITY
    itemRefs.current.forEach((node, index) => {
      if (!node) return
      const candidate = Math.abs(node.offsetLeft - scroller.scrollLeft)
      if (candidate < distance) { best = index; distance = candidate }
    })
    return best
  }
  const moveTo = (direction: -1 | 1) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    setIsPausedByUser(true)
    const index = (nearestIndex() + direction + items.length) % items.length
    const target = itemRefs.current[index]
    if (target) scroller.scrollTo({ left: target.offsetLeft, behavior: prefersReducedMotion ? "auto" : "smooth" })
  }
  const content = (duplicate: boolean) => <div ref={duplicate ? undefined : originalRef} className="flex shrink-0 items-center" aria-hidden={duplicate || undefined}>
    {items.map((item, index) => <button
      ref={duplicate ? undefined : (node) => { itemRefs.current[index] = node }}
      key={`${duplicate ? "duplicate" : "original"}-${item.key}`}
      type="button"
      tabIndex={duplicate ? -1 : 0}
      onClick={() => item.action && onNavigate(item.action)}
      className="academic-ticker-item min-h-11 shrink-0 whitespace-nowrap px-4 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
    >
      <span className="mr-1 font-semibold text-primary">{LABELS[item.kind]} ·</span>{item.tickerMessage ?? item.message}<span className="ml-4 text-muted-foreground" aria-hidden>•</span>
    </button>)}
  </div>

  return <section className="academic-ticker flex min-w-0 border-b border-primary/15 bg-primary/[0.06]" aria-label={`Actualidad académica: ${items[0].message}`}>
    <div
      ref={scrollerRef}
      className="academic-ticker-scroller min-w-0 flex-1 touch-pan-y overflow-x-auto"
      onPointerDown={(event) => {
        const scroller = scrollerRef.current
        if (!scroller) return
        pointer.current = { id: event.pointerId, x: event.clientX, scrollLeft: scroller.scrollLeft, moved: false, wasPaused: isPausedByUser }
        setIsPointerInteracting(true)
        setIsPausedByUser(true)
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
        const freeAreaTap = !pointer.current.moved && !(event.target as HTMLElement).closest("button")
        if (freeAreaTap) setIsPausedByUser(!pointer.current.wasPaused)
        setIsPointerInteracting(false)
        pointer.current.id = -1
      }}
      onPointerCancel={() => { setIsPointerInteracting(false); setIsPausedByUser(true); pointer.current.id = -1 }}
    >
      <div className="academic-ticker-track flex w-max">{content(true)}{content(false)}{content(true)}</div>
    </div>
    <div className="flex shrink-0 items-center border-l border-primary/15 bg-background/90" aria-label="Controles de noticias académicas">
      <button type="button" className="grid size-11 place-items-center text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary" aria-label="Anterior" onClick={() => moveTo(-1)}><ChevronLeft className="size-4" /></button>
      <button type="button" className="grid size-11 place-items-center text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary" aria-label={isPausedByUser || prefersReducedMotion ? "Reanudar noticias académicas" : "Pausar noticias académicas"} onClick={() => setIsPausedByUser((value) => !value)}>{isPausedByUser || prefersReducedMotion ? <Play className="size-4" /> : <Pause className="size-4" />}</button>
      <button type="button" className="grid size-11 place-items-center text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary" aria-label="Siguiente" onClick={() => moveTo(1)}><ChevronRight className="size-4" /></button>
    </div>
  </section>
}
