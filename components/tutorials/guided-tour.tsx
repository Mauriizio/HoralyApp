"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ArrowLeft, ArrowRight, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HorarilyGuide } from "@/components/horarily/horarily-guide"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"
import { calculateTourCompositionPosition } from "@/lib/tutorial-positioning"
import type { TutorialDefinition } from "@/lib/tutorials"

export const TOUR_LAYERS = {
  BACKDROP: 700,
  TARGET_RING: 710,
  POINTER: 720,
  MASCOT: 730,
  BUBBLE: 740,
  APP_DIALOG: 800,
} as const

type TargetRect = { top: number; left: number; width: number; height: number }

function waitForTourTarget(target: string, timeout = 1800): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const started = performance.now()
    const find = () => {
      const element = document.querySelector<HTMLElement>(`[data-tour="${target}"]`)
      if (element || performance.now() - started >= timeout) return resolve(element)
      requestAnimationFrame(find)
    }
    find()
  })
}

function rectOf(element: HTMLElement): TargetRect {
  const rect = element.getBoundingClientRect()
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
}

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
  const actionLockRef = useRef(false)
  const targetRef = useRef<HTMLElement | null>(null)
  const [mounted, setMounted] = useState(false)
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
  const [bubbleSize, setBubbleSize] = useState({ width: 430, height: 300 })
  const [actionComplete, setActionComplete] = useState(step?.type !== "action")
  const [mobile, setMobile] = useState(false)
  const [pausedByDialog, setPausedByDialog] = useState(false)
  const speech = useSpeechSynthesis()

  const updateRect = useCallback(() => {
    const element = targetRef.current
    setTargetRect(element?.isConnected ? rectOf(element) : null)
    setMobile(window.matchMedia("(max-width: 767px)").matches)
  }, [])

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const update = () => setPausedByDialog(Boolean(document.querySelector('[data-app-dialog][data-state="open"]')))
    const observer = new MutationObserver(update)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-state"] })
    update()
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!step) return
    let disposed = false
    let observer: ResizeObserver | null = null
    setActionComplete(step.type !== "action")
    speech.stop()
    void (async () => {
      const target = step.target ? await waitForTourTarget(step.target) : null
      if (disposed) return
      targetRef.current = target
      if (!target && process.env.NODE_ENV === "development" && step.target) console.warn(`[Horarily tour] Target no encontrado: ${step.target}`)
      if (!target && step.type === "action") setActionComplete(true)
      target?.setAttribute("data-tour-active", "true")
      target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" })
      updateRect()
      if (target && "ResizeObserver" in window) {
        observer = new ResizeObserver(updateRect)
        observer.observe(target)
      }
      requestAnimationFrame(updateRect)
      if (step.type === "information") panelRef.current?.focus()
    })()
    window.addEventListener("resize", updateRect)
    window.addEventListener("scroll", updateRect, true)
    window.visualViewport?.addEventListener("resize", updateRect)
    window.visualViewport?.addEventListener("scroll", updateRect)
    return () => {
      disposed = true
      observer?.disconnect()
      window.removeEventListener("resize", updateRect)
      window.removeEventListener("scroll", updateRect, true)
      window.visualViewport?.removeEventListener("resize", updateRect)
      window.visualViewport?.removeEventListener("scroll", updateRect)
      targetRef.current?.removeAttribute("data-tour-active")
      targetRef.current = null
      setTargetRect(null)
    }
  }, [step, speech.stop, updateRect])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel || !("ResizeObserver" in window)) return
    const update = () => {
      const rect = panel.getBoundingClientRect()
      setBubbleSize({ width: Math.min(430, rect.width), height: rect.height })
    }
    const observer = new ResizeObserver(update)
    observer.observe(panel)
    update()
    return () => observer.disconnect()
  }, [mounted, pausedByDialog, step])

  useEffect(() => {
    if (!step?.requiredEvent) return
    const handle = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string }>).detail
      if (detail?.type !== step.requiredEvent) return
      setActionComplete(true)
      if (currentStep < definition.steps.length - 1) requestAnimationFrame(() => onStepChange(currentStep + 1))
    }
    window.addEventListener("horarily:tutorial-action", handle)
    return () => window.removeEventListener("horarily:tutorial-action", handle)
  }, [currentStep, definition.steps.length, onStepChange, step?.requiredEvent])

  const once = useCallback((action: () => void) => {
    if (actionLockRef.current) return
    actionLockRef.current = true
    speech.stop()
    action()
    requestAnimationFrame(() => { actionLockRef.current = false })
  }, [speech])

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") once(onSkip)
    }
    window.addEventListener("keydown", escape)
    return () => window.removeEventListener("keydown", escape)
  }, [onSkip, once])

  if (!mounted || !step || pausedByDialog) return null
  const viewport = window.visualViewport
  const viewportOffsetLeft = viewport?.offsetLeft ?? 0
  const viewportOffsetTop = viewport?.offsetTop ?? 0
  const viewportWidth = viewport?.width ?? window.innerWidth
  const viewportHeight = viewport?.height ?? window.innerHeight
  const mascotSize = mobile && viewportHeight < 500 ? 56 : mobile ? 80 : 112
  const placement = calculateTourCompositionPosition(
    targetRect
      ? { ...targetRect, left: targetRect.left - viewportOffsetLeft, top: targetRect.top - viewportOffsetTop }
      : { left: 16, top: 16, width: 0, height: 0 },
    { width: viewportWidth, height: viewportHeight },
    {
      bubbleWidth: mobile ? Math.min(430, viewportWidth - 32) : bubbleSize.width,
      bubbleHeight: bubbleSize.height,
      mascotWidth: mascotSize,
      mascotHeight: mascotSize,
      gap: 10,
      safeMargin: 16,
    },
  )
  const ring = targetRect ? { top: targetRect.top - 6, left: targetRect.left - 6, width: targetRect.width + 12, height: targetRect.height + 12 } : null
  const pointsLeft = Boolean(targetRect && placement.left > targetRect.left)

  return createPortal(
    <div data-guided-tour="true">
      <div className="pointer-events-none fixed inset-0 bg-background/55 backdrop-blur-[1px]" style={{ zIndex: TOUR_LAYERS.BACKDROP }} aria-hidden="true" />
      {ring && <div className="pointer-events-none fixed rounded-xl border-2 border-primary shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_22%,transparent),0_0_28px_color-mix(in_srgb,var(--primary)_45%,transparent)]" style={{ ...ring, zIndex: TOUR_LAYERS.TARGET_RING }} aria-hidden="true" />}
      {ring && step.type === "action" && (
        <div className="pointer-events-none fixed flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground shadow-lg motion-safe:animate-pulse" style={{ top: Math.max(8, ring.top - 34), left: ring.left, zIndex: TOUR_LAYERS.POINTER }}>
          {pointsLeft ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />} Haz clic aquí
        </div>
      )}
      <div
        className="pointer-events-none fixed"
        data-tour-composition={placement.layout}
        style={{ left: placement.left + viewportOffsetLeft, top: placement.top + viewportOffsetTop, width: placement.width, height: placement.height, zIndex: TOUR_LAYERS.MASCOT }}
      >
        <div
          className="pointer-events-none absolute md:h-28 md:w-28"
          style={{ left: placement.mascotLeft, top: placement.mascotTop, width: mascotSize, height: mascotSize }}
        >
          <HorarilyGuide message="" state={currentStep === definition.steps.length - 1 ? "success" : "attentive"} compact />
        </div>
        <span
          className="pointer-events-none absolute h-4 w-4 rotate-45 border-b-2 border-r-2 border-primary bg-card"
          style={{ left: placement.bubbleLeft + 20, top: placement.bubbleTop + bubbleSize.height - 8, zIndex: TOUR_LAYERS.BUBBLE + 1 }}
          aria-hidden="true"
        />
        <section
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="false"
          aria-labelledby="guided-tour-title"
          aria-describedby="guided-tour-description"
          className="pointer-events-auto absolute overflow-y-auto rounded-2xl border-2 border-primary bg-card p-4 text-card-foreground shadow-2xl outline-none md:p-5"
          style={{ left: placement.bubbleLeft, top: placement.bubbleTop, width: placement.bubbleWidth, maxHeight: Math.max(180, viewportHeight - mascotSize - 42), zIndex: TOUR_LAYERS.BUBBLE }}
        >
          <p className="text-xs font-medium text-primary" aria-live="polite">Paso {currentStep + 1} de {definition.steps.length}</p>
          <h2 id="guided-tour-title" className="mt-1 text-lg font-semibold">{step.title}</h2>
          <p id="guided-tour-description" className="mt-1 text-sm text-muted-foreground">{step.description}</p>
          {step.type === "action" && !actionComplete && <p className="mt-2 text-sm font-medium text-primary">{step.actionLabel ?? "Completa la acción señalada para continuar."}</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" size="sm" disabled={!speech.supported || speech.state === "unavailable"} onClick={() => speech.state === "speaking" ? speech.stop() : speech.speak(`${step.title}. ${step.description}`)}>
              {speech.state === "speaking" ? <VolumeX className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}
              {speech.state === "speaking" ? "Detener" : speech.state === "unavailable" ? "Voz no disponible" : "Escuchar"}
            </Button>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => once(onSkip)}>Saltar</Button>
              <Button variant="outline" size="sm" disabled={currentStep === 0} onClick={() => once(() => onStepChange(currentStep - 1))}>Atrás</Button>
              {currentStep < definition.steps.length - 1
                ? <Button size="sm" aria-disabled={!actionComplete} onClick={() => actionComplete && once(() => onStepChange(currentStep + 1))}>{actionComplete ? "Siguiente" : "Completa la acción"}</Button>
                : <Button size="sm" onClick={() => once(onFinish)}>Finalizar</Button>}
            </div>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  )
}
