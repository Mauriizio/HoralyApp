"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import { loadHorarilyMasterSvg, useHorarlyLayers } from "@/hooks/useHorarily"
import type { AppTab } from "@/components/app-shell/navigation"
import type { HorarilyCompanionMessage } from "@/domain/horarily-companion"
import { startCompanionRotation } from "@/domain/companion-rotation"

const FALLBACK_ACTIONS: Record<NonNullable<HorarilyCompanionMessage["action"]>, string> = {
  horario: "Ver horario", recordatorios: "Ver pendiente", notas: "Ver notas", materias: "Ver materias",
}

export function HorarilyCompanion({ messages, onNavigate, suspended = false }: {
  messages: HorarilyCompanionMessage[]
  onNavigate: (tab: AppTab) => void
  suspended?: boolean
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const scrollResumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [index, setIndex] = useState(0)
  const [interacting, setInteracting] = useState(false)
  const [rotationEpoch, setRotationEpoch] = useState(0)
  const count = messages.length
  const message = messages[index % Math.max(count, 1)] ?? messages[0]
  useHorarlyLayers(svgRef, loaded ? "IDLE" : "PENSANDO")

  useEffect(() => {
    let active = true
    if (svgRef.current) void loadHorarilyMasterSvg(svgRef.current).then((ok) => {
      if (!active) return
      setLoaded(ok); setFailed(!ok)
    })
    return () => { active = false }
  }, [])

  useEffect(() => { setIndex(0) }, [messages])
  useEffect(() => startCompanionRotation({
    count,
    intervalMs: 5_000,
    isPaused: () => interacting || suspended,
    onAdvance: () => setIndex((value) => (value + 1) % count),
  }), [count, interacting, rotationEpoch, suspended])
  useEffect(() => () => { if (scrollResumeTimer.current) clearTimeout(scrollResumeTimer.current) }, [])

  const move = (direction: -1 | 1) => {
    setIndex((value) => (value + direction + count) % count)
    setRotationEpoch((value) => value + 1)
  }
  const pauseForReading = () => {
    setInteracting(true)
    if (scrollResumeTimer.current) clearTimeout(scrollResumeTimer.current)
    scrollResumeTimer.current = setTimeout(() => setInteracting(false), 3_000)
  }

  return <div
    className="flex min-w-0 items-center gap-2.5"
    data-testid="horarily-companion"
    onMouseEnter={() => setInteracting(true)}
    onMouseLeave={() => setInteracting(false)}
    onPointerDown={() => setInteracting(true)}
    onPointerUp={() => setInteracting(false)}
    onPointerCancel={() => setInteracting(false)}
    onFocusCapture={() => setInteracting(true)}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false) }}
  >
    {failed ? <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary" role="img" aria-label="Horarily">H</div> :
      <svg ref={svgRef} viewBox="180 140 310 530" role="img" aria-label="Horarily, tu compañero académico" className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16" />}
    <div data-testid="horarily-message-card" className="relative flex h-[132px] min-w-0 w-full max-w-xl flex-col rounded-xl border border-primary/20 bg-card/75 px-3 py-2 shadow-sm sm:h-[116px]" aria-label="Mensaje de Horarily">
      <span className="absolute -left-1.5 top-5 size-3 rotate-45 border-b border-l border-primary/20 bg-card" aria-hidden="true" />
      <div key={message?.key} className="horarily-message-in min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1" onScroll={pauseForReading} tabIndex={0}>
        <p className="text-[13px] leading-[19px] text-foreground sm:text-sm sm:leading-5">{message?.message}</p>
      </div>
      <div className="flex h-9 shrink-0 items-end gap-1 border-t border-border/50 pt-1">
        {message?.action ? <button type="button" onClick={() => onNavigate(message.action!)} className="mr-auto inline-flex min-h-7 items-center gap-1 text-[11px] font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {message.actionLabel ?? FALLBACK_ACTIONS[message.action]}<ArrowRight className="size-3" />
        </button> : <span className="mr-auto" />}
        <button type="button" onClick={() => move(-1)} disabled={count < 2} className="grid size-8 place-items-center rounded-md text-primary hover:bg-primary/10 disabled:opacity-40" aria-label="Anterior"><ChevronLeft className="size-4" /></button>
        <span className="min-w-10 text-center text-[11px] tabular-nums text-muted-foreground" aria-label={`Mensaje ${index + 1} de ${count}`}>{index + 1} / {count}</span>
        <button type="button" onClick={() => move(1)} disabled={count < 2} className="grid size-8 place-items-center rounded-md text-primary hover:bg-primary/10 disabled:opacity-40" aria-label="Siguiente"><ChevronRight className="size-4" /></button>
      </div>
    </div>
  </div>
}
