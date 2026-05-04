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
    reminders?: Array<{ title: string; targetDateTime: string }>
    passingGrade?: number
    hasAnyData?: boolean
  }
  commandActions?: {
    addSubject?: (payload: { name: string; commandKey: string }) => { name: string; commandKey: string } | null
    addGrade?: (payload: { commandKey: string; score: number; title: string }) => boolean
    updateProfileName?: (name: string) => void
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
  commandActions,
}: HorarilySpeakingCardProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [usingMasterSvg, setUsingMasterSvg] = useState(false)
  const [booting, setBooting] = useState(true)
  const [history, setHistory] = useState<string[]>([])
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyCursor, setHistoryCursor] = useState<number | null>(null)
  const [interactiveMode, setInteractiveMode] = useState(false)
  const [commandInput, setCommandInput] = useState("")
  const [pendingResponse, setPendingResponse] = useState<string | null>(null)
  const consoleRef = useRef<HTMLDivElement>(null)
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
    if (!booting && autoSpeak && message && !interactiveMode) {
      speak(message)
    }
  }, [autoSpeak, message, speak, usingMasterSvg, booting, interactiveMode])

  useEffect(() => {
    const timeoutId = setTimeout(() => setBooting(false), 3600)
    return () => clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    if (booting) return
    setHistory((prev) => {
      if (prev.length > 0) return prev
      const isNewUser = !userName.trim() && !commandContext?.hasAnyData
      if (isNewUser) {
        return [
          "> ¡BIENVENIDO! SOY HORARILY, TU ASISTENTE ACADÉMICO.",
          "> TE AYUDO A ORGANIZAR CLASES, RECORDATORIOS Y ANALIZAR TU RENDIMIENTO.",
          "> COMENZAR CONFIGURACIÓN: /SETUP/SI O /SETUP/NO",
        ]
      }
      return [`> HOLA, ${userName.toUpperCase()}`, `> ${message.toUpperCase()}`, "> ESCRIBE /HELP PARA VER COMANDOS"]
    })
  }, [booting, userName, commandContext?.hasAnyData, message])

  useEffect(() => {
    if (booting) return
    if (pendingResponse && displayText.trim().toUpperCase() === pendingResponse.trim().toUpperCase()) {
      setHistory((prev) => [...prev, `> ${pendingResponse.toUpperCase()}`])
      setPendingResponse(null)
    }
  }, [displayText, booting, pendingResponse])

  useEffect(() => {
    if (!consoleRef.current) return
    consoleRef.current.scrollTop = consoleRef.current.scrollHeight
  }, [history, displayText])

  const runCommand = (raw: string) => {
    const normalized = raw.trim().toUpperCase()
    if (!normalized.startsWith("/")) {
      return "ERROR: EL COMANDO DEBE INICIAR CON /"
    }

    if (normalized === "/HELP") {
      return "COMANDOS: /HELP, /NEXTCLASS, /SUBJECTS, /MAXNOTE/<KEY>, /AVG/<KEY>, /LASTGRADE/<KEY>, /REMINDERS/TODAY, /REMINDERS/NEXT, /STATUS/<KEY>, /TOPSUBJECTS, /CALC/AVG, /CALC/AVG/<KEY>, /ADD/SUBJECT/<KEY>/<NOMBRE>, /ADD/NOTE/<KEY>/<NOTA>/<TITULO>, /SETUP/SI, /SETNAME/<NOMBRE>, /CLEAR, /BOOT"
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

    if (normalized === "/REMINDERS/TODAY") {
      const todayIso = new Date().toISOString().slice(0, 10)
      const today = (commandContext?.reminders ?? []).filter((r) => r.targetDateTime.slice(0, 10) === todayIso)
      if (today.length === 0) return "NO HAY RECORDATORIOS PARA HOY."
      return `HOY: ${today.map((r) => r.title.toUpperCase()).join(", ")}`
    }

    if (normalized === "/REMINDERS/NEXT") {
      const now = Date.now()
      const next = (commandContext?.reminders ?? [])
        .map((r) => ({ ...r, ts: new Date(r.targetDateTime).getTime() }))
        .filter((r) => !Number.isNaN(r.ts) && r.ts >= now)
        .sort((a, b) => a.ts - b.ts)[0]
      if (!next) return "NO HAY PROXIMOS RECORDATORIOS."
      return `PROXIMO: ${next.title.toUpperCase()} (${next.targetDateTime})`
    }

    if (normalized.startsWith("/STATUS/")) {
      const key = normalized.replace("/STATUS/", "").trim()
      const subject = (commandContext?.subjects ?? []).find((s) => s.commandKey?.toUpperCase() === key)
      if (!subject) return `NO EXISTE MATERIA CON CLAVE ${key}.`
      const list = (commandContext?.grades ?? []).filter((g) => g.subjectId === subject.id)
      if (list.length === 0) return `SIN COBERTURA: NO HAY NOTAS PARA ${subject.name.toUpperCase()}.`
      const avg = list.reduce((acc, g) => acc + g.score, 0) / list.length
      const passing = commandContext?.passingGrade ?? 4
      const status = avg >= passing ? "APROBADO" : "RIESGO"
      return `STATUS ${key}: ${status} | PROMEDIO ${avg.toFixed(2)} | COBERTURA ${list.length} NOTA(S)`
    }

    if (normalized === "/TOPSUBJECTS") {
      const subjects = commandContext?.subjects ?? []
      const grades = commandContext?.grades ?? []
      const ranking = subjects
        .map((s) => {
          const list = grades.filter((g) => g.subjectId === s.id)
          if (list.length === 0) return null
          const avg = list.reduce((acc, g) => acc + g.score, 0) / list.length
          return { key: s.commandKey ?? s.name, avg }
        })
        .filter((entry): entry is { key: string; avg: number } => entry !== null)
        .sort((a, b) => b.avg - a.avg)
      if (ranking.length === 0) return "NO HAY NOTAS SUFICIENTES PARA RANKING."
      return `TOP: ${ranking.slice(0, 5).map((r, i) => `${i + 1}.${r.key.toUpperCase()}(${r.avg.toFixed(2)})`).join(" ")}`
    }
    if (normalized === "/CALC/AVG") {
      const list = commandContext?.grades ?? []
      if (list.length === 0) return "NO HAY NOTAS REGISTRADAS PARA CALCULAR PROMEDIO GLOBAL."
      const avg = list.reduce((acc, g) => acc + g.score, 0) / list.length
      return `PROMEDIO GLOBAL: ${avg.toFixed(2)}`
    }

    if (normalized.startsWith("/CALC/AVG/")) {
      const key = normalized.replace("/CALC/AVG/", "").trim()
      const subject = (commandContext?.subjects ?? []).find((s) => s.commandKey?.toUpperCase() === key)
      if (!subject) return `NO EXISTE MATERIA CON CLAVE ${key}.`
      const list = (commandContext?.grades ?? []).filter((g) => g.subjectId === subject.id)
      if (list.length === 0) return `NO HAY NOTAS PARA ${subject.name.toUpperCase()}.`
      const avg = list.reduce((acc, g) => acc + g.score, 0) / list.length
      return `PROMEDIO ${key}: ${avg.toFixed(2)}`
    }

    if (normalized === "/SETUP/SI") {
      return "CONFIGURACIÓN GUIADA: 1) /SETNAME/<NOMBRE> 2) /ADD/SUBJECT/<KEY>/<NOMBRE> 3) /ADD/NOTE/<KEY>/<NOTA>/<TITULO>"
    }
    if (normalized === "/SETUP/NO") return "PERFECTO. PUEDES USAR /HELP CUANDO QUIERAS."

    if (normalized.startsWith("/SETNAME/")) {
      const name = raw.slice(raw.toUpperCase().indexOf("/SETNAME/") + 9).trim()
      if (!name) return "USA: /SETNAME/<NOMBRE>"
      commandActions?.updateProfileName?.(name)
      return `NOMBRE ACTUALIZADO: ${name.toUpperCase()}`
    }

    if (normalized.startsWith("/ADD/SUBJECT/")) {
      const body = raw.slice(raw.toUpperCase().indexOf("/ADD/SUBJECT/") + 13).trim()
      const [rawKey, ...nameParts] = body.split("/")
      const key = (rawKey ?? "").trim().toUpperCase()
      const name = nameParts.join("/").trim()
      if (!key || key.length !== 3 || !name) return "USA: /ADD/SUBJECT/<KEY(3)>/<NOMBRE>"
      const created = commandActions?.addSubject?.({ name, commandKey: key })
      if (!created) return "NO SE PUDO CREAR LA MATERIA. REVISA SI LA CLAVE YA EXISTE."
      return `MATERIA CREADA: ${created.name.toUpperCase()} (/${created.commandKey.toUpperCase()})`
    }

    if (normalized.startsWith("/ADD/NOTE/")) {
      const body = raw.slice(raw.toUpperCase().indexOf("/ADD/NOTE/") + 10).trim()
      const [rawKey, rawScore, ...titleParts] = body.split("/")
      const key = (rawKey ?? "").trim().toUpperCase()
      const score = Number(rawScore)
      const title = titleParts.join("/").trim()
      if (!key || Number.isNaN(score) || !title) return "USA: /ADD/NOTE/<KEY>/<NOTA>/<TITULO>"
      const ok = commandActions?.addGrade?.({ commandKey: key, score, title }) ?? false
      if (!ok) return `NO SE PUDO AGREGAR LA NOTA. REVISA LA CLAVE ${key}.`
      return `NOTA REGISTRADA EN ${key}: ${score.toFixed(1)} (${title.toUpperCase()})`
    }

    return "COMANDO NO RECONOCIDO. USA /HELP"
  }

  const onSubmitCommand = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const value = commandInput.trim()
    if (!value) return
    const normalized = value.trim().toUpperCase()
    setInteractiveMode(true)
    setCommandHistory((prev) => [...prev, value])
    setHistoryCursor(null)
    if (normalized === "/CLEAR") {
      setHistory([])
      setCommandInput("")
      return
    }
    if (normalized === "/BOOT") {
      setHistory(["> BOOT OK", `> HOLA, ${userName.toUpperCase()}`, "> MODO INTERACTIVO ACTIVO"])
      setCommandInput("")
      return
    }
    const response = runCommand(value)
    setHistory((prev) => [...prev, `> ${value.toUpperCase()}`])
    setPendingResponse(response)
    speak(response)
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
          <div className="horarily-console" ref={consoleRef}>
            {history.map((line, idx) => (
              <p key={`${line}-${idx}`} className="horarily-console-line">
                {line}
              </p>
            ))}
            {pendingResponse && (
              <p className="horarily-dialog-text">
                &gt; {displayText.toUpperCase()}
                <span className="horarily-cursor" aria-hidden="true">
                  |
                </span>
              </p>
            )}
          </div>
        )}
        {!booting && (
          <form className="horarily-console-input-wrap" onSubmit={onSubmitCommand}>
            <span className="horarily-console-prompt">/</span>
            <input
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  e.preventDefault()
                  if (commandHistory.length === 0) return
                  const nextCursor = historyCursor === null ? commandHistory.length - 1 : Math.max(0, historyCursor - 1)
                  setHistoryCursor(nextCursor)
                  setCommandInput(commandHistory[nextCursor] ?? "")
                } else if (e.key === "ArrowDown") {
                  if (historyCursor === null) return
                  e.preventDefault()
                  const nextCursor = historyCursor + 1
                  if (nextCursor >= commandHistory.length) {
                    setHistoryCursor(null)
                    setCommandInput("")
                    return
                  }
                  setHistoryCursor(nextCursor)
                  setCommandInput(commandHistory[nextCursor] ?? "")
                }
              }}
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
