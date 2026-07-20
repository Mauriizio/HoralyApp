"use client"

import { AlertCircle, Bell, BookOpen, CalendarDays, CheckCircle2, Cloud, GraduationCap, Loader2, WifiOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { calculateWeightedAverage, detectOverdueReminders, determineNextClass, detectSubjectsAtRisk, estimateWeeklyLoad, suggestBasicStudyBlock } from "@/domain/academic-engine"
import type { ScheduleStore } from "@/hooks/use-schedule-store"

export function AcademicDashboard({ store, onNavigate }: { store: ScheduleStore; onNavigate: (tab: string) => void }) {
  const { data } = store
  const activeSemester = data.semesters.find((semester) => semester.id === data.activeSemesterId)
  const nextClass = determineNextClass(data, new Date())
  const overdue = detectOverdueReminders(data.reminders, new Date())
  const upcoming = data.reminders.filter((reminder) => new Date(reminder.targetDateTime).getTime() >= Date.now()).slice(0, 3)
  const average = calculateWeightedAverage(data.grades, data.settings.gradeScale)
  const risks = detectSubjectsAtRisk(data)
  const load = estimateWeeklyLoad(data)
  const suggestion = suggestBasicStudyBlock(data)
  const isNew = !data.profile.onboardingCompletedAt && data.subjects.length === 0

  if (!store.hydrated) return <StateCard icon={<Loader2 className="h-5 w-5 animate-spin" />} title="Cargando dashboard" body="Estamos preparando tus datos académicos." />
  if (store.syncStatus === "offline") return <StateCard icon={<WifiOff className="h-5 w-5" />} title="Sin conexión" body="Puedes seguir en modo local; sincronizaremos cuando vuelva internet." />
  if (store.syncStatus === "error") return <StateCard icon={<AlertCircle className="h-5 w-5" />} title="Error cloud" body={store.syncError ?? "No se pudo sincronizar."} action={<Button onClick={store.retrySync}>Reintentar</Button>} />
  if (isNew) return <StateCard icon={<CheckCircle2 className="h-5 w-5" />} title="Bienvenido a HoralyApp" body="Completa el onboarding para crear tu semestre, materias y horario." action={<Button onClick={() => onNavigate("onboarding")}>Empezar onboarding</Button>} />
  if (!activeSemester) return <StateCard icon={<CalendarDays className="h-5 w-5" />} title="Sin semestre activo" body="Crea o selecciona un semestre para filtrar tus datos académicos." action={<Button onClick={() => onNavigate("preferencias")}>Configurar semestre</Button>} />
  if (data.subjects.length === 0) return <StateCard icon={<BookOpen className="h-5 w-5" />} title="Sin materias" body="Agrega tus materias para activar el dashboard proactivo." action={<Button onClick={() => onNavigate("materias")}>Agregar materias</Button>} />

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Dashboard académico</p>
            <h1 className="text-2xl font-semibold">Hola{data.profile.displayName ? `, ${data.profile.displayName}` : ""}</h1>
            <p className="text-sm text-muted-foreground">Semestre activo: {activeSemester.name}</p>
          </div>
          <Badge variant="outline"><Cloud className="mr-1 h-3 w-3" />{store.syncMessage}</Badge>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Próxima clase" value={nextClass ? nextClass.subject.name : "Sin clases"} detail={nextClass ? `${nextClass.day} ${nextClass.start}-${nextClass.end}` : "Agrega horario"} />
        <Metric title="Promedio global" value={average.value === null ? "Sin notas" : average.value.toString()} detail={`Confianza: ${average.confidence}`} />
        <Metric title="Materias en riesgo" value={String(risks.length)} detail={risks[0]?.reason ?? "Sin alertas críticas"} />
        <Metric title="Carga semanal" value={`${load.totalBlocks} bloques`} detail={`${load.classBlocks} clase · ${load.studyBlocks} estudio`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardHeader><CardTitle>Clases de hoy</CardTitle><CardDescription>Según tu horario actual.</CardDescription></CardHeader><CardContent>{nextClass ? <p className="text-sm">Próxima: {nextClass.subject.name} a las {nextClass.start}</p> : <Empty text="No hay clases próximas registradas." />}</CardContent></Card>
        <Card><CardHeader><CardTitle>Recordatorios</CardTitle><CardDescription>Próximos y vencidos.</CardDescription></CardHeader><CardContent className="space-y-2"><p className="text-sm text-destructive">Vencidos: {overdue.length}</p>{upcoming.length ? upcoming.map((r) => <p key={r.id} className="text-sm"><Bell className="mr-1 inline h-3 w-3" />{r.title}</p>) : <Empty text="No hay recordatorios próximos." />}</CardContent></Card>
        <Card><CardHeader><CardTitle>Acción sugerida</CardTitle><CardDescription>No es certeza: depende de datos disponibles.</CardDescription></CardHeader><CardContent className="space-y-3"><p className="text-sm">{suggestion.message}</p><Button size="sm" onClick={() => onNavigate("estudio")}>Planificar estudio</Button></CardContent></Card>
      </div>
      <div className="flex flex-wrap gap-2"><Button onClick={() => onNavigate("materias")}><BookOpen className="mr-1 h-4 w-4" />Materia</Button><Button variant="outline" onClick={() => onNavigate("recordatorios")}><Bell className="mr-1 h-4 w-4" />Recordatorio</Button><Button variant="outline" onClick={() => onNavigate("notas")}><GraduationCap className="mr-1 h-4 w-4" />Nota</Button></div>
    </div>
  )
}

function Metric({ title, value, detail }: { title: string; value: string; detail: string }) { return <Card><CardHeader className="pb-2"><CardDescription>{title}</CardDescription><CardTitle>{value}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">{detail}</p></CardContent></Card> }
function Empty({ text }: { text: string }) { return <p className="text-sm text-muted-foreground">{text}</p> }
function StateCard({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) { return <Card><CardHeader><div className="flex items-center gap-2">{icon}<CardTitle>{title}</CardTitle></div><CardDescription>{body}</CardDescription></CardHeader>{action && <CardContent>{action}</CardContent>}</Card> }
