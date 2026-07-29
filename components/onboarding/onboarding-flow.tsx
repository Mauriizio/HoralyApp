"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowLeft, Check, Cloud, HardDrive, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import type { ScheduleStore } from "@/hooks/use-schedule-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { commandKeyForSubjectName } from "@/lib/command-key"
import { HorarilyGuide } from "@/components/horarily/horarily-guide"

const STEP_LABELS = ["Bienvenida", "Tu nombre", "Semestre", "Primera materia", "Listo"] as const
const MESSAGES = [
  "Hola, soy Horarily. Voy a preparar tu espacio académico. Tardaremos menos de dos minutos.",
  "¿Cómo quieres que te llame?",
  "Organicemos dónde vivirán tus materias.",
  "¿Cuál es la primera materia que quieres organizar?",
  "¡Tu espacio académico está listo!",
] as const

export function OnboardingFlow({
  store,
  onDone,
  initialStep,
}: {
  store: ScheduleStore
  onDone: () => void
  initialStep?: number
}) {
  const { authenticated } = useAuth()
  const suggestedStep = initialStep ?? store.data.settings.onboarding.currentStep
  const [step, setStep] = useState(Math.min(Math.max(authenticated ? Math.max(1, suggestedStep) : suggestedStep, 0), 4))
  const [name, setName] = useState(store.data.profile.displayName)
  const [semesterName, setSemesterName] = useState(
    store.data.semesters.find((semester) => semester.id === store.data.activeSemesterId)?.name ?? "Semestre actual",
  )
  const [subjectName, setSubjectName] = useState(store.data.settings.onboarding.draftSubjectName ?? "")
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const activeSemester = store.data.semesters.find(
    (semester) => semester.id === store.data.activeSemesterId && semester.status === "active",
  )
  const activeSubject = store.data.subjects.find((subject) => subject.semesterId === store.data.activeSemesterId)
  const commandKey = useMemo(
    () => commandKeyForSubjectName(subjectName || "Materia", store.allData.subjects),
    [store.allData.subjects, subjectName],
  )

  const persistStep = (nextStep: number, draft = subjectName) => {
    store.updateSettings({
      onboarding: {
        ...store.allData.settings.onboarding,
        currentStep: nextStep,
        completed: false,
        draftSubjectName: draft || undefined,
        updatedAt: new Date().toISOString(),
      },
    })
  }

  const advanceWelcome = () => {
    persistStep(1)
    setStep(1)
  }

  const saveName = () => {
    const value = name.trim().replace(/\s+/g, " ")
    if (!value) return setNotice("Escribe tu nombre o un alias para continuar.")
    if (value.length > 60) return setNotice("Usa un nombre de hasta 60 caracteres.")
    setNotice(null)
    store.updateProfile({ displayName: value })
    persistStep(2)
    setStep(2)
  }

  const saveSemester = () => {
    const value = semesterName.trim() || "Semestre actual"
    setNotice(null)
    const current = activeSemester
    if (current) {
      store.updateSemester(current.id, { name: value, status: "active" })
    } else {
      store.createSemester({ name: value, status: "active" })
    }
    persistStep(3)
    setStep(3)
  }

  const createFirstSubject = () => {
    const value = subjectName.trim().replace(/\s+/g, " ")
    if (!value) return setNotice("Escribe el nombre de tu primera materia.")
    if (value.length > 80) return setNotice("Usa un nombre de hasta 80 caracteres.")
    setBusy(true)
    setNotice(null)
    const result = store.createSubject({ name: value, commandKey })
    setBusy(false)
    if (result.kind === "duplicateSubject") {
      persistStep(4, "")
      setStep(4)
      return
    }
    if (result.kind !== "created") {
      return setNotice(result.kind === "allowed" ? "No se pudo completar la creación." : result.reason)
    }
    persistStep(4, "")
    setStep(4)
  }

  const finish = async () => {
    if (!store.data.profile.displayName.trim() || !store.data.activeSemesterId || store.data.subjects.length === 0) {
      setNotice("Falta confirmar tu nombre, semestre o primera materia.")
      return
    }
    const completedAt = new Date().toISOString()
    setBusy(true)
    setNotice(null)
    try {
      await store.updateProfileConfirmed({ onboardingCompletedAt: completedAt })
      await store.updateSettingsConfirmed({
        onboarding: {
          currentStep: 4,
          completed: true,
          activationCompletedAt: completedAt,
          updatedAt: completedAt,
        },
      })
      onDone()
    } catch {
      setNotice("No pudimos confirmar el guardado. Tus datos actuales permanecen seguros; inténtalo nuevamente.")
    } finally {
      setBusy(false)
    }
  }

  const goBack = () => {
    const next = authenticated && step === 1 ? 1 : Math.max(0, step - 1)
    persistStep(next)
    setNotice(null)
    setStep(next)
  }

  return (
    <main className="min-h-[100dvh] overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-5xl flex-col">
        <header className="mb-4 space-y-2">
          <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
            <span>Configuración inicial</span>
            <span>Paso {step + 1} de 5</span>
          </div>
          <Progress value={(step + 1) * 20} aria-label={`Progreso: ${step + 1} de 5`} />
        </header>

        <section className="grid flex-1 items-center gap-6 rounded-3xl border bg-card/95 p-5 shadow-sm md:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)] md:p-10">
          {/* HorarilyGuide reutiliza exclusivamente /logo/horarily-master.svg. */}
          <HorarilyGuide message={MESSAGES[step]} state={step === 4 ? "success" : step === 3 ? "writing" : "attentive"} />

          <div className="mx-auto w-full max-w-xl space-y-6">
            <div>
              <p className="text-sm font-medium text-primary">{STEP_LABELS[step]}</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{MESSAGES[step]}</h1>
            </div>

            {step === 0 && (
              <div className="space-y-4">
                <div className="rounded-xl border bg-muted/30 p-4 text-sm">
                  <p><HardDrive className="mr-2 inline h-4 w-4" />Como invitado, tus datos quedan en este dispositivo.</p>
                  <p className="mt-2"><Cloud className="mr-2 inline h-4 w-4" />Con una cuenta, tus datos privados pueden sincronizarse.</p>
                </div>
                <Button className="w-full" size="lg" onClick={advanceWelcome}>Continuar como invitado</Button>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button variant="outline" asChild><Link href="/auth/register?next=/?tab=onboarding">Crear cuenta</Link></Button>
                  <Button variant="ghost" asChild><Link href="/auth/login?next=/?tab=onboarding">Iniciar sesión</Link></Button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-2">
                <Label htmlFor="activation-name">Nombre o alias</Label>
                <Input id="activation-name" value={name} maxLength={60} autoFocus onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveName() }} placeholder="Ej: Maurizio" />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <Label htmlFor="activation-semester">Nombre del semestre</Label>
                <Input id="activation-semester" value={semesterName} autoFocus onChange={(event) => setSemesterName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveSemester() }} />
                {activeSemester && <p className="text-sm text-muted-foreground">Usaremos tu semestre activo existente; no se creará otro.</p>}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="activation-subject">Nombre de la materia</Label>
                  <Input id="activation-subject" value={subjectName} maxLength={80} autoFocus onChange={(event) => { setSubjectName(event.target.value); persistStep(3, event.target.value) }} onKeyDown={(event) => { if (event.key === "Enter") createFirstSubject() }} placeholder="Ej: Electrotecnia 1" />
                </div>
                {subjectName.trim() && (
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vista previa</p>
                    <p className="mt-1 font-semibold">{subjectName.trim()}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Clave automática: {commandKey} · podrás personalizarla después.</p>
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3 rounded-xl border bg-muted/30 p-4 text-sm">
                <p><Check className="mr-2 inline h-4 w-4 text-primary" />Nombre: {store.data.profile.displayName}</p>
                <p><Check className="mr-2 inline h-4 w-4 text-primary" />Semestre: {activeSemester?.name ?? semesterName}</p>
                <p><Check className="mr-2 inline h-4 w-4 text-primary" />Primera materia: {activeSubject?.name ?? subjectName}</p>
                <p>{authenticated ? "Tus datos se guardan en tu cuenta sincronizada." : "Tus datos están guardados en este dispositivo."}</p>
              </div>
            )}

            {notice && <p role="alert" className="text-sm text-destructive">{notice}</p>}

            {step > 0 && (
              <div className="flex items-center justify-between gap-3">
                {step < 4 ? <Button variant="ghost" onClick={goBack}><ArrowLeft className="mr-2 h-4 w-4" />Atrás</Button> : <span />}
                {step === 1 && <Button onClick={saveName}>Continuar</Button>}
                {step === 2 && <Button onClick={saveSemester}>Continuar</Button>}
                {step === 3 && <Button onClick={createFirstSubject} disabled={busy || !subjectName.trim()}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear materia</Button>}
                {step === 4 && <Button size="lg" onClick={() => void finish()} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Entrar a mi dashboard</Button>}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
