"use client"

import {
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Gauge,
  GraduationCap,
  Layers3,
  Loader2,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  WifiOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  calculateWeightedAverage,
  detectOverdueReminders,
  detectSubjectsAtRisk,
  detectSubjectsRequiringAttention,
  determineNextClass,
  estimateWeeklyLoad,
  getTodayClasses,
  suggestBasicStudyBlock,
} from "@/domain/academic-engine"
import type { ScheduleStore } from "@/hooks/use-schedule-store"
import { SemesterSwitcher } from "@/components/semesters/semester-switcher"
import { AcademicAgendaPanel } from "@/components/academic-agenda-panel"
import { generateAcademicRecommendations } from "@/domain/academic-advisor"
import type { AppTab } from "@/components/app-shell/navigation"

const confidenceLabel = { complete: "Datos completos", partial: "Datos parciales", none: "Sin datos" } as const

export function AcademicDashboard({ store, onNavigate }: { store: ScheduleStore; onNavigate: (tab: AppTab) => void }) {
  const { data } = store
  const now = new Date()
  const activeSemester = data.semesters.find((semester) => semester.id === data.activeSemesterId)
  const nextClass = determineNextClass(data, now)
  const todayClasses = getTodayClasses(data, now)
  const overdue = detectOverdueReminders(data.reminders, now)
  const upcoming = data.reminders
    .filter((reminder) => new Date(reminder.targetDateTime).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.targetDateTime).getTime() - new Date(b.targetDateTime).getTime())
    .slice(0, 4)
  const average = calculateWeightedAverage(data.grades, data.settings.gradeScale)
  const risks = detectSubjectsAtRisk(data)
  const attention = detectSubjectsRequiringAttention(data, now)
  const load = estimateWeeklyLoad(data)
  const suggestion = suggestBasicStudyBlock(data)
  const firstSubject = data.subjects[0]
  const advisorPlan = firstSubject
    ? {
        semesterId: firstSubject.semesterId ?? data.activeSemesterId ?? "",
        subjectId: firstSubject.id,
        groups: data.assessmentGroups.filter((group) => group.subjectId === firstSubject.id),
        assessments: data.grades
          .filter((grade) => grade.subjectId === firstSubject.id)
          .map((grade) => ({
            ...grade,
            groupId: grade.groupId ?? "",
            weightWithinGroup: grade.weightWithinGroup ?? grade.weight,
            scheduledDate: grade.date,
            status: grade.status ?? (grade.score === null ? "planned" : "graded"),
          })),
        scale: data.settings.gradeScale,
        targetGrade: data.settings.gradeScale.passing,
      }
    : null
  const advisorItems = advisorPlan
    ? generateAcademicRecommendations({ now, plan: advisorPlan, subjects: data.subjects, agendaItems: [], weeklyLoad: load })
    : []
  const isNew = !data.profile.onboardingCompletedAt && data.subjects.length === 0
  const displayName = data.profile.displayName?.trim()
  const dateLabel = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: data.profile.timezone || undefined,
  }).format(now)

  if (!store.hydrated) {
    return <StateCard icon={<Loader2 className="size-5 animate-spin" />} title="Cargando dashboard" body="Estamos preparando tus datos académicos." />
  }
  if (store.syncStatus === "offline") {
    return <StateCard icon={<WifiOff className="size-5" />} title="Sin conexión" body="Puedes seguir trabajando en modo local; sincronizaremos cuando vuelva internet." />
  }
  if (store.syncStatus === "error") {
    return <StateCard icon={<AlertCircle className="size-5" />} title="No pudimos sincronizar" body={store.syncError ?? "Tus datos locales siguen disponibles."} action={<Button onClick={store.retrySync}>Reintentar</Button>} />
  }
  if (isNew) {
    return <StateCard icon={<Sparkles className="size-5" />} title="Prepara tu espacio académico" body="Completa el onboarding para crear tu semestre, materias y horario." action={<Button onClick={() => onNavigate("onboarding")}>Empezar onboarding</Button>} />
  }
  if (!activeSemester) {
    return <StateCard icon={<CalendarDays className="size-5" />} title="Sin semestre activo" body="Crea o selecciona un semestre para filtrar correctamente tu información." action={<Button onClick={() => onNavigate("preferencias")}>Configurar semestre</Button>} />
  }
  if (data.subjects.length === 0) {
    return <StateCard icon={<BookOpen className="size-5" />} title="Aún no tienes materias" body="Agrega tus materias para activar el horario, las notas y las recomendaciones." action={<Button onClick={() => onNavigate("materias")}>Agregar materias</Button>} />
  }

  const primaryAdvisor = advisorItems[0]
  const totalLoad = Math.max(load.totalBlocks, 1)
  const classLoadPercent = Math.min(100, Math.round((load.classBlocks / totalLoad) * 100))
  const studyLoadPercent = Math.min(100, Math.round((load.studyBlocks / totalLoad) * 100))

  return (
    <div className="space-y-5 pb-4 sm:space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/85 p-5 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-28 size-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="size-4 text-primary" />
              <span className="capitalize">{dateLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{activeSemester.name}</span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              {displayName ? `Hola, ${displayName}` : "Tu día académico"}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Revisa lo importante de hoy, adelanta tus pendientes y mantén tu semestre bajo control.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SemesterSwitcher store={store} onManage={() => onNavigate("preferencias")} />
            <Button className="h-10 rounded-xl" onClick={() => onNavigate("recordatorios")}>
              <Plus className="mr-2 size-4" />
              Nueva tarea
            </Button>
          </div>
        </div>
      </section>

      <section aria-label="Resumen académico" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          icon={<Clock3 className="size-4" />}
          title="Próxima clase"
          value={nextClass ? nextClass.subject.name : "Sin clases"}
          detail={nextClass ? `${nextClass.day} · ${nextClass.start}-${nextClass.end}` : "Tu agenda está libre"}
          onClick={() => onNavigate("horario")}
        />
        <MetricCard
          icon={<TrendingUp className="size-4" />}
          title="Promedio actual"
          value={average.value === null ? "—" : average.value.toFixed(1)}
          detail={confidenceLabel[average.confidence]}
          onClick={() => onNavigate("notas")}
        />
        <MetricCard
          icon={<Layers3 className="size-4" />}
          title="Asignaturas"
          value={String(data.subjects.length)}
          detail={risks.length > 0 ? `${risks.length} requieren revisión` : "Sin riesgo detectado"}
          onClick={() => onNavigate("materias")}
        />
        <MetricCard
          icon={<Target className="size-4" />}
          title="Pendientes"
          value={String(upcoming.length + overdue.length)}
          detail={overdue.length > 0 ? `${overdue.length} vencidos` : "Nada vencido"}
          onClick={() => onNavigate("recordatorios")}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <Card className="overflow-hidden border-border/70 bg-card/80 shadow-sm">
          <CardHeader className="border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">Horario de hoy</CardTitle>
              <CardDescription>Tu secuencia de clases y la siguiente transición.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="w-fit" onClick={() => onNavigate("horario")}>
              Ver horario
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {todayClasses.length > 0 ? (
              <div className="divide-y divide-border/60">
                {todayClasses.map((item, index) => (
                  <button
                    key={item.block.id}
                    type="button"
                    onClick={() => onNavigate("horario")}
                    className="flex min-h-20 w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-5"
                  >
                    <span className="w-14 shrink-0 text-sm font-semibold tabular-nums text-foreground">{item.start}</span>
                    <span className="relative flex min-h-11 min-w-0 flex-1 items-center border-l border-border pl-4">
                      <span className="absolute -left-1.5 top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-card bg-primary" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{item.subject.name}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">Hasta {item.end}</span>
                      </span>
                    </span>
                    {index === 0 && <Badge className="hidden sm:inline-flex">Primera</Badge>}
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<CalendarDays className="size-5" />}
                title="No hay clases hoy"
                body="Aprovecha el espacio para estudiar o revisar tus próximas evaluaciones."
                action={<Button size="sm" variant="outline" onClick={() => onNavigate("estudio")}>Planificar estudio</Button>}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base sm:text-lg">Resumen del día</CardTitle>
                <CardDescription>Lo que merece tu atención ahora.</CardDescription>
              </div>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Gauge className="size-5" />
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/60 bg-background/35 p-3 text-center">
              <DailyCount label="Clases" value={todayClasses.length} />
              <DailyCount label="Próximos" value={upcoming.length} />
              <DailyCount label="Alertas" value={attention.length + risks.length} />
            </div>
            <div className="space-y-3">
              <LoadBar label="Clases" value={classLoadPercent} detail={`${load.classBlocks} bloques`} />
              <LoadBar label="Estudio" value={studyLoadPercent} detail={`${load.studyBlocks} bloques`} />
            </div>
            <Button variant="outline" className="w-full rounded-xl" onClick={() => onNavigate("analitica")}>
              Ver estadísticas
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="border-border/70 bg-card/80 shadow-sm">
          <CardHeader className="pb-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Bell className="size-4 text-amber-400" />
                Tareas y recordatorios
              </CardTitle>
              <CardDescription>Ordenados por la fecha más próxima.</CardDescription>
            </div>
            {overdue.length > 0 && <Badge variant="destructive">{overdue.length} vencidos</Badge>}
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length > 0 ? (
              upcoming.map((reminder) => (
                <button
                  key={reminder.id}
                  type="button"
                  onClick={() => onNavigate("recordatorios")}
                  className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/30 p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-400/10 text-amber-400">
                    <Bell className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{reminder.title}</span>
                    <time className="mt-0.5 block text-xs text-muted-foreground" dateTime={reminder.targetDateTime}>
                      {new Intl.DateTimeFormat("es-CL", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: data.profile.timezone || undefined,
                      }).format(new Date(reminder.targetDateTime))}
                    </time>
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </button>
              ))
            ) : (
              <EmptyState
                icon={<CheckCircle2 className="size-5" />}
                title="Estás al día"
                body="No tienes recordatorios próximos registrados."
                compact
              />
            )}
            <Button variant="ghost" className="w-full" onClick={() => onNavigate("recordatorios")}>
              Gestionar recordatorios
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Sparkles className="size-4 text-primary" />
                  Consejero académico
                </CardTitle>
                <CardDescription>Recomendación determinista basada en tus datos.</CardDescription>
              </div>
              {primaryAdvisor && <Badge variant="outline" className="capitalize">{primaryAdvisor.priority}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {primaryAdvisor ? (
              <>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm font-medium leading-6">{primaryAdvisor.message}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {primaryAdvisor.evidence.slice(0, 2).join(" · ")}
                  </p>
                </div>
                <Button className="w-full rounded-xl" onClick={() => onNavigate("notas")}>
                  {primaryAdvisor.suggestedAction}
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-border/60 bg-background/30 p-4">
                  <p className="text-sm leading-6">{suggestion.message}</p>
                </div>
                <Button className="w-full rounded-xl" onClick={() => onNavigate("estudio")}>Planificar estudio</Button>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <AcademicAgendaPanel store={store} onNavigate={onNavigate} />

      <section aria-label="Acciones rápidas" className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Acciones rápidas</h2>
            <p className="text-xs text-muted-foreground">Llega a las funciones frecuentes con menos clics.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <QuickAction icon={<BookOpen className="size-4" />} label="Asignaturas" onClick={() => onNavigate("materias")} />
          <QuickAction icon={<GraduationCap className="size-4" />} label="Registrar nota" onClick={() => onNavigate("notas")} />
          <QuickAction icon={<Clock3 className="size-4" />} label="Planificar estudio" onClick={() => onNavigate("estudio")} />
          <QuickAction icon={<CalendarDays className="size-4" />} label="Ver horario" onClick={() => onNavigate("horario")} />
        </div>
      </section>
    </div>
  )
}

function MetricCard({ icon, title, value, detail, onClick }: { icon: React.ReactNode; title: string; value: string; detail: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group min-h-32 rounded-2xl border border-border/70 bg-card/80 p-4 text-left shadow-sm transition-[transform,background-color,border-color] hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
    >
      <span className="flex items-center justify-between gap-3 text-muted-foreground">
        <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span>
        <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
      <span className="mt-4 block truncate text-lg font-semibold tracking-tight sm:text-xl">{value}</span>
      <span className="mt-1 block text-xs font-medium text-muted-foreground">{title}</span>
      <span className="mt-1 hidden truncate text-[11px] text-muted-foreground/80 sm:block">{detail}</span>
    </button>
  )
}

function DailyCount({ label, value }: { label: string; value: number }) {
  return <div><div className="text-lg font-semibold tabular-nums">{value}</div><div className="text-[11px] text-muted-foreground">{label}</div></div>
}

function LoadBar({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{detail}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" className="h-12 justify-start rounded-xl px-3" onClick={onClick}>
      <span className="mr-2 text-primary">{icon}</span>
      <span className="truncate">{label}</span>
    </Button>
  )
}

function EmptyState({ icon, title, body, action, compact = false }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center px-5 text-center ${compact ? "min-h-36 py-5" : "min-h-52 py-8"}`}>
      <span className="grid size-11 place-items-center rounded-2xl bg-muted text-muted-foreground">{icon}</span>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

function StateCard({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <Card className="mx-auto max-w-2xl border-border/70 bg-card/80 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1">{body}</CardDescription>
          </div>
        </div>
      </CardHeader>
      {action && <CardContent>{action}</CardContent>}
    </Card>
  )
}
