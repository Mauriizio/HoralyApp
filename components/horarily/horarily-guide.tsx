"use client"

import { useEffect, useRef, useState } from "react"
import { loadHorarilyMasterSvg, useHorarlyLayers } from "@/hooks/useHorarily"

export function HorarilyGuide({
  message,
  state,
  compact = false,
}: {
  message: string
  state: "attentive" | "writing" | "success"
  compact?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const animationState = state === "success" ? "FELIZ" : state === "writing" ? "ESCRIBIENDO" : "IDLE"
  useHorarlyLayers(svgRef, loaded ? animationState : "PENSANDO")

  useEffect(() => {
    if (!svgRef.current) return
    let active = true
    void loadHorarilyMasterSvg(svgRef.current).then((loaded) => {
      if (!active) return
      setLoaded(loaded)
      if (!loaded) setFailed(true)
    })
    return () => { active = false }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center md:sticky md:top-6">
      {!failed ? (
        <svg
          ref={svgRef}
          viewBox="180 140 310 530"
          role="img"
          aria-label="Horarily, tu guía académica"
          className={`horarily-guide-mascot object-contain horarily-guide-${state} ${compact ? "h-16 w-16" : "h-36 w-36 sm:h-44 sm:w-44 md:h-64 md:w-64"}`}
        />
      ) : (
        <div className="grid h-36 w-36 place-items-center rounded-full border bg-primary/10 text-4xl" role="img" aria-label="Horarily">H</div>
      )}
      {message && <div className="relative max-w-sm rounded-2xl border bg-background p-4 text-left text-sm shadow-sm" role="status" aria-live="polite">
        {message}
      </div>}
    </div>
  )
}
