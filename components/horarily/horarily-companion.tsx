"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowRight } from "lucide-react"
import { loadHorarilyMasterSvg, useHorarlyLayers } from "@/hooks/useHorarily"
import type { AppTab } from "@/components/app-shell/navigation"

export function HorarilyCompanion({ message, action, onNavigate }: {
  message: string
  action?: Extract<AppTab, "horario" | "recordatorios" | "notas" | "materias">
  onNavigate: (tab: AppTab) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  useHorarlyLayers(svgRef, loaded ? "IDLE" : "PENSANDO")

  useEffect(() => {
    let active = true
    if (svgRef.current) void loadHorarilyMasterSvg(svgRef.current).then((ok) => {
      if (!active) return
      setLoaded(ok)
      setFailed(!ok)
    })
    return () => { active = false }
  }, [])

  return <div className="flex min-w-0 items-center gap-2.5" data-testid="horarily-companion">
    {failed ? <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary" role="img" aria-label="Horarily">H</div> :
      <svg ref={svgRef} viewBox="180 140 310 530" role="img" aria-label="Horarily, tu compañero académico" className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16" />}
    <div className="relative min-w-0 max-w-xl rounded-xl border border-primary/20 bg-card/75 px-3 py-2 shadow-sm" role="status" aria-live="polite">
      <span className="absolute -left-1.5 top-5 size-3 rotate-45 border-b border-l border-primary/20 bg-card" aria-hidden="true" />
      <p className="text-[11px] leading-4 text-foreground sm:text-xs sm:leading-5">{message}</p>
      {action && <button type="button" onClick={() => onNavigate(action)} className="mt-1 inline-flex min-h-6 items-center gap-1 text-[11px] font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {action === "horario" ? "Ver horario" : action === "recordatorios" ? "Ver pendientes" : action === "notas" ? "Ver notas" : "Ver materias"}<ArrowRight className="size-3" />
      </button>}
    </div>
  </div>
}
