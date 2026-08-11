"use client"

import { ArrowRight, BookOpen, CalendarDays, Clock3, Layers3, Loader2, Target, TrendingUp, WifiOff, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { calculateWeightedAverage, determineNextClass, getTodayClasses } from "@/domain/academic-engine"
import type { ScheduleStore } from "@/hooks/use-schedule-store"
import type { AppTab } from "@/components/app-shell/navigation"

export function AcademicDashboard({ store, onNavigate }: { store: ScheduleStore; onNavigate: (tab: AppTab) => void }) {
  const { data } = store
  const now = new Date()
  const activeSemester = data.semesters.find((semester) => semester.id === data.activeSemesterId)
  const todayClasses = getTodayClasses(data, now)
  const nextClass = determineNextClass(data, now)
  const average = calculateWeightedAverage(data.grades, data.settings.gradeScale)
  const graded = data.grades.filter((grade) => grade.score !== null && (grade.status ?? "graded") === "graded").length
  const progress = data.grades.length ? Math.round(graded / data.grades.length * 100) : null
  const displayName = data.profile.displayName.trim()
  const greeting = now.getHours() < 12 ? "¡Buenos días" : now.getHours() < 20 ? "¡Buenas tardes" : "¡Buenas noches"
  const date = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: data.profile.timezone || undefined }).format(now)

  if (!store.hydrated) return <StateCard icon={<Loader2 className="size-5 animate-spin" />} title="Cargando dashboard" body="Preparando tus datos académicos." />
  if (store.syncStatus === "offline") return <StateCard icon={<WifiOff className="size-5" />} title="Sin conexión" body="Puedes seguir trabajando con tus datos locales." />
  if (store.syncStatus === "error") return <StateCard icon={<AlertCircle className="size-5" />} title="No pudimos sincronizar" body={store.syncError ?? "Tus datos locales siguen disponibles."} action={<Button onClick={store.retrySync}>Reintentar</Button>} />
  if (!activeSemester) return <StateCard icon={<CalendarDays className="size-5" />} title="Sin semestre activo" body="Selecciona el semestre activo en Preferencias." action={<Button onClick={() => onNavigate("preferencias")}>Abrir Preferencias</Button>} />
  if (!data.profile.onboardingCompletedAt && data.subjects.length === 0) return <StateCard icon={<BookOpen className="size-5" />} title="Configura tu espacio académico" body="Completa la configuración inicial para comenzar." action={<Button onClick={() => onNavigate("onboarding")}>Configurar</Button>} />

  const pending = data.reminders
    .map((item) => ({ item, date: new Date(item.targetDateTime) }))
    .filter(({ date }) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 4)

  return <div className="space-y-2.5 pb-3 sm:space-y-3">
    <header className="px-0.5">
      <h1 className="text-[17px] font-semibold tracking-tight sm:text-xl">{displayName ? `${greeting}, ${displayName}!` : `${greeting}!`}</h1>
      <p className="mt-0.5 text-[11px] capitalize text-muted-foreground sm:text-xs">{date}</p>
    </header>

    <section aria-label="Resumen académico" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <Metric icon={<TrendingUp />} title="Promedio general" value={average.value == null ? "—" : average.value.toFixed(1)} detail={average.confidence === "complete" ? "Completo" : average.confidence === "partial" ? "Parcial" : "Sin notas"} accent="violet" onClick={() => onNavigate("notas")} />
      <Metric icon={<Layers3 />} title="Asignaturas" value={String(data.subjects.length)} detail="Semestre activo" accent="blue" onClick={() => onNavigate("materias")} />
      <Metric icon={<Target />} title="Progreso académico" value={progress == null ? "—" : `${progress}%`} detail={data.grades.length ? `${graded} / ${data.grades.length} calificadas` : "Sin evaluaciones"} accent="green" progress={progress ?? 0} onClick={() => onNavigate("notas")} />
      <Metric icon={<Clock3 />} title="Próxima clase" value={nextClass?.subject.name ?? "—"} detail={nextClass ? `${nextClass.start}–${nextClass.end}` : "Sin clases"} accent="orange" onClick={() => onNavigate("horario")} />
    </section>

    <section className="grid gap-2.5 lg:grid-cols-2">
      <div><CompactCard title="Horario de hoy" action="Ver horario completo" onAction={() => onNavigate("horario")}>
        {todayClasses.length ? <div className="divide-y divide-border/50">{todayClasses.map((item) => {
          const start = new Date(now); const end = new Date(now)
          const [sh, sm] = item.start.split(":").map(Number); const [eh, em] = item.end.split(":").map(Number)
          start.setHours(sh, sm, 0, 0); end.setHours(eh, em, 0, 0)
          const current = start <= now && now < end
          return <button key={item.block.id} onClick={() => onNavigate("horario")} className="grid min-h-11 w-full grid-cols-[3.25rem_1fr_auto] items-center gap-2 px-3 py-1 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="text-xs font-semibold tabular-nums">{item.start}</span>
            <span className="flex min-w-0 items-center gap-2 border-l border-border pl-2"><span className="size-2 shrink-0 rounded-full" style={{ background: item.subject.color }} /><span className="min-w-0"><span className="block truncate text-xs font-medium">{item.subject.name}</span><span className="block text-[10px] text-muted-foreground">hasta {item.end}</span></span></span>
            {current && <span className="rounded-full bg-emerald-500/12 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">En curso</span>}
          </button>
        })}</div> : <p className="px-3 py-5 text-center text-xs text-muted-foreground">No hay clases hoy.</p>}
      </CompactCard></div>
      <div className="hidden lg:block"><MiniCalendar data={data} /></div>
    </section>

    <section className="grid gap-2.5 lg:grid-cols-2">
      <div><CompactCard title="Resumen de asignaturas" action="Ver todas" onAction={() => onNavigate("materias")}>
        <div className="divide-y divide-border/50">{data.subjects.slice(0, 6).map((subject) => {
          const grades = data.grades.filter((grade) => grade.subjectId === subject.id)
          const done = grades.filter((grade) => grade.score !== null).length
          const percent = grades.length ? Math.round(done / grades.length * 100) : 0
          const subjectAverage = calculateWeightedAverage(grades, data.settings.gradeScale).value
          return <button key={subject.id} onClick={() => onNavigate("materias")} className="grid min-h-9 w-full items-center gap-2 px-3 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ gridTemplateColumns: "minmax(0, 1fr) 5.5rem 2.25rem" }}>
            <span className="flex min-w-0 items-center gap-2"><span className="size-2 rounded-sm" style={{ background: subject.color }} /><span className="truncate text-xs font-medium">{subject.name}</span></span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${percent}%` }} /></span><span className="w-6 text-[9px] tabular-nums text-muted-foreground">{grades.length ? `${percent}%` : "—"}</span></span>
            <span className="text-right text-xs font-semibold tabular-nums">{subjectAverage == null ? "—" : subjectAverage.toFixed(1)}</span>
          </button>
        })}</div>
      </CompactCard></div>
      <CompactCard title="Pendientes" action="Ver todos" onAction={() => onNavigate("recordatorios")}>
        {pending.length ? <div className="divide-y divide-border/50">{pending.map(({ item, date: target }) => <button key={item.id} onClick={() => onNavigate("recordatorios")} className="grid min-h-11 w-full grid-cols-[1fr_auto] items-center gap-2 px-3 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="min-w-0"><span className="block truncate text-xs font-medium">{item.title}</span><span className="block truncate text-[10px] text-muted-foreground">{data.subjects.find((subject) => subject.id === item.subjectId)?.name ?? "Recordatorio"}</span></span><RelativeDate date={target} now={now} /></button>)}</div> : <p className="px-3 py-5 text-center text-xs text-muted-foreground">Sin pendientes próximos.</p>}
      </CompactCard>
      <div className="lg:hidden"><MiniCalendar data={data} /></div>
    </section>
  </div>
}

function Metric({ icon, title, value, detail, accent, progress, onClick }: { icon: React.ReactNode; title: string; value: string; detail: string; accent: "violet" | "blue" | "green" | "orange"; progress?: number; onClick: () => void }) {
  const colors = { violet: "border-violet-500/25 text-violet-400", blue: "border-blue-500/25 text-blue-400", green: "border-emerald-500/25 text-emerald-400", orange: "border-orange-500/25 text-orange-400" }[accent]
  return <button type="button" onClick={onClick} aria-label={`${title}: ${value}. ${detail}`} className={`min-h-[86px] rounded-xl border bg-card/75 p-2.5 text-left shadow-sm hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[92px] sm:p-3 ${colors}`}>
    <span className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground"><span className="[&>svg]:size-3.5">{icon}</span>{title}</span>
    <span className="mt-2 block truncate text-xl font-semibold leading-none text-foreground sm:text-2xl">{value}</span>
    {progress != null && <span className="mt-2 block h-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} /></span>}
    <span className="mt-1.5 block truncate text-[9px] text-muted-foreground sm:text-[10px]">{detail}</span>
  </button>
}

function CompactCard({ title, action, onAction, children }: { title: string; action: string; onAction: () => void; children: React.ReactNode }) {
  return <Card className="overflow-hidden rounded-xl border-border/70 bg-card/75 py-0 shadow-sm"><div className="flex min-h-10 items-center justify-between border-b border-border/55 px-3"><h2 className="text-xs font-semibold sm:text-sm">{title}</h2><button type="button" onClick={onAction} className="inline-flex min-h-10 items-center gap-1 text-[10px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{action}<ArrowRight className="size-3" /></button></div><CardContent className="p-0">{children}</CardContent></Card>
}

function MiniCalendar({ data }: { data: ScheduleStore["data"] }) {
  const now = new Date(); const year = now.getFullYear(); const month = now.getMonth()
  const firstDay = new Date(year, month, 1).getDay(); const days = new Date(year, month + 1, 0).getDate()
  const eventDays = new Set([...data.reminders.map((item) => new Date(item.targetDateTime)), ...data.grades.map((item) => new Date(`${item.date}T12:00:00`))].filter((date) => !Number.isNaN(date.getTime()) && date.getMonth() === month && date.getFullYear() === year).map((date) => date.getDate()))
  return <Card className="rounded-xl border-border/70 bg-card/75 py-0 shadow-sm"><div className="flex min-h-10 items-center gap-2 border-b border-border/55 px-3"><CalendarDays className="size-3.5 text-primary" /><h2 className="text-xs font-semibold capitalize sm:text-sm">{new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(now)}</h2></div><CardContent className="p-2.5"><div className="grid text-center text-[9px] text-muted-foreground" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>{"DLMMJVS".split("").map((day, i) => <span key={`${day}-${i}`}>{day}</span>)}</div><div className="mt-1 grid gap-y-0.5 text-center text-[10px]" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>{Array.from({ length: firstDay }).map((_, i) => <span key={`blank-${i}`} />)}{Array.from({ length: days }, (_, i) => i + 1).map((day) => <span key={day} className={`relative grid h-5 place-items-center rounded-full ${day === now.getDate() ? "bg-primary font-semibold text-primary-foreground" : ""}`}>{day}{eventDays.has(day) && day !== now.getDate() && <span className="absolute bottom-0 size-0.5 rounded-full bg-primary" />}</span>)}</div></CardContent></Card>
}

function RelativeDate({ date, now }: { date: Date; now: Date }) { const days = Math.ceil((date.getTime() - now.getTime()) / 86_400_000); return <span className={`text-[10px] font-medium ${days < 0 ? "text-destructive" : days === 0 ? "text-amber-400" : "text-muted-foreground"}`}>{days < 0 ? "Vencido" : days === 0 ? "Hoy" : days === 1 ? "Mañana" : `${days} días`}</span> }

function StateCard({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) { return <Card><CardContent className="flex min-h-44 flex-col items-center justify-center p-5 text-center"><span className="text-primary">{icon}</span><h1 className="mt-2 text-base font-semibold">{title}</h1><p className="mt-1 max-w-md text-xs text-muted-foreground">{body}</p>{action && <div className="mt-3">{action}</div>}</CardContent></Card> }
