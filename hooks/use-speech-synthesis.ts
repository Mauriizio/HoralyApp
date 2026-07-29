"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type SpeechState = "idle" | "speaking" | "unavailable" | "error"

function voiceScore(voice: SpeechSynthesisVoice): number {
  const language = voice.lang.toLowerCase()
  if (language === "es-cl") return 4
  if (language === "es-419") return 3
  if (language === "es-es") return 2
  if (language.startsWith("es")) return 1
  return 0
}

export function selectPreferredSpeechVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  return [...voices].sort((left, right) => voiceScore(right) - voiceScore(left))[0]
}

export function useSpeechSynthesis() {
  const [state, setState] = useState<SpeechState>("idle")
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const supported = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel()
    utteranceRef.current = null
    setState("idle")
  }, [supported])

  useEffect(() => {
    if (!supported) {
      setState("unavailable")
      return
    }
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices())
    loadVoices()
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices)
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices)
      window.speechSynthesis.cancel()
      utteranceRef.current = null
    }
  }, [supported])

  const speak = useCallback((text: string) => {
    if (!supported) return setState("unavailable")
    window.speechSynthesis.cancel()
    if (window.speechSynthesis.paused) window.speechSynthesis.resume()
    const utterance = new SpeechSynthesisUtterance(text)
    const available = voices.length > 0 ? voices : window.speechSynthesis.getVoices()
    const selected = selectPreferredSpeechVoice(available)
    if (selected) {
      utterance.voice = selected
      utterance.lang = selected.lang
    } else utterance.lang = "es-CL"
    utterance.rate = 0.95
    utterance.pitch = 1
    utterance.volume = 1
    utterance.onstart = () => setState("speaking")
    utterance.onend = () => {
      utteranceRef.current = null
      setState("idle")
    }
    utterance.onerror = (event) => {
      utteranceRef.current = null
      setState(event.error === "canceled" || event.error === "interrupted" ? "idle" : "error")
    }
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [supported, voices])

  return { state, supported, speak, stop }
}
