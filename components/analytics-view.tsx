"use client"

import { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { DAY_KEYS, type DayKey } from "@/lib/types"
import type { ScheduleStore } from "@/hooks/use-schedule-store"
import { computeGlobalStats } from "@/lib/grade-utils"
import { useI18n } from "@/components/i18n-provider"
import {
  Clock,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  GraduationCap,
  AlertTriangle,
  Trophy,
  ChartLine,
} from "lucide-react"

interface AnalyticsViewProps {
  store: ScheduleStore
}

function durationInHours(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  return (eh * 60 + em - (sh * 60 + sm)) / 60
}

export function AnalyticsView({ store }: AnalyticsViewProps) {
  const { t, day: tDay } = useI18n()
  const { data, subjectsById } = store
  const { blocks, studyBlocks, modules, grades, subjects, settings } = data
  const scale = settings.gradeScale

  const moduleDurations = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of modules) map.set(m.id, durationInHours(m.start, m.end))
    return map
  }, [modules])

  const hoursPerSubject = useMemo(() => {
    const byId = new Map<string, number>()
    for (const b of blocks) {
      const hours = b.moduleIds.reduce((acc, mid) => acc + (moduleDurations.get(mid) ?? 0), 0)
      byId.set(b.subjectId, (byId.get(b.subjectId) ?? 0) + hours)
    }
    for (const sb of studyBlocks) {
      if (!sb.subjectId) continue
      const h = durationInHours(sb.start, sb.end)
      byId.set(sb.subjectId, (byId.get(sb.subjectId) ?? 0) + h)
    }
    return Array.from(byId.entries())
      .map(([subjectId, hours]) => {
        const s = subjectsById.get(subjectId)
        return {
          id: subjectId,
          name: s?.name ?? "—",
          color: s?.color ?? "#64748b",
          hours: Math.round(hours * 10) / 10,
          difficulty: s?.difficulty ?? 3,
        }
      })
      .sort((a, b) => b.hours - a.hours)
  }, [blocks, studyBlocks, subjectsById, moduleDurations])

  const totalHours = hoursPerSubject.reduce((sum, s) => sum + s.hours, 0)

  const loadByDay = useMemo(() => {
    const map: Record<DayKey, { classHours: number; studyHours: number; load: number }> = {
      lunes: { classHours: 0, studyHours: 0, load: 0 },
      martes: { classHours: 0, studyHours: 0, load: 0 },
      miercoles: { classHours: 0, studyHours: 0, load: 0 },
      jueves: { classHours: 0, studyHours: 0, load: 0 },
      viernes: { classHours: 0, studyHours: 0, load: 0 },
    }
    for (const b of blocks) {
      const s = subjectsById.get(b.subjectId)
      if (!s) continue
      const hours = b.moduleIds.reduce((acc, mid) => acc + (moduleDurations.get(mid) ?? 0), 0)
      map[b.day].classHours += hours
      map[b.day].load += b.moduleIds.length * s.difficulty
    }
    for (const sb of studyBlocks) {
      map[sb.day].studyHours += durationInHours(sb.start, sb.end)
    }
    return map
  }, [blocks, studyBlocks, subjectsById, moduleDurations])

  const mostDemanding = useMemo(() => {
    let winner: DayKey = "lunes"
    let best = -1
    for (const d of DAY_KEYS) {
      const load = loadByDay[d].load
      if (load > best) {
        best = load
        winner = d
      }
    }
    return { day: winner, load: best }
  }, [loadByDay])

  const dayChartData = DAY_KEYS.map((d) => ({
    day: tDay(d, true),
    fullDay: tDay(d),
    carga: loadByDay[d].load,
    horas: Math.round((loadByDay[d].classHours + loadByDay[d].studyHours) * 10) / 10,
    isPeak: d === mostDemanding.day && mostDemanding.load > 0,
  }))

  const academic = useMemo(
    () => computeGlobalStats(subjects, grades, scale),
    [subjects, grades, scale],
  )

  const hasScheduleData = totalHours > 0 || blocks.length > 0
  const hasGrades = grades.length > 0

  const mostDemandingLabel = tDay(mostDemanding.day)

  // Helpers for academic UI
  const bestSubject = academic.global.bestSubjectId
    ? subjectsById.get(academic.global.bestSubjectId)
    : null
  const worstSubject = academic.global.worstSubjectId
    ? subjectsById.get(academic.global.worstSubjectId)
    : null
  const atRiskSubjects = academic.global.atRiskSubjectIds
    .map((id) => subjectsById.get(id))
    .filter(Boolean)
  const TrendIcon =
    academic.global.trend === "up"
      ? TrendingUp
      : academic.global.trend === "down"
        ? TrendingDown
        : Minus

  return (
    <div className="space-y-6">
      {/* === Schedule analytics === */}
      <div>
        <h2 className="text-lg font-semibold">{t("analytics.title")}</h2>
      </div>

      {!hasScheduleData ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t("analytics.empty")}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      {t("analytics.totalHours")}
                    </div>
                    <div className="text-3xl font-semibold mt-1 font-mono">
                      {totalHours.toFixed(1)}
                    </div>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      {t("analytics.busiestDay")}
                    </div>
                    <div className="text-3xl font-semibold mt-1">{mostDemandingLabel}</div>
                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                      {mostDemanding.load}
                    </div>
                  </div>
                  <Flame className="h-8 w-8 text-destructive" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      {t("analytics.subjectBreakdown")}
                    </div>
                    <div className="text-3xl font-semibold mt-1 truncate">
                      {hoursPerSubject[0]?.name ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {hoursPerSubject[0]?.hours.toFixed(1) ?? 0} h
                    </div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("analytics.dailyLoad")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayChartData} margin={{ left: -16, right: 8, top: 8 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />
                    <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--popover)",
                        borderColor: "var(--border)",
                        borderRadius: "var(--radius)",
                        color: "var(--popover-foreground)",
                      }}
                      labelFormatter={(_: unknown, payload: any) =>
                        payload?.[0]?.payload?.fullDay ?? ""
                      }
                    />
                    <Bar dataKey="carga" radius={[6, 6, 0, 0]}>
                      {dayChartData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.isPeak ? "var(--destructive)" : "var(--primary)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {t("analytics.totalHours")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {hoursPerSubject.map((s) => {
                  const pct = totalHours > 0 ? (s.hours / totalHours) * 100 : 0
                  return (
                    <div key={s.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: s.color }}
                          />
                          <span className="truncate font-medium">{s.name}</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                            {t("difficulty.label")} {s.difficulty}
                          </Badge>
                        </div>
                        <span className="font-mono tabular-nums text-muted-foreground">
                          {s.hours.toFixed(1)} h
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: s.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* === Academic analytics === */}
      <div className="pt-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          {t("analytics.academic.title")}
        </h2>
      </div>

      {!hasGrades ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t("analytics.academic.empty")}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  {t("analytics.academic.globalAverage")}
                </div>
                <div className="text-3xl font-semibold mt-1 font-mono tabular-nums">
                  {academic.global.globalWeightedAverage?.toFixed(2) ?? "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t("grade.scale", {
                    min: scale.min,
                    max: scale.max,
                    passing: scale.passing,
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5" />
                  {t("analytics.academic.bestSubject")}
                </div>
                <div className="text-xl font-semibold mt-1 truncate">
                  {bestSubject?.name ?? "—"}
                </div>
                {bestSubject && (
                  <div className="text-xs text-muted-foreground mt-1 font-mono">
                    {academic.perSubject
                      .find((s) => s.subjectId === bestSubject.id)
                      ?.weightedAverage?.toFixed(2)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t("analytics.academic.worstSubject")}
                </div>
                <div className="text-xl font-semibold mt-1 truncate">
                  {worstSubject?.name ?? "—"}
                </div>
                {worstSubject && (
                  <div className="text-xs text-muted-foreground mt-1 font-mono">
                    {academic.perSubject
                      .find((s) => s.subjectId === worstSubject.id)
                      ?.weightedAverage?.toFixed(2)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <ChartLine className="h-3.5 w-3.5" />
                  {t("analytics.academic.trend")}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <TrendIcon className="h-5 w-5 text-primary" />
                  <span className="text-xl font-semibold">
                    {academic.global.trend
                      ? t(`grade.trend.${academic.global.trend}` as const)
                      : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("analytics.subjectBreakdown")}</CardTitle>
              <CardDescription>{t("analytics.academic.coverage")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {academic.perSubject
                .filter((s) => s.count > 0)
                .map((stats) => {
                  const subj = subjectsById.get(stats.subjectId)
                  if (!subj) return null
                  const ItemTrend =
                    stats.trend === "up"
                      ? TrendingUp
                      : stats.trend === "down"
                        ? TrendingDown
                        : Minus
                  return (
                    <div key={stats.subjectId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: subj.color }}
                          />
                          <span className="truncate font-medium">{subj.name}</span>
                          {stats.isPassing === false && (
                            <Badge variant="destructive" className="text-[10px]">
                              {t("grade.atRisk")}
                            </Badge>
                          )}
                          {stats.trend && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <ItemTrend className="h-3 w-3" />
                              {t(`grade.trend.${stats.trend}` as const)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-mono tabular-nums text-foreground font-semibold">
                            {stats.weightedAverage?.toFixed(2) ?? "—"}
                          </span>
                          <span>
                            {t("grade.coverage")}: {Math.round(stats.coverage * 100)}%
                          </span>
                        </div>
                      </div>
                      <Progress value={stats.coverage * 100} className="h-2" />
                    </div>
                  )
                })}
            </CardContent>
          </Card>

          {atRiskSubjects.length > 0 && (
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  {t("analytics.academic.atRiskSubjects")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {atRiskSubjects.map(
                    (s) =>
                      s && (
                        <Badge key={s.id} variant="outline" className="gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          {s.name}
                        </Badge>
                      ),
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
