"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { ScheduleStore } from "@/hooks/use-schedule-store"

const STEPS = ["Bienvenida", "Nombre", "Institución", "Carrera o área", "Sistema de calificaciones", "Zona horaria", "Semestre", "Materias", "Horario", "Resumen"]

export function OnboardingFlow({ store, onDone }: { store: ScheduleStore; onDone: () => void }) {
  const start = Math.min(store.data.settings.onboarding.currentStep, STEPS.length - 1)
  const [step, setStep] = useState(start)
  const [name, setName] = useState(store.data.profile.displayName)
  const [institution, setInstitution] = useState(store.data.profile.institution ?? "")
  const [career, setCareer] = useState(store.data.profile.career ?? "")
  const [timezone, setTimezone] = useState(store.data.profile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [semesterName, setSemesterName] = useState(store.data.semesters.find((s) => s.id === store.data.activeSemesterId)?.name ?? "Semestre actual")
  const progress = useMemo(() => Math.round(((step + 1) / STEPS.length) * 100), [step])

  const saveProgress = (nextStep = step) => store.updateSettings({ onboarding: { currentStep: nextStep, completed: false, updatedAt: new Date().toISOString() } })
  const next = () => {
    if (step === 1 && !name.trim()) return
    store.updateProfile({ displayName: name.trim(), institution: institution.trim() || undefined, career: career.trim() || undefined, timezone: timezone.trim() || undefined })
    if (step === 6 && store.data.semesters.length === 0) store.createSemester({ name: semesterName.trim() || "Semestre actual", status: "active" })
    const nextStep = Math.min(step + 1, STEPS.length - 1)
    setStep(nextStep)
    saveProgress(nextStep)
  }
  const finish = () => { store.updateSettings({ onboarding: { currentStep: STEPS.length - 1, completed: true, updatedAt: new Date().toISOString() } }); store.updateProfile({ displayName: name.trim(), institution: institution.trim() || undefined, career: career.trim() || undefined, timezone: timezone.trim() || undefined, onboardingCompletedAt: new Date().toISOString() }); onDone() }

  return <Card className="mx-auto max-w-3xl"><CardHeader><CardTitle>Onboarding académico</CardTitle><CardDescription>Paso {step + 1} de {STEPS.length}: {STEPS[step]} · {progress}%</CardDescription></CardHeader><CardContent className="space-y-4"><StepContent step={step} name={name} setName={setName} institution={institution} setInstitution={setInstitution} career={career} setCareer={setCareer} timezone={timezone} setTimezone={setTimezone} semesterName={semesterName} setSemesterName={setSemesterName} /><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { saveProgress(); onDone() }}>Pausar y continuar luego</Button>{step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Atrás</Button>}{step < STEPS.length - 1 ? <Button onClick={next}>Continuar</Button> : <Button onClick={finish}>Finalizar</Button>}</div></CardContent></Card>
}

function StepContent(props: { step: number; name: string; setName(v: string): void; institution: string; setInstitution(v: string): void; career: string; setCareer(v: string): void; timezone: string; setTimezone(v: string): void; semesterName: string; setSemesterName(v: string): void }) {
  if (props.step === 0) return <p className="text-sm text-muted-foreground">Configuraremos tu perfil, semestre, materias y horario sin borrar datos actuales. Puedes omitir campos no esenciales.</p>
  if (props.step === 1) return <Input aria-label="Nombre" value={props.name} onChange={(e) => props.setName(e.target.value)} placeholder="Tu nombre" />
  if (props.step === 2) return <Input aria-label="Institución" value={props.institution} onChange={(e) => props.setInstitution(e.target.value)} placeholder="Institución (opcional)" />
  if (props.step === 3) return <Input aria-label="Carrera o área" value={props.career} onChange={(e) => props.setCareer(e.target.value)} placeholder="Carrera o área (opcional)" />
  if (props.step === 4) return <p className="text-sm text-muted-foreground">Usaremos la escala configurada en Preferencias. Puedes cambiarla después.</p>
  if (props.step === 5) return <Input aria-label="Zona horaria" value={props.timezone} onChange={(e) => props.setTimezone(e.target.value)} />
  if (props.step === 6) return <Input aria-label="Nombre del semestre" value={props.semesterName} onChange={(e) => props.setSemesterName(e.target.value)} />
  if (props.step === 7) return <p className="text-sm text-muted-foreground">Agrega materias desde la pestaña Materias al finalizar. No duplicaremos materias al cambiar de semestre.</p>
  if (props.step === 8) return <p className="text-sm text-muted-foreground">Define horario desde la pestaña Horario. Tus bloques se asociarán al semestre activo.</p>
  return <p className="text-sm text-muted-foreground">Todo listo. El dashboard usará datos reales y mostrará estados vacíos cuando falte información.</p>
}
