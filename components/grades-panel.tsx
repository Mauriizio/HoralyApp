"use client"

import { useMemo, useState } from "react"
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { useI18n } from "@/components/i18n-provider"
import { GradeForm } from "@/components/grade-form"
import { computeGlobalStats } from "@/lib/grade-utils"
import type { Grade } from "@/lib/types"
import type { ScheduleStore } from "@/hooks/use-schedule-store"

export function GradesPanel({ store }: { store: ScheduleStore }) {
  const { t } = useI18n()
  const { data, addGrade, updateGrade, deleteGrade, subjectsById } = store
  const { grades, subjects, settings } = data
  const scale = settings.gradeScale

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Grade | undefined>()
  const [defaultSubjectId, setDefaultSubjectId] = useState<string | undefined>()

  const { perSubject } = useMemo(
    () => computeGlobalStats(subjects, grades, scale),
    [subjects, grades, scale],
  )

  const onAddForSubject = (subjectId?: string) => {
    setEditing(undefined)
    setDefaultSubjectId(subjectId)
    setOpen(true)
  }

  const onEdit = (g: Grade) => {
    setEditing(g)
    setDefaultSubjectId(undefined)
    setOpen(true)
  }

  if (subjects.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t("subject.empty")}</EmptyTitle>
          <EmptyDescription>{t("grade.empty")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">{t("tabs.grades")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("grade.scale", { min: scale.min, max: scale.max, passing: scale.passing })}
          </p>
        </div>
        <Button onClick={() => onAddForSubject()}>
          <Plus className="h-4 w-4 mr-1.5" />
          {t("grade.create")}
        </Button>
      </div>

      <div className="space-y-4">
        {subjects.map((subject) => {
          const subjectGrades = grades
            .filter((g) => g.subjectId === subject.id)
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date))
          const stats = perSubject.find((p) => p.subjectId === subject.id)
          const TrendIcon =
            stats?.trend === "up"
              ? TrendingUp
              : stats?.trend === "down"
                ? TrendingDown
                : Minus
          const showRisk =
            stats?.isPassing === false ||
            (stats?.distanceToPassing !== null &&
              stats?.distanceToPassing !== undefined &&
              stats.distanceToPassing < 0.5 &&
              stats.distanceToPassing >= 0)

          return (
            <Card key={subject.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: subject.color }}
                    />
                    <CardTitle className="text-base truncate">{subject.name}</CardTitle>
                    {showRisk && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {t("grade.atRisk")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {stats && stats.weightedAverage !== null && (
                      <span className="font-mono tabular-nums text-foreground font-semibold">
                        {stats.weightedAverage.toFixed(2)}
                      </span>
                    )}
                    {stats?.trend && (
                      <span className="flex items-center gap-1">
                        <TrendIcon className="h-3 w-3" />
                        {t(`grade.trend.${stats.trend}` as const)}
                      </span>
                    )}
                    <span>
                      {t("grade.coverage")}: {Math.round((stats?.coverage ?? 0) * 100)}%
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onAddForSubject(subject.id)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      {t("common.add")}
                    </Button>
                  </div>
                </div>
                {stats?.weightedAverage !== null && stats?.weightedAverage !== undefined && (
                  <CardDescription className="pt-1">
                    {stats.isPassing ? t("grade.passing") : t("grade.failing")} ·{" "}
                    {t("grade.distance")}:{" "}
                    <span className="font-mono">
                      {stats.distanceToPassing! >= 0 ? "+" : ""}
                      {stats.distanceToPassing!.toFixed(2)}
                    </span>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                {subjectGrades.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {t("grade.empty")}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {subjectGrades.map((g) => {
                      const isPassing = g.score >= scale.passing
                      return (
                        <li
                          key={g.id}
                          className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40 group"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{g.title}</div>
                            <div className="text-xs text-muted-foreground">{g.date}</div>
                          </div>
                          <Badge
                            variant={isPassing ? "secondary" : "destructive"}
                            className="font-mono tabular-nums"
                          >
                            {g.score.toFixed(1)}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono w-10 text-right">
                            {g.weight}%
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                            onClick={() => onEdit(g)}
                            aria-label={t("common.edit")}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 opacity-100 md:opacity-0 md:group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteGrade(g.id)}
                            aria-label={t("common.delete")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <GradeForm
        open={open}
        onOpenChange={setOpen}
        subjects={subjects}
        scale={scale}
        initial={editing}
        defaultSubjectId={defaultSubjectId}
        onSubmit={(values) => {
          if (editing) updateGrade(editing.id, values)
          else addGrade(values)
        }}
      />
    </>
  )
}
