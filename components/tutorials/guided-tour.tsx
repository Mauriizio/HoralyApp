"use client"

import { useEffect, useRef, useState } from "react"
import { Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HorarilyGuide } from "@/components/horarily/horarily-guide"
import type { TutorialDefinition } from "@/lib/tutorials"

export function GuidedTour({
  definition,
  currentStep,
  onStepChange,
  onSkip,
  onFinish,
}: {
  definition: TutorialDefinition
  currentStep: number
  onStepChange: (step: number) => void
  onSkip: () => void
  onFinish: () => void
}) {
  const step = definition.steps[currentStep]
  const panelRef = useRef<HTMLDivElement>(null)
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    panelRef.current?.focus()
    const target = step?.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null
    target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" })
    target?.setAttribute("data-tour-active", "true")
    return () => target?.removeAttribute("data-tour-active")
  }, [step])

  useEffect(() => () => window.speechSynthesis?.cancel(), [])
  if (!step) return null

  const toggleAudio = () => {
    if (!("speechSynthesis" in window)) return
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    const utterance = new SpeechSynthesisUtterance(`${step.title}. ${step.description}`)
    utterance.lang = "es-CL"
    utterance.onend = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
    setSpeaking(true)
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/45 backdrop-blur-[1px]" role="presentation" onKeyDown={(event) => { if (event.key === "Escape") onSkip() }}>
      <section ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="guided-tour-title" aria-describedby="guided-tour-description" className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] mx-auto max-w-xl rounded-2xl border bg-card p-4 shadow-xl outline-none md:bottom-6 md:p-5">
        <div className="grid grid-cols-[76px_1fr] gap-3">
          <HorarilyGuide message="" state={currentStep === definition.steps.length - 1 ? "success" : "attentive"} compact />
          <div>
            <p className="text-xs font-medium text-primary" aria-live="polite">Paso {currentStep + 1} de {definition.steps.length}</p>
            <h2 id="guided-tour-title" className="mt-1 text-lg font-semibold">{step.title}</h2>
            <p id="guided-tour-description" className="mt-1 text-sm text-muted-foreground">{step.description}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={toggleAudio}>{speaking ? <VolumeX className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}{speaking ? "Detener" : "Escuchar"}</Button>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onSkip}>Saltar</Button>
            <Button variant="outline" size="sm" disabled={currentStep === 0} onClick={() => onStepChange(currentStep - 1)}>Atrás</Button>
            {currentStep < definition.steps.length - 1
              ? <Button size="sm" onClick={() => onStepChange(currentStep + 1)}>Siguiente</Button>
              : <Button size="sm" onClick={onFinish}>Finalizar</Button>}
          </div>
        </div>
      </section>
    </div>
  )
}
