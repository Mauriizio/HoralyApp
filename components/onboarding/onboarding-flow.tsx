"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { DayKey, Subject } from "@/lib/types"
import type { ScheduleStore } from "@/hooks/use-schedule-store"

const STEPS = ["Bienvenida", "Nombre", "Institución", "Carrera o área", "Sistema de calificaciones", "Zona horaria", "Semestre", "Materias", "Horario", "Resumen"]
const DEFAULT_DAY: DayKey = "lunes"

export function OnboardingFlow({ store, onDone }: { store: ScheduleStore; onDone: () => void }) {
  const start = Math.min(store.data.settings.onboarding.currentStep, STEPS.length - 1)
  const [step, setStep] = useState(start)
  const [name, setName] = useState(store.data.profile.displayName)
  const [institution, setInstitution] = useState(store.data.profile.institution ?? "")
  const [career, setCareer] = useState(store.data.profile.career ?? "")
  const [timezone, setTimezone] = useState(store.data.profile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [semesterName, setSemesterName] = useState(store.data.semesters.find((s) => s.id === store.data.activeSemesterId)?.name ?? "Semestre actual")
  const [subjectName, setSubjectName] = useState(store.data.subjects[0]?.name ?? "")
  const [selectedSubjectId, setSelectedSubjectId] = useState(store.data.subjects[0]?.id ?? "")
  const [subjectSkipped, setSubjectSkipped] = useState(false)
  const [scheduleSkipped, setScheduleSkipped] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const progress = useMemo(() => Math.round(((step + 1) / STEPS.length) * 100), [step])

  const saveProgress = (nextStep = step) => store.updateSettings({ onboarding: { currentStep: nextStep, completed: false, updatedAt: new Date().toISOString() } })
  const saveProfileDraft = () => store.updateProfile({ displayName: name.trim(), institution: institution.trim() || undefined, career: career.trim() || undefined, timezone: timezone.trim() || undefined })
  const ensureSemester = () => {
    const current = store.data.semesters.find((semester) => semester.id === store.data.activeSemesterId)
    if (current) return current.id
    return store.createSemester({ name: semesterName.trim() || "Semestre actual", status: "active" }).id
  }
  const continueTo = (nextStep: number) => { setStep(nextStep); saveProgress(nextStep); setNotice(null) }

  const next = () => {
    if (step === 1 && !name.trim()) return setNotice("Escribe tu nombre para continuar o vuelve atrás.")
    saveProfileDraft()
    if (step === 6) ensureSemester()
    continueTo(Math.min(step + 1, STEPS.length - 1))
  }
  const createBasicSubject = () => {
    if (!subjectName.trim()) return setNotice("Escribe el nombre de una materia o usa Saltar materias.")
    const semesterId = ensureSemester()
    const created = store.addSubject({ name: subjectName.trim(), color: "#2563EB", difficulty: 3, semesterId })
    setSelectedSubjectId(created.id)
    setSubjectSkipped(false)
    continueTo(8)
  }
  const createBasicScheduleBlock = () => {
    const semesterId = ensureSemester()
    const subject = store.data.subjects.find((item) => item.id === selectedSubjectId) ?? store.data.subjects[0]
    const module = store.data.modules[0]
    if (!subject || !module) return setNotice("Necesitas una materia y un módulo horario para crear el bloque.")
    const result = store.upsertBlock({ id: Math.random().toString(36).slice(2), semesterId, subjectId: subject.id, day: DEFAULT_DAY, moduleIds: [module.id] })
    if (!result.ok) return setNotice("Ya existe un bloque en ese módulo. Puedes saltar este paso y ajustarlo en Horario.")
    setScheduleSkipped(false)
    continueTo(9)
  }
  const finish = () => { saveProfileDraft(); store.updateSettings({ onboarding: { currentStep: STEPS.length - 1, completed: true, updatedAt: new Date().toISOString() } }); store.updateProfile({ displayName: name.trim(), institution: institution.trim() || undefined, career: career.trim() || undefined, timezone: timezone.trim() || undefined, onboardingCompletedAt: new Date().toISOString() }); onDone() }

  return <Card className="mx-auto max-w-3xl"><CardHeader><CardTitle>Onboarding académico</CardTitle><CardDescription>Paso {step + 1} de {STEPS.length}: {STEPS[step]} · {progress}%</CardDescription></CardHeader><CardContent className="space-y-4"><StepContent step={step} name={name} setName={setName} institution={institution} setInstitution={setInstitution} career={career} setCareer={setCareer} timezone={timezone} setTimezone={setTimezone} semesterName={semesterName} setSemesterName={setSemesterName} subjectName={subjectName} setSubjectName={setSubjectName} subjects={store.data.subjects} selectedSubjectId={selectedSubjectId} setSelectedSubjectId={setSelectedSubjectId} subjectSkipped={subjectSkipped} scheduleSkipped={scheduleSkipped} />{notice && <p className="text-sm text-destructive" role="alert">{notice}</p>}<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { saveProgress(); onDone() }}>Pausar y continuar luego</Button>{step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Atrás</Button>}{step === 7 && <><Button onClick={createBasicSubject}>Crear materia</Button><Button variant="secondary" onClick={() => { setSubjectSkipped(true); continueTo(8) }}>Saltar materias</Button></>}{step === 8 && <><Button onClick={createBasicScheduleBlock}>Agregar bloque básico</Button><Button variant="secondary" onClick={() => { setScheduleSkipped(true); continueTo(9) }}>Saltar horario</Button></>}{step !== 7 && step !== 8 && (step < STEPS.length - 1 ? <Button onClick={next}>Continuar</Button> : <Button onClick={finish}>Finalizar</Button>)}</div></CardContent></Card>
}

