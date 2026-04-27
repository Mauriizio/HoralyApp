import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import {
  type HorarlyAnimationState,
  type HorarilyLayerConfig,
  getLayersForState,
  resolveHorarlyState,
} from "@/hooks/horarilySpriteConfig"

export function useHorarlyBlink(svgRef: RefObject<SVGSVGElement | null>, intervalMs: number) {
  useEffect(() => {
    if (intervalMs === 0 || !svgRef.current) return

    let intervalId: ReturnType<typeof setInterval> | null = null

    const blink = () => {
      const eyes = svgRef.current?.getElementById("ojos")
      if (!eyes) return
      eyes.classList.add("blinking")
      setTimeout(() => eyes.classList.remove("blinking"), 220)
    }

    const initialDelay = Math.random() * intervalMs
    const timeoutId = setTimeout(() => {
      blink()
      intervalId = setInterval(blink, intervalMs + Math.random() * 800)
    }, initialDelay)

    return () => {
      clearTimeout(timeoutId)
      if (intervalId) clearInterval(intervalId)
    }
  }, [svgRef, intervalMs])
}

export function useHorarilySpeech(
  svgRef: RefObject<SVGSVGElement | null>,
  options: {
    isSpeaking: boolean
    message: string
    onChar?: (text: string) => void
    charDelay?: number
  },
) {
  const { isSpeaking, message, onChar, charDelay = 38 } = options
  const mouthIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mouthOpenRef = useRef(false)

  const startMouthAnim = useCallback(() => {
    if (!svgRef.current) return
    mouthIntervalRef.current = setInterval(() => {
      const boca = svgRef.current?.getElementById("boca")
      const bocaRiendo = svgRef.current?.getElementById("boca-riendo")
      if (!boca || !bocaRiendo) return

      mouthOpenRef.current = !mouthOpenRef.current
      if (mouthOpenRef.current) {
        boca.classList.remove("horarily-layer-visible")
        bocaRiendo.classList.add("horarily-layer-visible")
      } else {
        bocaRiendo.classList.remove("horarily-layer-visible")
        boca.classList.add("horarily-layer-visible")
      }
    }, 280)
  }, [svgRef])

  const stopMouthAnim = useCallback(() => {
    if (mouthIntervalRef.current) {
      clearInterval(mouthIntervalRef.current)
      mouthIntervalRef.current = null
    }

    const boca = svgRef.current?.getElementById("boca")
    const bocaRiendo = svgRef.current?.getElementById("boca-riendo")
    if (boca) boca.classList.add("horarily-layer-visible")
    if (bocaRiendo) bocaRiendo.classList.remove("horarily-layer-visible")
    mouthOpenRef.current = false
  }, [svgRef])

  useEffect(() => {
    if (isSpeaking && message) {
      startMouthAnim()

      let i = 0
      typewriterRef.current = setInterval(() => {
        i += 1
        onChar?.(message.slice(0, i))
        if (i >= message.length) {
          if (typewriterRef.current) {
            clearInterval(typewriterRef.current)
            typewriterRef.current = null
          }
          stopMouthAnim()
        }
      }, charDelay)
    } else {
      stopMouthAnim()
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current)
        typewriterRef.current = null
      }
    }

    return () => {
      stopMouthAnim()
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current)
        typewriterRef.current = null
      }
    }
  }, [isSpeaking, message, onChar, charDelay, startMouthAnim, stopMouthAnim])
}

export function useHorarlyLayers(svgRef: RefObject<SVGSVGElement | null>, state: HorarlyAnimationState) {
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const config: HorarilyLayerConfig = getLayersForState(state)

    config.visible.forEach((id) => {
      const el = svg.getElementById(id)
      if (el) el.classList.add("horarily-layer-visible")
    })

    config.hidden.forEach((id) => {
      const el = svg.getElementById(id)
      if (el) el.classList.remove("horarily-layer-visible")
    })

    const wrapper = svg.parentElement
    if (wrapper) wrapper.classList.toggle("horarily-float", config.bodyFloat)

    const animClasses = ["anim-idle-swing", "anim-talking", "anim-wave", "anim-excited", "anim-write", "anim-droopy"]
    animClasses.forEach((className) => svg.classList.remove(className))
    svg.classList.add(`anim-${config.brazoIzqAnim}`)

    const stateClasses = ["state-sorprendido", "state-pensando", "state-feliz", "state-triste"]
    stateClasses.forEach((className) => svg.classList.remove(className))
    svg.classList.add(`state-${state.toLowerCase()}`)
  }, [svgRef, state])
}

export function useHorarlyState(svgRef: RefObject<SVGSVGElement | null>) {
  const [state, setState] = useState<HorarlyAnimationState>("IDLE")
  const [displayText, setDisplayText] = useState("")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [message, setMessageInternal] = useState("")

  const config = getLayersForState(state)

  useHorarlyLayers(svgRef, state)
  useHorarlyBlink(svgRef, config.blinkInterval)

  useHorarilySpeech(svgRef, {
    isSpeaking,
    message,
    onChar: setDisplayText,
    charDelay: 38,
  })

  const speak = useCallback((msg: string, returnToState: HorarlyAnimationState = "IDLE") => {
    setState("HABLANDO")
    setMessageInternal(msg)
    setIsSpeaking(true)
    setDisplayText("")

    const duration = msg.length * 38 + 500
    setTimeout(() => {
      setIsSpeaking(false)
      setState(returnToState)
    }, duration)
  }, [])

  const setContext = useCallback((ctx: Parameters<typeof resolveHorarlyState>[0]) => {
    setState(resolveHorarlyState(ctx))
  }, [])

  return {
    state,
    setState,
    displayText,
    isSpeaking,
    speak,
    setContext,
  }
}
