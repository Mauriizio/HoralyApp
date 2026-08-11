"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { loadHorarilyMasterSvg, useHorarlyState } from "@/hooks/useHorarily"
import "@/styles/horarily-animations.css"
import {
  createConversationState,
  transitionConversation,
  type ConversationState,
} from "@/application/horarily-conversation"

const calculateAverage = (list: Array<{ score: number; weight?: number }>) => {
  const totalWeight = list.reduce((acc, g) => acc + (g.weight ?? 0), 0)
  if (totalWeight > 0) {
    const weightedSum = list.reduce((acc, g) => acc + g.score * (g.weight ?? 0), 0)
    return weightedSum / totalWeight
  }
  return list.reduce((acc, g) => acc + g.score, 0) / list.length
}

interface HorarilySpeakingCardProps {
  message: string
  userName: string
  grade?: number
  isTyping?: boolean
  isUrgent?: boolean
  isLoading?: boolean
  autoSpeak?: boolean
  suspended?: boolean
  hideMascot?: boolean
  className?: string
  commandContext?: {
    nextClassText?: string
    subjects?: Array<{ id: string; name: string; commandKey?: string }>
    grades?: Array<{ subjectId: string; title: string; score: number; date: string; weight?: number }>
    reminders?: Array<{ title: string; targetDateTime: string }>
    passingGrade?: number
    hasAnyData?: boolean
    language?: "es" | "en"
  }
  commandActions?: {
    addSubject?: (payload: { name: string; commandKey?: string }) => { name: string; commandKey: string } | null
    addGrade?: (payload: { commandKey: string; score: number; title: string; weight: number }) => boolean
    updateProfileName?: (name: string) => void
    openSubjectForm?: () => void
    openGradeForm?: () => void
    openSchedule?: () => void
    openReminderForm?: () => void
    openTools?: () => void
    openNotebook?: () => void
    createNote?: (payload: { subjectId: string; title: string; unit?: string; content: string }) => Promise<boolean>
    openScientificCalculator?: () => void
    openPreferences?: () => void
    resetProfileName?: () => void
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
  suspended = false,
  hideMascot = false,
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
  const [advancedMode, setAdvancedMode] = useState(false)
  const [commandInput, setCommandInput] = useState("")
  const [pendingResponse, setPendingResponse] = useState<string | null>(null)
  const [awaitingSetupChoice, setAwaitingSetupChoice] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState<"idle" | "awaiting_name" | "awaiting_subject_choice">("idle")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [awaitingResetConfirm, setAwaitingResetConfirm] = useState(false)
  const [helpMenuMode, setHelpMenuMode] = useState<"idle" | "es" | "en">("idle")
  const [conversationState, setConversationState] = useState<ConversationState>(createConversationState)
  const [pendingSubjectName, setPendingSubjectName] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState<{ step: "subject" | "title" | "unit" | "content" | "confirm"; subjectId?: string; title?: string; unit?: string; content?: string } | null>(null)
  const consoleRef = useRef<HTMLDivElement>(null)
  const lastAutoSpokenMessageRef = useRef("")
  const { displayText, isSpeaking, speak, setContext } = useHorarlyState(svgRef, suspended)

  useEffect(() => {
    let isMounted = true

    const loadMasterSvg = async () => {
      if (!svgRef.current) return
      const loaded = await loadHorarilyMasterSvg(svgRef.current)
      if (isMounted) setUsingMasterSvg(loaded)
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
    if (suspended) {
      lastAutoSpokenMessageRef.current = message
      return
    }
    if (!booting && autoSpeak && !suspended && message && message !== lastAutoSpokenMessageRef.current && !interactiveMode) {
      lastAutoSpokenMessageRef.current = message
      speak(message)
    }
  }, [autoSpeak, suspended, message, speak, usingMasterSvg, booting, interactiveMode])

  useEffect(() => {
    const timeoutId = setTimeout(() => setBooting(false), 3600)
    return () => clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    if (booting || suspended) return
    setHistory((prev) => {
      if (prev.length > 0) return prev
      const isNewUser = !userName.trim() && !commandContext?.hasAnyData
      if (isNewUser) {
        setAwaitingSetupChoice(true)
        setOnboardingStep("idle")
        return [
          "> ¡BIENVENIDO! SOY HORARILY, TU ASISTENTE ACADÉMICO.",
          "> TE AYUDO A ORGANIZAR CLASES, RECORDATORIOS Y ANALIZAR TU RENDIMIENTO.",
          "> COMENZAR CONFIGURACIÓN: Y = SÍ  |  N = NO",
        ]
      }
      const greeting = userName.trim() ? `> HOLA, ${userName.toUpperCase()}` : "> HOLA"
      return [greeting, `> ${message.toUpperCase()}`, "> CUÉNTAME QUÉ NECESITAS O ABRE COMANDOS AVANZADOS"]
    })
  }, [booting, suspended, userName, commandContext?.hasAnyData, message])

  useEffect(() => {
    if (booting || suspended) return
    if (pendingResponse && (!isSpeaking || displayText.trim().toUpperCase() === pendingResponse.trim().toUpperCase())) {
      const lines = pendingResponse
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
      setHistory((prev) => [...prev, ...lines.map((line) => `> ${line.toUpperCase()}`)])
      setPendingResponse(null)
    }
  }, [displayText, booting, suspended, pendingResponse, isSpeaking])

  useEffect(() => {
    if (!consoleRef.current) return
    consoleRef.current.scrollTop = consoleRef.current.scrollHeight
  }, [history, displayText])

  const runCommand = (raw: string) => {
    const normalizedRaw = raw.trim().toUpperCase()
    const compactNumericChoice = normalizedRaw.replace(/[).\s]/g, "")
    const helpChoice = /^[1-7]$/.test(compactNumericChoice) ? compactNumericChoice : null
    const normalized = normalizedRaw
      .replace("/PROXIMACLASE", "/NEXTCLASS")
      .replace("/MATERIAS", "/SUBJECTS")
      .replace("/PROMEDIO/", "/AVG/")
      .replace("/PROMEDIO", "/CALC/AVG")
      .replace("/ULTIMANOTA/", "/LASTGRADE/")
      .replace("/NOTAMAXIMA/", "/MAXNOTE/")
      .replace("/NOTAMINIMA/", "/MINNOTE/")
      .replace("/ESTADO/", "/STATUS/")
      .replace("/TOPMATERIAS", "/TOPSUBJECTS")
      .replace("/RECORDATORIOS/HOY", "/REMINDERS/TODAY")
      .replace("/RECORDATORIOS/PROXIMO", "/REMINDERS/NEXT")
      .replace("/RECORDATORIOS", "/REMINDERS")
      .replace("/NOTAS", "/NOTES")
      .replace("/NOMBRE/", "/SETNAME/")
      .replace("/AGG/MATERIA/", "/ADD/SUBJECT/")
      .replace("/AGG/NOTA/", "/ADD/NOTE/")
    if (normalized === "/AYUDA") {
      setHelpMenuMode("es")
      return "AYUDA RÁPIDA:\n1) VER LISTA DE COMANDOS\n2) CÓMO CREAR UNA MATERIA\n3) CÓMO AGREGAR UNA NOTA\n4) CÓMO CREAR UN RECORDATORIO\n5) CÓMO CONFIGURAR EL HORARIO\n6) CÓMO AGREGAR BLOQUES DE HORARIO\n7) CÓMO PERSONALIZAR LA APP"
    }

    if (normalized === "/HELP") {
      setHelpMenuMode("en")
      return "HELP MENU:\n1) COMMAND LIST\n2) HOW TO CREATE A SUBJECT\n3) HOW TO ADD A GRADE\n4) HOW TO CREATE A REMINDER\n5) HOW TO CONFIGURE SCHEDULE\n6) HOW TO ADD SCHEDULE BLOCKS\n7) HOW TO CUSTOMIZE THE APP"
    }

    if (helpChoice && helpMenuMode !== "idle") {
      if (helpMenuMode === "en") {
        if (helpChoice === "1") return "COMMANDS:\n/AYUDA\n/HELP\n/PROXIMACLASE\n/NEXTCLASS\n/MATERIAS\n/SUBJECTS\n/AGG/MATERIA/<MATERIA>\n/ADD/SUBJECT/<SUBJECT>\n/AGG/NOTA/<MATERIA>/<PUNTAJE>/<PONDERACION>/<TITULO>\n/ADD/NOTE/<SUBJECT>/<SCORE>/<WEIGHT>/<TITLE>\n/PROMEDIO\n/PROMEDIO/<MATERIA>\n/AVG/<SUBJECT>\n/ULTIMANOTA/<MATERIA>\n/LASTGRADE/<SUBJECT>\n/NOTAMAXIMA/<MATERIA>\n/MAXNOTE/<SUBJECT>\n/NOTAMINIMA/<MATERIA>\n/MINNOTE/<SUBJECT>\n/NOTAS\n/NOTES\n/NOTAS/<MATERIA>\n/RECORDATORIOS\n/RECORDATORIOS/HOY\n/RECORDATORIOS/PROXIMO\n/REMINDERS\n/ESTADO/<MATERIA>\n/TOPMATERIAS\n/NOMBRE/<NOMBRE>\n/SETNAME/<NAME>\n/SETUP/SI\n/SETUP/NO\n/LIMPIAR\n/CLEAR\n/REINICIAR\n/BOOT"
        if (helpChoice === "2") return "SUBJECTS > CREATE SUBJECT:\n1. OPEN SUBJECTS TAB.\n2. CLICK CREATE SUBJECT.\n3. COMPLETE NAME AND SAVE.\n>>> YOU CAN ALSO DO IT FROM CONSOLE: /ADD/SUBJECT/<SUBJECT>"
        if (helpChoice === "3") return "GRADES > ADD GRADE:\n1. OPEN GRADES TAB.\n2. CLICK ADD GRADE.\n3. COMPLETE SCORE, WEIGHT AND TITLE.\n4. SAVE.\n>>> YOU CAN ALSO DO IT FROM CONSOLE: /ADD/NOTE/<SUBJECT>/<SCORE>/<WEIGHT>/<TITLE>"
        if (helpChoice === "4") return "REMINDERS > ADD REMINDER:\n1. OPEN REMINDERS TAB.\n2. CLICK ADD REMINDER.\n3. COMPLETE TITLE, DATE AND TIME.\n4. SAVE.\nNOTE: THERE IS NO COMMAND TO CREATE REMINDERS YET.\nCONSOLE COMMAND /REMINDERS ONLY LISTS EXISTING REMINDERS."
        if (helpChoice === "5") return "SCHEDULE:\n1. OPEN SCHEDULE TAB.\n2. CREATE BLOCKS WITH SUBJECT, DAY AND TIME.\n3. SAVE EACH BLOCK.\n4. IF YOU NEED SATURDAY, ENABLE IT IN PREFERENCES.\n>>> YOU CAN ALSO USE CONSOLE COMMANDS: /NEXTCLASS"
        if (helpChoice === "6") return "SCHEDULE BLOCKS:\n1. OPEN PREFERENCES > SCHEDULE OPTIONS.\n2. ENABLE THE DAYS YOU NEED (INCLUDING SATURDAY IF APPLIES).\n3. GO TO SCHEDULE TAB AND TAP ADD BLOCK.\n4. PICK SUBJECT, START, END AND SAVE.\n5. YOU MUST CREATE AT LEAST ONE SUBJECT BEFORE ASSIGNING A BLOCK."
        return "CUSTOMIZE APP:\n1. OPEN PREFERENCES.\n2. ADJUST THEME, COLORS, VISUAL STYLE AND TYPOGRAPHY OPTIONS AVAILABLE.\n3. REVIEW CHANGES IN REAL TIME AND SAVE YOUR PREFERRED CONFIGURATION."
      }
      if (helpChoice === "1") return "COMANDOS DISPONIBLES:\n/AYUDA\n/PROXIMACLASE\n/MATERIAS\n/AGG/MATERIA/<MATERIA>\n/AGG/NOTA/<MATERIA>/<PUNTAJE>/<PONDERACION>/<TITULO>\n/PROMEDIO/<MATERIA>\n/ULTIMANOTA/<MATERIA>\n/NOTAMAXIMA/<MATERIA>\n/NOTAMINIMA/<MATERIA>\n/NOTAS\n/RECORDATORIOS\n/LIMPIAR\n/REINICIAR"
      if (helpChoice === "2") return "MATERIAS > CREAR MATERIA:\n1. ABRE LA PESTAÑA MATERIAS.\n2. TOCA CREAR MATERIA.\n3. COMPLETA EL NOMBRE Y GUARDA.\n>>> TAMBIÉN PUEDES HACERLO POR CONSOLA: /AGG/MATERIA/<MATERIA>"
      if (helpChoice === "3") return "NOTAS > AGREGAR NOTA:\n1. ABRE LA PESTAÑA NOTAS.\n2. TOCA AGREGAR NOTA.\n3. COMPLETA PUNTAJE, PONDERACIÓN Y TÍTULO.\n4. GUARDA.\n>>> TAMBIÉN PUEDES HACERLO POR CONSOLA: /AGG/NOTA/<MATERIA>/<PUNTAJE>/<PONDERACION>/<TITULO>"
      if (helpChoice === "4") return "RECORDATORIOS > AGREGAR RECORDATORIO:\n1. ABRE LA PESTAÑA RECORDATORIOS.\n2. TOCA AGREGAR RECORDATORIO.\n3. COMPLETA TÍTULO, FECHA Y HORA.\n4. GUARDA.\nNOTA: AÚN NO EXISTE COMANDO PARA CREAR RECORDATORIOS.\n/RECORDATORIOS SOLO LISTA RECORDATORIOS EXISTENTES."
      if (helpChoice === "5") return "HORARIO:\n1. ABRE LA PESTAÑA HORARIO.\n2. CREA BLOQUES CON MATERIA, DÍA Y HORA.\n3. GUARDA CADA BLOQUE.\n4. SI NECESITAS SÁBADO, ACTÍVALO EN PREFERENCIAS.\n>>> TAMBIÉN PUEDES HACERLO POR CONSOLA: /PROXIMACLASE"
      if (helpChoice === "6") return "BLOQUES DE HORARIO:\n1. ABRE PREFERENCIAS > OPCIONES DE HORARIO.\n2. ACTIVA LOS DÍAS QUE NECESITES (INCLUIDO SÁBADO SI APLICA).\n3. VE A LA PESTAÑA HORARIO Y TOCA AGREGAR BLOQUE.\n4. ELIGE MATERIA, HORA INICIO, HORA FIN Y GUARDA.\n5. DEBES CREAR AL MENOS UNA MATERIA ANTES DE ASIGNARLA A UN BLOQUE."
      return "PERSONALIZAR APP:\n1. ABRE PREFERENCIAS.\n2. AJUSTA TEMA, COLORES, ESTILO VISUAL Y TIPOGRAFÍA DISPONIBLE.\n3. REVISA LOS CAMBIOS EN TIEMPO REAL Y GUARDA TU CONFIGURACIÓN."
    }

    if (!normalized.startsWith("/")) return "No entendí del todo. Puedo ayudarte a agregar una materia, revisar tu horario o ver tus notas."

    if (normalized === "/NEXTCLASS") {
      return commandContext?.nextClassText?.toUpperCase() ?? "NO HAY CLASES PENDIENTES HOY."
    }

    if (normalized === "/SUBJECTS") {
      const subjects = commandContext?.subjects ?? []
      if (subjects.length === 0) return "NO HAY MATERIAS REGISTRADAS."
      return `MATERIAS:\n${subjects.map((s) => `- ${s.name.toUpperCase()}`).join("\n")}`
    }

    if (normalized.startsWith("/MAXNOTE/")) {
      const key = normalized.replace("/MAXNOTE/", "").trim()
      if (!key) return "USA: /NOTAMAXIMA/<CODIGO>"
      const subject = (commandContext?.subjects ?? []).find((s) => s.commandKey?.toUpperCase() === key)
      if (!subject) return `NO EXISTE MATERIA ${key}.`
      const list = (commandContext?.grades ?? []).filter((g) => g.subjectId === subject.id)
      if (list.length === 0) return `NO HAY NOTAS PARA ${subject.name.toUpperCase()}.`
      const best = list.slice().sort((a, b) => b.score - a.score)[0]
      return `TU NOTA MÁS ALTA EN ${subject.name.toUpperCase()} ES ${best.score.toFixed(1)} EN ${best.title.toUpperCase()} (${best.date}).`
    }

    if (normalized.startsWith("/MINNOTE/")) {
      const key = normalized.replace("/MINNOTE/", "").trim()
      if (!key) return "USA: /MINNOTE/<KEY>"
      const subject = (commandContext?.subjects ?? []).find((s) => s.commandKey?.toUpperCase() === key)
      if (!subject) return `NO EXISTE MATERIA ${key}.`
      const list = (commandContext?.grades ?? []).filter((g) => g.subjectId === subject.id)
      if (list.length === 0) return `NO HAY NOTAS REGISTRADAS PARA ${subject.name.toUpperCase()}.`
      const worst = list.slice().sort((a, b) => a.score - b.score)[0]
      return `TU NOTA MÁS BAJA EN ${subject.name.toUpperCase()} ES ${worst.score.toFixed(1)} EN ${worst.title.toUpperCase()} (${worst.date}).`
    }

    const findSubjectByRef = (ref: string) =>
      (commandContext?.subjects ?? []).find((s) => s.commandKey?.toUpperCase() === ref || s.name.toUpperCase() === ref)

    if (normalized.startsWith("/AVG/")) {
      const key = normalized.replace("/AVG/", "").trim()
      const subject = findSubjectByRef(key)
      if (!subject) return `NO EXISTE MATERIA ${key}.`
      const list = (commandContext?.grades ?? []).filter((g) => g.subjectId === subject.id)
      if (list.length === 0) return `NO HAY NOTAS REGISTRADAS PARA ${subject.name.toUpperCase()}.`
      const avg = calculateAverage(list)
      return `TU PROMEDIO EN ${subject.name.toUpperCase()} ES ${avg.toFixed(2)}.`
    }

    if (normalized.startsWith("/LASTGRADE/")) {
      const key = normalized.replace("/LASTGRADE/", "").trim()
      const subject = findSubjectByRef(key)
      if (!subject) return `NO EXISTE MATERIA ${key}.`
      const list = (commandContext?.grades ?? [])
        .filter((g) => g.subjectId === subject.id)
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
      if (list.length === 0) return `NO HAY NOTAS REGISTRADAS PARA ${subject.name.toUpperCase()}.`
      return `TU ÚLTIMA NOTA EN ${subject.name.toUpperCase()} ES ${list[0].score.toFixed(1)} EN ${list[0].title.toUpperCase()} (${list[0].date}).`
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

    if (normalized === "/REMINDERS") {
      const list = (commandContext?.reminders ?? [])
        .map((r) => ({ ...r, ts: new Date(r.targetDateTime).getTime() }))
        .filter((r) => !Number.isNaN(r.ts))
        .sort((a, b) => a.ts - b.ts)
      if (list.length === 0) return "NO HAY RECORDATORIOS REGISTRADOS."
      const now = Date.now()
      return `LISTA DE RECORDATORIOS:\n${list
        .map((r) => `${r.ts < now ? "[VENCIDO] " : ""}${r.title.toUpperCase()} (${r.targetDateTime})`)
        .join("\n")}`
    }

    if (normalized.startsWith("/STATUS/")) {
      const key = normalized.replace("/STATUS/", "").trim()
      const subject = findSubjectByRef(key)
      if (!subject) return `NO EXISTE MATERIA ${key}.`
      const list = (commandContext?.grades ?? []).filter((g) => g.subjectId === subject.id)
      if (list.length === 0) return `SIN COBERTURA: NO HAY NOTAS PARA ${subject.name.toUpperCase()}.`
      const avg = calculateAverage(list)
      const passing = commandContext?.passingGrade ?? 4
      const status = avg >= passing ? "APROBADO" : "RIESGO"
      return `ESTADO EN ${subject.name.toUpperCase()}: ${status}\nPROMEDIO: ${avg.toFixed(2)}\nCOBERTURA: ${list.length} NOTA(S)`
    }

    if (normalized === "/TOPSUBJECTS") {
      const subjects = commandContext?.subjects ?? []
      const grades = commandContext?.grades ?? []
      const ranking = subjects
        .map((s) => {
          const list = grades.filter((g) => g.subjectId === s.id)
          if (list.length === 0) return null
          const avg = calculateAverage(list)
          return { label: s.name, avg }
        })
        .filter((entry): entry is { label: string; avg: number } => entry !== null)
        .sort((a, b) => b.avg - a.avg)

      if (ranking.length === 0) return "NO HAY NOTAS SUFICIENTES PARA RANKING."
      return `TOP MATERIAS:\n${ranking
        .slice(0, 5)
        .map((r, i) => `${i + 1}. ${r.label.toUpperCase()} - PROMEDIO ${r.avg.toFixed(2)}`)
        .join("\n")}`
    }

    if (normalized === "/NOTES") {
      const subjects = commandContext?.subjects ?? []
      const grades = commandContext?.grades ?? []
      if (subjects.length === 0) return "NO HAY MATERIAS REGISTRADAS."
      const rows = subjects.map((s) => {
        const list = grades.filter((g) => g.subjectId === s.id)
        if (list.length === 0) return `${s.name.toUpperCase()}: SIN NOTAS`
        const avg = calculateAverage(list)
        return `${s.name.toUpperCase()}: PROMEDIO ${avg.toFixed(2)}`
      })
      return `LISTA DE NOTAS:\n${rows.join("\n")}`
    }

    if (normalized.startsWith("/NOTES/")) {
      const key = normalized.replace("/NOTES/", "").trim()
      const subject = (commandContext?.subjects ?? []).find(
        (s) => s.commandKey?.toUpperCase() === key || s.name.toUpperCase() === key,
      )
      if (!subject) return `NO EXISTE MATERIA ${key}.`
      const list = (commandContext?.grades ?? [])
        .filter((g) => g.subjectId === subject.id)
        .sort((a, b) => a.date.localeCompare(b.date))
      if (list.length === 0) return `NO HAY NOTAS REGISTRADAS PARA ${subject.name.toUpperCase()}.`
      const avg = calculateAverage(list)
      const rows = list.map((g) => `- ${g.score.toFixed(1)} ${g.title.toUpperCase()} ${g.weight ? `${g.weight}%` : ""}`.trim())
      return `NOTAS ${subject.name.toUpperCase()}:\n${rows.join("\n")}\nPROMEDIO: ${avg.toFixed(2)}`
    }

    if (normalized === "/CALC/AVG") {
      const list = commandContext?.grades ?? []
      if (list.length === 0) return "NO HAY NOTAS REGISTRADAS PARA CALCULAR PROMEDIO GLOBAL."
      const avg = calculateAverage(list)
      return `PROMEDIO GLOBAL: ${avg.toFixed(2)}`
    }

    if (normalized.startsWith("/CALC/AVG/")) {
      const key = normalized.replace("/CALC/AVG/", "").trim()
      const subject = findSubjectByRef(key)
      if (!subject) return `NO EXISTE MATERIA ${key}.`
      const list = (commandContext?.grades ?? []).filter((g) => g.subjectId === subject.id)
      if (list.length === 0) return `NO HAY NOTAS PARA ${subject.name.toUpperCase()}.`
      const avg = calculateAverage(list)
      return `TU PROMEDIO EN ${subject.name.toUpperCase()} ES ${avg.toFixed(2)}.`
    }

    if (normalized === "/SETUP/SI") {
      return "CONFIGURACIÓN GUIADA:\n1) AGREGA TU NOMBRE.\n2) CREA TU PRIMERA MATERIA DESDE PESTAÑA MATERIAS > CREAR MATERIA.\n3) AGREGA TU PRIMERA NOTA DESDE PESTAÑA NOTAS > AGREGAR NOTA.\n4) SI PREFIERES CONSOLA: /AGG/MATERIA/<MATERIA> Y /AGG/NOTA/<MATERIA>/<PUNTAJE>/<PONDERACION>/<TITULO>.\n5) CONFIGURA HORARIO EN PESTAÑA HORARIO.\n6) CREA RECORDATORIOS EN PESTAÑA RECORDATORIOS."
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
      const parts = body.split("/").map((p) => p.trim()).filter(Boolean)
      const hasExplicitCode = parts.length >= 2
      const key = (hasExplicitCode ? parts[0] : parts[0]?.slice(0, 3))?.toUpperCase() ?? ""
      const name = hasExplicitCode ? parts.slice(1).join("/") : (parts[0] ?? "")
      if (!name) return "USA: /AGG/MATERIA/<MATERIA>"
      const created = commandActions?.addSubject?.({ name, commandKey: key })
      if (!created) return "NO SE PUDO CREAR LA MATERIA. REVISA SI ESE NOMBRE YA EXISTE."
      return `MATERIA CREADA: ${created.name.toUpperCase()} (/${created.commandKey.toUpperCase()})`
    }

    if (normalized.startsWith("/ADD/NOTE/")) {
      const body = raw.slice(raw.toUpperCase().indexOf("/ADD/NOTE/") + 10).trim()
      const [rawKey, rawScore, rawWeight, ...titleParts] = body.split("/")
      const key = (rawKey ?? "").trim().toUpperCase()
      const score = Number(rawScore)
      const weight = Number(rawWeight)
      const title = titleParts.join("/").trim()
      if (!key || Number.isNaN(score) || Number.isNaN(weight) || !title) return "USA: /AGG/NOTA/<MATERIA>/<PUNTAJE>/<PONDERACION>/<TITULO>"
      if (score < 1 || score > 7) return "PUNTAJE INVÁLIDO. USA UN VALOR ENTRE 1.0 Y 7.0."
      if (weight <= 0 || weight > 100) return "PONDERACIÓN INVÁLIDA. USA UN VALOR ENTRE 1 Y 100."
      const ok = commandActions?.addGrade?.({ commandKey: key, score, title, weight }) ?? false
      if (!ok) return `NO SE PUDO AGREGAR LA NOTA. REVISA LA MATERIA ${key}.`
      return `NOTA REGISTRADA EN ${key}: ${score.toFixed(1)} (${title.toUpperCase()})`
    }

    return "COMANDO NO RECONOCIDO. USA /AYUDA"
  }

  const executeCommand = (value: string) => {
    const normalized = value.trim().toUpperCase()
    setInteractiveMode(true)
    setCommandHistory((prev) => [...prev, value])
    setHistoryCursor(null)

    if (normalized === "/CLEAR" || normalized === "/LIMPIAR") {
      setHistory([])
      setCommandInput("")
      return
    }

    if (normalized === "/BOOT" || normalized === "/REINICIAR") {
      const greeting = userName.trim() ? `> HOLA, ${userName.toUpperCase()}` : "> HOLA"
      setHistory(["> BOOT OK", greeting, "> MODO INTERACTIVO ACTIVO"])
      setCommandInput("")
      return
    }

    const response = runCommand(value)
    setHistory((prev) => [...prev, `> ${value.toUpperCase()}`])
    setPendingResponse(response)
    speak(response)
    setCommandInput("")
    setSuggestions([])
  }

  const executeNaturalInput = (value: string) => {
    const transition = transitionConversation(conversationState, value)
    setConversationState(transition.state)
    setCommandHistory((previous) => [...previous, value])
    setHistory((previous) => [...previous, `> ${value}`])
    setCommandInput("")
    setSuggestions([])

    if (transition.intent.kind === "legacyCommand") return executeCommand(transition.intent.command)
    if (transition.intent.kind === "listSubjects") return executeCommand("/MATERIAS")
    if (transition.intent.kind === "nextClass") return executeCommand("/PROXIMACLASE")
    if (transition.intent.kind === "showGrades") return executeCommand("/NOTAS")
    if (transition.intent.kind === "showAverage") return executeCommand("/NOTAS")
    if (transition.intent.kind === "openSchedule") return commandActions?.openSchedule?.()
    if (transition.intent.kind === "createReminder") return commandActions?.openReminderForm?.()
    if (transition.intent.kind === "openTools") return commandActions?.openTools?.()
    if (transition.intent.kind === "openPreferences") return commandActions?.openPreferences?.()
    if (conversationState.kind === "confirmingSubject" && transition.intent.kind === "confirmSubject") return confirmNaturalSubject()
    if (transition.intent.kind === "cancel" || transition.intent.kind === "correct") {
      setPendingSubjectName(null)
      setPendingResponse(transition.message)
      speak(transition.message)
      return
    }
    if (transition.intent.kind === "help") {
      const response = "Puedo ayudarte a agregar una materia, revisar tu próxima clase, ver tus materias o consultar tus notas."
      setPendingResponse(response)
      speak(response)
      return
    }
    if (transition.state.kind === "confirmingSubject") setPendingSubjectName(transition.state.subjectName)
    setPendingResponse(transition.message)
    speak(transition.message)
  }

  const confirmNaturalSubject = () => {
    if (!pendingSubjectName) return
    const created = commandActions?.addSubject?.({ name: pendingSubjectName })
    const response = created
      ? `Materia creada: ${created.name}. Su clave automática es ${created.commandKey}.`
      : `No pude crear ${pendingSubjectName}. Revisa si ya existe o vuelve a intentarlo.`
    setConversationState({ kind: "idle" })
    setPendingSubjectName(null)
    setPendingResponse(response)
    speak(response)
  }

  const restartOnboarding = () => {
    commandActions?.resetProfileName?.()
    setInteractiveMode(false)
    setAwaitingSetupChoice(true)
    setOnboardingStep("idle")
    setCommandInput("")
    setSuggestions([])
    setHistory([
      "> ¡BIENVENIDO! SOY HORARILY, TU ASISTENTE ACADÉMICO.",
      "> TE AYUDO A ORGANIZAR CLASES, RECORDATORIOS Y ANALIZAR TU RENDIMIENTO.",
      "> COMENZAR CONFIGURACIÓN: Y = SÍ  |  N = NO",
    ])
    setAwaitingResetConfirm(false)
  }

  const onSubmitCommand = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const value = commandInput.trim()
    if (!value) return
    const normalized = value.trim().toUpperCase()

    if (noteDraft && noteDraft.step !== "subject" && noteDraft.step !== "confirm") {
      const next = noteDraft.step === "title"
        ? { ...noteDraft, title: value, step: "unit" as const }
        : noteDraft.step === "unit"
          ? { ...noteDraft, unit: normalized === "-" ? undefined : value, step: "content" as const }
          : { ...noteDraft, content: value, step: "confirm" as const }
      setNoteDraft(next)
      setHistory((previous) => [...previous, `> ${value}`])
      setCommandInput("")
      setPendingResponse(next.step === "unit"
        ? "Unidad o tema (opcional). Escribe - para omitir."
        : next.step === "content"
          ? "Pega o escribe el contenido del apunte."
          : "Revisa los datos y confirma para guardar.")
      return
    }

    if (awaitingSetupChoice && !normalized.startsWith("/")) {
      if (normalized === "Y") {
        setInteractiveMode(true)
        setAwaitingSetupChoice(false)
        setOnboardingStep("awaiting_name")
        const response = "PERFECTO, TE GUÍO PASO A PASO.\nPRIMER PASO: AGREGA TU NOMBRE."
        setHistory((prev) => [...prev, "> Y"])
        setPendingResponse(response)
        speak(response)
        setCommandInput("")
        return
      }

      if (normalized === "N") {
        setInteractiveMode(true)
        setAwaitingSetupChoice(false)
        const response = "ENTENDIDO. PUEDES EXPLORAR LA APP Y USAR /HELP CUANDO QUIERAS."
        setHistory((prev) => [...prev, "> N"])
        setPendingResponse(response)
        speak(response)
        setCommandInput("")
        return
      }

      const response = "RESPUESTA NO VÁLIDA. ESCRIBE Y PARA COMENZAR O N PARA OMITIR."
      setHistory((prev) => [...prev, `> ${value.toUpperCase()}`])
      setPendingResponse(response)
      speak(response)
      setCommandInput("")
      return
    }

    if (onboardingStep === "awaiting_name" && !normalized.startsWith("/")) {
      const cleanName = value.trim()
      commandActions?.updateProfileName?.(cleanName)
      setOnboardingStep("awaiting_subject_choice")
      const response = `BIEN, ${cleanName.toUpperCase()}.\n¿DESEAS AGREGAR TU PRIMERA MATERIA AHORA?\nRESPONDE Y O N.`
      setHistory((prev) => [...prev, `> ${cleanName.toUpperCase()}`])
      setPendingResponse(response)
      speak(response)
      setCommandInput("")
      return
    }

    if (onboardingStep === "awaiting_subject_choice" && !normalized.startsWith("/")) {
      const response =
        normalized === "Y"
          ? "EXCELENTE.\nRECOMENDADO: VE A LA PESTAÑA MATERIAS Y TOCA CREAR MATERIA.\nOPCIÓN POR CONSOLA: /AGG/MATERIA/<MATERIA>\nEJEMPLO: /AGG/MATERIA/FISICA APLICADA"
          : "PERFECTO.\nPUEDES CREARLA DESPUÉS DESDE LA PESTAÑA MATERIAS (BOTÓN CREAR MATERIA).\nSIGUIENTE PASO: CONFIGURA TU HORARIO EN LA PESTAÑA HORARIO.\nPARA VER TODOS LOS COMANDOS: /AYUDA."
      setOnboardingStep("idle")
      setHistory((prev) => [...prev, `> ${value.toUpperCase()}`])
      setPendingResponse(response)
      speak(response)
      setCommandInput("")
      return
    }

    if (value.startsWith("/")) executeCommand(value)
    else executeNaturalInput(value)
  }

  if (suspended) return null

  return (
    <div className={`horarily-card ${className}`}>
      {!hideMascot && <div className="horarily-svg-wrapper">
        <svg ref={svgRef} viewBox="180 140 310 530" xmlns="http://www.w3.org/2000/svg" className="horarily-svg" aria-hidden="true">
          {/* ... el SVG no cambia respecto al tuyo actual ... */}
        </svg>
      </div>}

      <div className="horarily-dialog">
        {booting ? (
          <div className="horarily-dialog-text horarily-boot-screen" aria-live="polite">
            <span className="horarily-boot-viewport">
              <span className="horarily-boot-text">HORARILY NOTE</span>
            </span>
          </div>
        ) : (
          <div className="horarily-console" ref={consoleRef} data-tour="assistant-history">
            {history.map((line, idx) => (
              <p key={`${line}-${idx}`} className={`horarily-console-line ${line.includes("TAMBIÉN PUEDES HACERLO POR CONSOLA") || line.includes("YOU CAN ALSO") ? "horarily-console-highlight" : ""}`}>
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
          <>
            <p className="px-3 pt-2 text-sm font-medium">¿Qué quieres hacer?</p>
            <p className="px-3 pt-1 text-xs text-muted-foreground">
              Soy tu asistente académico guiado. Puedo ayudarte con materias, horario, notas, recordatorios y navegación.
            </p>
            {!advancedMode && conversationState.kind === "idle" && (
            <div data-tour="assistant-actions" className="horarily-console-input-wrap grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {[
                ["Agregar materia", "agregar una materia"],
                ["Agregar nota", "open-grade"],
                ["Configurar horario", "open-schedule"],
                ["Crear recordatorio", "open-reminder"],
                ["Ver materias", "ver materias"],
                ["Próxima clase", "ver próxima clase"],
                ["Ver mis notas", "ver mis notas"],
                ["Ver mi promedio", "quiero ver mi promedio"],
                ["Abrir herramientas", "open-tools"],
                ["Abrir Cuaderno", "open-notebook"],
                ["Crear apunte", "create-note"],
                ["Calculadora científica", "open-calculator"],
                ["Ayuda", "ayuda"],
              ].map(([label, request]) => (
                <button key={label} type="button" className="horarily-console-input horarily-console-action-btn min-h-11" onClick={() => {
                  if (request === "open-grade") return commandActions?.openGradeForm?.()
                  if (request === "open-schedule") return commandActions?.openSchedule?.()
                  if (request === "open-reminder") return commandActions?.openReminderForm?.()
                  if (request === "open-tools") return commandActions?.openTools?.()
                  if (request === "open-notebook") return commandActions?.openNotebook?.()
                  if (request === "create-note") {
                    setNoteDraft({ step: "subject" })
                    setPendingResponse("Elige la materia para tu nuevo apunte.")
                    return
                  }
                  if (request === "open-calculator") return commandActions?.openScientificCalculator?.()
                  executeNaturalInput(request)
                }}>
                  {label}
                </button>
              ))}
            </div>
            )}
            {(advancedMode || conversationState.kind === "awaitingSubjectName" || (noteDraft && noteDraft.step !== "subject" && noteDraft.step !== "confirm")) && (
            <form className="horarily-console-input-wrap" onSubmit={onSubmitCommand}>
              <span className="horarily-console-prompt" aria-hidden="true">&gt;</span>
              <input
                data-tour="assistant-input-active"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onInput={(e) => {
                  const value = (e.currentTarget as HTMLInputElement).value.toUpperCase()
                  if (!value) {
                    setSuggestions([])
                    return
                  }
                  const commands =
                    commandContext?.language === "en"
                      ? ["/HELP", "/NEXTCLASS", "/SUBJECTS", "/MAXNOTE/", "/MINNOTE/", "/AVG/", "/LASTGRADE/"]
                      : ["/AYUDA", "/PROXIMACLASE", "/MATERIAS", "/NOTAS", "/NOTAMAXIMA/", "/NOTAMINIMA/", "/PROMEDIO/", "/ULTIMANOTA/"]
                  setSuggestions(commands.filter((c) => c.startsWith(value.startsWith("/") ? value : `/${value}`)).slice(0, 4))
                }}
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
                placeholder={noteDraft?.step === "title" ? "Título del apunte" : noteDraft?.step === "unit" ? "Unidad o tema, o -" : noteDraft?.step === "content" ? "Contenido" : advancedMode ? "Ejemplo: /MATERIAS" : "Nombre de la materia"}
                autoComplete="off"
              />
              {!advancedMode && <button type="button" className="horarily-console-action-btn" onClick={() => {
                setConversationState({ kind: "idle" })
                setCommandInput("")
                setPendingResponse("Acción cancelada.")
              }}>Cancelar</button>}
            </form>
            )}

            {noteDraft?.step === "subject" && (
              <div className="horarily-console-input-wrap flex-wrap gap-2" aria-label="Elegir materia para el apunte">
                {(commandContext?.subjects ?? []).map((subject) => (
                  <button key={subject.id} type="button" className="horarily-console-input horarily-console-action-btn min-h-11" onClick={() => {
                    setNoteDraft({ step: "title", subjectId: subject.id })
                    setPendingResponse(`Materia elegida: ${subject.name}. Escribe el título del apunte.`)
                  }}>{subject.name}</button>
                ))}
                {(commandContext?.subjects?.length ?? 0) === 0 && <p className="text-sm">Primero agrega una materia.</p>}
                <button type="button" className="horarily-console-input horarily-console-action-btn" onClick={() => setNoteDraft(null)}>Cancelar</button>
              </div>
            )}

            {noteDraft?.step === "confirm" && (
              <div className="horarily-console-input-wrap flex-wrap gap-2">
                <p className="w-full text-sm">Título: {noteDraft.title}<br />Unidad: {noteDraft.unit || "Sin unidad"}<br />Contenido: {noteDraft.content}</p>
                <button type="button" className="horarily-console-input horarily-console-action-btn min-h-11" onClick={async () => {
                  if (!noteDraft.subjectId || !noteDraft.title || !noteDraft.content) return
                  const saved = await commandActions?.createNote?.({
                    subjectId: noteDraft.subjectId,
                    title: noteDraft.title,
                    unit: noteDraft.unit,
                    content: noteDraft.content,
                  })
                  setPendingResponse(saved ? "Apunte guardado. Puedes abrirlo en Cuaderno." : "No se pudo guardar el apunte.")
                  if (saved) setNoteDraft(null)
                }}>Confirmar y guardar</button>
                <button type="button" className="horarily-console-input horarily-console-action-btn min-h-11" onClick={() => setNoteDraft({ ...noteDraft, step: "title" })}>Corregir</button>
                <button type="button" className="horarily-console-input horarily-console-action-btn min-h-11" onClick={() => setNoteDraft(null)}>Cancelar</button>
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="horarily-console-input-wrap" style={{ marginTop: 0, paddingTop: 0, borderTop: "none", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                {suggestions.map((item) => (
                  <button key={item} type="button" className="horarily-console-line" onClick={() => { setCommandInput(item); setSuggestions([]) }} style={{ color: "#0f5132" }}>
                    &gt; SUGERENCIA: {item}
                  </button>
                ))}
              </div>
            )}

            {pendingSubjectName && (
              <div className="horarily-console-input-wrap" style={{ gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="horarily-console-input horarily-console-action-btn" onClick={confirmNaturalSubject}>Crear rápido</button>
                <button type="button" className="horarily-console-input horarily-console-action-btn" onClick={() => {
                  commandActions?.openSubjectForm?.()
                  setConversationState({ kind: "idle" })
                  setPendingSubjectName(null)
                  setPendingResponse("Personaliza la materia en el formulario.")
                }}>Personalizar</button>
                <button type="button" className="horarily-console-input horarily-console-action-btn" onClick={() => { setConversationState({ kind: "awaitingSubjectName" }); setPendingSubjectName(null); setPendingResponse("Claro. Escribe el nombre correcto."); }}>Corregir nombre</button>
                <button type="button" className="horarily-console-input horarily-console-action-btn" onClick={() => { setConversationState({ kind: "idle" }); setPendingSubjectName(null); setPendingResponse("Cancelado. ¿En qué más puedo ayudarte?"); }}>Cancelar</button>
              </div>
            )}
          </>
        )}

        {!booting && (
          <div className="horarily-console-input-wrap" style={{ gap: 8, justifyContent: "flex-start", flexWrap: "wrap" }}>
            <div data-tour="assistant-advanced-commands">
              <button type="button" className="horarily-console-input horarily-console-action-btn" onClick={() => {
                setAdvancedMode((current) => !current)
                setCommandInput("")
                setSuggestions([])
              }}>{advancedMode ? "Volver al modo guiado" : "Comandos avanzados"}</button>
              {advancedMode && <button type="button" className="horarily-console-input horarily-console-action-btn" onClick={() => executeCommand("/AYUDA")} style={{ maxWidth: 220 }}>/AYUDA</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default HorarilySpeakingCard