function StepContent(props: { step: number; name: string; setName(v: string): void; institution: string; setInstitution(v: string): void; career: string; setCareer(v: string): void; timezone: string; setTimezone(v: string): void; semesterName: string; setSemesterName(v: string): void; subjectName: string; setSubjectName(v: string): void; subjects: Subject[]; selectedSubjectId: string; setSelectedSubjectId(v: string): void; subjectSkipped: boolean; scheduleSkipped: boolean }) {
  if (props.step === 0) return <p className="text-sm text-muted-foreground">Configuraremos tu perfil, semestre, materias y horario sin borrar datos actuales. Puedes omitir campos no esenciales.</p>
  if (props.step === 1) return <Input aria-label="Nombre" value={props.name} onChange={(e) => props.setName(e.target.value)} placeholder="Tu nombre" />
  if (props.step === 2) return <Input aria-label="Institución" value={props.institution} onChange={(e) => props.setInstitution(e.target.value)} placeholder="Institución (opcional)" />
  if (props.step === 3) return <Input aria-label="Carrera o área" value={props.career} onChange={(e) => props.setCareer(e.target.value)} placeholder="Carrera o área (opcional)" />
  if (props.step === 4) return <p className="text-sm text-muted-foreground">Usaremos la escala configurada en Preferencias. Puedes cambiarla después.</p>
  if (props.step === 5) return <Input aria-label="Zona horaria" value={props.timezone} onChange={(e) => props.setTimezone(e.target.value)} />
  if (props.step === 6) return <Input aria-label="Nombre del semestre" value={props.semesterName} onChange={(e) => props.setSemesterName(e.target.value)} />
  if (props.step === 7) return <div className="space-y-2"><Input aria-label="Nombre de materia" value={props.subjectName} onChange={(e) => props.setSubjectName(e.target.value)} placeholder="Ej: Matemática" /><p className="text-sm text-muted-foreground">Crea una materia básica ahora o sáltalo explícitamente para configurarla luego.</p></div>
  if (props.step === 8) return <div className="space-y-2"><p className="text-sm text-muted-foreground">Agrega un bloque básico el lunes en el primer módulo con una materia existente.</p>{props.subjects.length > 0 && <select aria-label="Materia para horario" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={props.selectedSubjectId} onChange={(e) => props.setSelectedSubjectId(e.target.value)}>{props.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>}</div>
  return <p className="text-sm text-muted-foreground">Todo listo. Materias: {props.subjectSkipped ? "omitidas" : "revisadas"}. Horario: {props.scheduleSkipped ? "omitido" : "revisado"}. El dashboard usará datos reales y estados vacíos cuando falte información.</p>
}
