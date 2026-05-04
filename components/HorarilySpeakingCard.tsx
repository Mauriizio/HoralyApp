"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { useHorarlyState } from "@/hooks/useHorarily"
import "@/styles/horarily-animations.css"

const REQUIRED_MASTER_IDS = [
  "cuerpo",
  "pies",
  "brazo-izq",
  "brazo-der",
  "ojos",
  "ojos-cerrados",
  "ojos-triste",
  "cejas",
  "cejas-riendo",
  "cejas-triste",
  "boca",
  "boca-riendo",
  "boca-triste",
  "lapiz",
] as const

interface HorarilySpeakingCardProps {
  message: string
  userName: string
  grade?: number
  isTyping?: boolean
  isUrgent?: boolean
  isLoading?: boolean
  autoSpeak?: boolean
  className?: string
  commandContext?: {
    nextClassText?: string
    subjects?: Array<{ id: string; name: string; commandKey?: string }>
    grades?: Array<{ subjectId: string; title: string; score: number; date: string }>
    remindersTodayCount?: number
  }
}

export function HorarilySpeakingCard({
  message,
  userName,
  grade,
  isTyping = false,
  isUrgent = false,
  isLoading = false,
  autoSpeak = true,
  className = "",
  commandContext,
}: HorarilySpeakingCardProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [usingMasterSvg, setUsingMasterSvg] = useState(false)
  const [booting, setBooting] = useState(true)
  const [history, setHistory] = useState<string[]>([])
  const [commandInput, setCommandInput] = useState("")
  const { displayText, speak, setContext } = useHorarlyState(svgRef)

  useEffect(() => {
    let isMounted = true

    const loadMasterSvg = async () => {
      try {
        const response = await fetch("/logo/horarily-master.svg")
        if (!response.ok || !svgRef.current) return

        const sourceText = await response.text()
        const parser = new DOMParser()
        const doc = parser.parseFromString(sourceText, "image/svg+xml")
        const sourceSvg = doc.querySelector("svg")
        if (!sourceSvg) return

        const hasAllRequiredIds = REQUIRED_MASTER_IDS.every((id) => sourceSvg.querySelector(`#${id}`))
        if (!hasAllRequiredIds) {
          console.warn(
            "[Horarily] horarily-master.svg no tiene todos los IDs requeridos. Se mantiene el placeholder animado.",
          )
          return
        }

        svgRef.current.innerHTML = sourceSvg.innerHTML
        const viewBox = sourceSvg.getAttribute("viewBox")
        if (viewBox) svgRef.current.setAttribute("viewBox", viewBox)

        if (isMounted) setUsingMasterSvg(true)
      } catch {
        // Fallback: se mantiene el SVG inline placeholder
      }
    }

    loadMasterSvg()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    setContext({
      isUserTyping: isTyping,
      isLoading,
      hasUrgentEvent: isUrgent,
      lastNoteGrade: grade,
      isSpeaking: false,
    })
  }, [isTyping, isLoading, isUrgent, grade, setContext, usingMasterSvg])

  useEffect(() => {
    if (!booting && autoSpeak && message) {
      speak(message)
    }
  }, [autoSpeak, message, speak, usingMasterSvg, booting])

  useEffect(() => {
    const timeoutId = setTimeout(() => setBooting(false), 3600)
    return () => clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    if (booting) return
    setHistory((prev) => {
      if (prev.length > 0) return prev
      return [
        "> BOOT OK",
        `> HOLA, ${userName.toUpperCase()}`,
        "> ESCRIBE /HELP PARA VER COMANDOS",
      ]
    })
  }, [booting, userName])

  useEffect(() => {
    if (booting || !displayText) return
    setHistory((prev) => {
      const next = `> ${displayText.toUpperCase()}`
      if (prev[prev.length - 1] === next) return prev
      return [...prev, next]
    })
  }, [displayText, booting])

  const runCommand = (raw: string) => {
    const normalized = raw.trim().toUpperCase()
    if (!normalized.startsWith("/")) {
      return "ERROR: EL COMANDO DEBE INICIAR CON /"
    }

    if (normalized === "/HELP") {
      return "COMANDOS: /HELP, /NEXTCLASS, /SUBJECTS, /MAXNOTE/<KEY>, /AVG/<KEY>, /LASTGRADE/<KEY>"
    }

    if (normalized === "/NEXTCLASS") {
      return commandContext?.nextClassText?.toUpperCase() ?? "NO HAY CLASES PENDIENTES HOY."
    }

    if (normalized === "/SUBJECTS") {
      const subjects = commandContext?.subjects ?? []
      if (subjects.length === 0) return "NO HAY MATERIAS REGISTRADAS."
      return `MATERIAS: ${subjects.map((s) => `${s.name.toUpperCase()}${s.commandKey ? `(/${s.commandKey.toUpperCase()})` : ""}`).join(", ")}`
    }

    if (normalized.startsWith("/MAXNOTE/")) {
      const key = normalized.replace("/MAXNOTE/", "").trim()
      if (!key) return "USA: /MAXNOTE/<KEY>"
      const subject = (commandContext?.subjects ?? []).find((s) => s.commandKey?.toUpperCase() === key)
      if (!subject) return `NO EXISTE MATERIA CON CLAVE ${key}.`
      const list = (commandContext?.grades ?? []).filter((g) => g.subjectId === subject.id)
      if (list.length === 0) return `NO HAY NOTAS REGISTRADAS PARA ${subject.name.toUpperCase()}.`
      const best = list.slice().sort((a, b) => b.score - a.score)[0]
      return `MAXNOTE ${key}: ${best.score.toFixed(1)} EN ${best.title.toUpperCase()} (${best.date}).`
    }

    if (normalized.startsWith("/AVG/")) {
      const key = normalized.replace("/AVG/", "").trim()
      const subject = (commandContext?.subjects ?? []).find((s) => s.commandKey?.toUpperCase() === key)
      if (!subject) return `NO EXISTE MATERIA CON CLAVE ${key}.`
      const list = (commandContext?.grades ?? []).filter((g) => g.subjectId === subject.id)
      if (list.length === 0) return `NO HAY NOTAS REGISTRADAS PARA ${subject.name.toUpperCase()}.`
      const avg = list.reduce((acc, g) => acc + g.score, 0) / list.length
      return `PROMEDIO ${key}: ${avg.toFixed(2)}`
    }

    if (normalized.startsWith("/LASTGRADE/")) {
      const key = normalized.replace("/LASTGRADE/", "").trim()
      const subject = (commandContext?.subjects ?? []).find((s) => s.commandKey?.toUpperCase() === key)
      if (!subject) return `NO EXISTE MATERIA CON CLAVE ${key}.`
      const list = (commandContext?.grades ?? [])
        .filter((g) => g.subjectId === subject.id)
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
      if (list.length === 0) return `NO HAY NOTAS REGISTRADAS PARA ${subject.name.toUpperCase()}.`
      return `ULTIMA NOTA ${key}: ${list[0].score.toFixed(1)} EN ${list[0].title.toUpperCase()} (${list[0].date}).`
    }

    return "COMANDO NO RECONOCIDO. USA /HELP"
  }

  const onSubmitCommand = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const value = commandInput.trim()
    if (!value) return
    const response = runCommand(value)
    setHistory((prev) => [...prev, `> ${value.toUpperCase()}`, response])
    setCommandInput("")
  }

  return (
    <div className={`horarily-card ${className}`}>
      <div className="horarily-svg-wrapper">
        <svg
          ref={svgRef}
          viewBox="180 140 310 530"
          xmlns="http://www.w3.org/2000/svg"
          className="horarily-svg"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="es-card" cx="30%" cy="30%" r="50%">
              <stop offset="0%" stopColor="#fff" stopOpacity="1" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>

          <g id="cuerpo">
            <rect x="200" y="160" width="280" height="390" rx="28" fill="#2563EB" />
            <rect x="200" y="160" width="280" height="85" rx="28" fill="#FF7043" />
            <rect x="200" y="215" width="280" height="30" fill="#F4511E" />
          </g>

          <g id="pies">
            <rect x="282" y="530" width="36" height="80" rx="14" fill="#2563EB" />
            <rect x="362" y="530" width="36" height="80" rx="14" fill="#2563EB" />
            <ellipse cx="300" cy="618" rx="32" ry="16" fill="#1A237E" />
            <ellipse cx="380" cy="618" rx="32" ry="16" fill="#1A237E" />
          </g>

          <g id="cejas">
            <path d="M268 392 Q293 380 318 392" stroke="#1A237E" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <path d="M362 392 Q387 380 412 392" stroke="#1A237E" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          </g>

          <g id="cejas-riendo">
            <path d="M264 385 Q292 370 320 385" stroke="#1A237E" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <path d="M360 385 Q388 370 416 385" stroke="#1A237E" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          </g>

          <g id="cejas-triste">
            <path d="M266 388 Q292 400 318 388" stroke="#1A237E" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M362 388 Q388 400 414 388" stroke="#1A237E" strokeWidth="5" strokeLinecap="round" fill="none" />
          </g>

          <g id="ojos">
            <ellipse cx="292" cy="418" rx="28" ry="30" fill="#fff" />
            <ellipse cx="296" cy="422" rx="18" ry="20" fill="#1A237E" />
            <ellipse cx="299" cy="425" rx="10" ry="12" fill="#0D0D0D" />
            <ellipse cx="292" cy="416" rx="5" ry="6" fill="url(#es-card)" opacity="0.9" />
            <ellipse cx="388" cy="418" rx="28" ry="30" fill="#fff" />
            <ellipse cx="384" cy="422" rx="18" ry="20" fill="#1A237E" />
            <ellipse cx="381" cy="425" rx="10" ry="12" fill="#0D0D0D" />
            <ellipse cx="388" cy="416" rx="5" ry="6" fill="url(#es-card)" opacity="0.9" />
          </g>

          <g id="ojos-cerrados">
            <ellipse cx="292" cy="418" rx="28" ry="27" fill="#fff" />
            <path d="M268 418 Q292 396 316 418" stroke="#1A237E" strokeWidth="5" strokeLinecap="round" fill="#fff" />
            <ellipse cx="388" cy="418" rx="28" ry="27" fill="#fff" />
            <path d="M364 418 Q388 396 412 418" stroke="#1A237E" strokeWidth="5" strokeLinecap="round" fill="#fff" />
          </g>

          <g id="ojos-triste">
            <ellipse cx="292" cy="418" rx="28" ry="30" fill="#fff" />
            <ellipse cx="296" cy="422" rx="18" ry="20" fill="#1A237E" />
            <ellipse cx="299" cy="425" rx="10" ry="12" fill="#0D0D0D" />
            <path d="M265 405 Q292 415 319 405" stroke="#1A237E" strokeWidth="5" strokeLinecap="round" fill="none" />
            <ellipse cx="388" cy="418" rx="28" ry="30" fill="#fff" />
            <ellipse cx="384" cy="422" rx="18" ry="20" fill="#1A237E" />
            <ellipse cx="381" cy="425" rx="10" ry="12" fill="#0D0D0D" />
            <path d="M361 405 Q388 415 415 405" stroke="#1A237E" strokeWidth="5" strokeLinecap="round" fill="none" />
          </g>

          <g id="boca">
            <path d="M295 472 Q340 510 385 472" stroke="#1A237E" strokeWidth="5" strokeLinecap="round" fill="none" />
          </g>

          <g id="boca-riendo">
            <path d="M292 472 Q340 515 388 472 Q340 500 292 472Z" fill="#1A237E" />
          </g>

          <g id="boca-triste">
            <path d="M300 490 Q340 465 380 490" stroke="#1A237E" strokeWidth="5" strokeLinecap="round" fill="none" />
          </g>

          <g id="lapiz">
            <g transform="rotate(-40, 136, 297)">
              <rect x="128" y="212" width="16" height="80" fill="#F5C842" />
            </g>
          </g>

          <g id="brazo-izq">
            <rect x="148" y="280" width="60" height="34" rx="17" fill="#2563EB" />
            <circle cx="136" cy="297" r="26" fill="#FF7043" />
          </g>

          <g id="brazo-der">
            <rect x="472" y="280" width="60" height="34" rx="17" fill="#2563EB" />
            <circle cx="544" cy="297" r="26" fill="#FF7043" />
          </g>
        </svg>
      </div>

      <div className="horarily-dialog">
        {booting ? (
          <div className="horarily-dialog-text horarily-boot-screen" aria-live="polite">
            <span className="horarily-boot-viewport">
              <span className="horarily-boot-text">HORARILY NOTE</span>
            </span>
          </div>
        ) : (
          <div className="horarily-console">
            {history.map((line, idx) => (
              <p key={`${line}-${idx}`} className="horarily-console-line">
                {line}
              </p>
            ))}
            <p className="horarily-dialog-text">
              &gt; {displayText.toUpperCase()}
              <span className="horarily-cursor" aria-hidden="true">
                |
              </span>
            </p>
          </div>
        )}
        {!booting && (
          <form className="horarily-console-input-wrap" onSubmit={onSubmitCommand}>
            <span className="horarily-console-prompt">/</span>
            <input
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              className="horarily-console-input"
              placeholder="HELP, NEXTCLASS, SUBJECTS, MAXNOTE/FISICA"
              autoComplete="off"
            />
          </form>
        )}
      </div>
    </div>
  )
}

export default HorarilySpeakingCard