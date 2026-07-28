"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, ChevronDown, Minus, Plus, TrendingDown, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { useI18n } from "@/components/i18n-provider"
import { GradeForm } from "@/components/grade-form"
import { GradingPlanManager } from "@/components/grades/grading-plan-manager"
import { evaluateSubjectGradingPlan } from "@/domain/grading"
import { computeGlobalStats } from "@/lib/grade-utils"
import { isActiveAssessmentGroup } from "@/lib/assessment-groups"
import type { Grade } from "@/lib/types"
import type { ScheduleStore } from "@/hooks/use-schedule-store"

export function GradesPanel({ store }: { store: ScheduleStore }) {
  const { t } = useI18n()
  const { data, addGrade, updateGrade } = store
  const { grades, subjects, settings } = data
  const scale = settings.gradeScale
  const activeGroups = useMemo(
    () => data.assessmentGroups.filter(isActiveAssessmentGroup),
    [data.assessmentGroups],
  )
  const activeGroupIds = useMemo(() => new Set(activeGroups.map((group) => group.id)), [activeGroups])
  const gradesInActiveStructure = useMemo(
    () => grades.filter((grade) => !grade.groupId || activeGroupIds.has(grade.groupId)),
    [grades, activeGroupIds],
  )
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Grade | undefined>()
  const [defaultSubjectId, setDefaultSubjectId] = useState<string | undefined>()
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(
    () => new Set(subjects.length === 1 && subjects[0] ? [subjects[0].id] : []),
  )

  const { perSubject } = useMemo(
    () => computeGlobalStats(subjects, gradesInActiveStructure, scale),
    [subjects, gradesInActiveStructure, scale],
  )
  const projections = useMemo(() => new Map(subjects.map((subject) => {
    const groups = activeGroups.filter((group) => group.subjectId === subject.id)
    const groupIds = new Set(groups.map((group) => group.id))
    const assessments = grades.filter((grade) => grade.groupId && groupIds.has(grade.groupId))
    return [subject.id, evaluateSubjectGradingPlan({
      semesterId: subject.semesterId ?? data.activeSemesterId ?? "",
      subjectId: subject.id,
      groups,
      assessments: assessments.map((grade) => ({
        ...grade,
        groupId: grade.groupId ?? "",
        weightWithinGroup: grade.weightWithinGroup ?? grade.weight,
        scheduledDate: grade.date,
        status: grade.status ?? (grade.score === null ? "planned" : "graded"),
      })),
      scale,
      targetGrade: scale.passing,
    })] as const
  })), [subjects, activeGroups, grades, data.activeSemesterId, scale])

  const onAddForSubject = (subjectId?: string) => {
    setEditing(undefined)
    setDefaultSubjectId(subjectId)
    setOpen(true)
  }
  const onEdit = (grade: Grade) => {
    setEditing(grade)
    setDefaultSubjectId(undefined)
    setOpen(true)
  }
  const setSubjectExpanded = (subjectId: string, expanded: boolean) => {
    setExpandedSubjects((current) => {
      const next = new Set(current)
      if (expanded) next.add(subjectId)
      else next.delete(subjectId)
      return next
    })
  }

  if (subjects.length === 0) {
    return <Empty><EmptyHeader><EmptyTitle>{t("subject.empty")}</EmptyTitle><EmptyDescription>{t("grade.empty")}</EmptyDescription></EmptyHeader></Empty>
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("tabs.grades")}</h2>
          <p className="text-sm text-muted-foreground">{t("grade.scale", { min: scale.min, max: scale.max, passing: scale.passing })}</p>
        </div>
        <Button onClick={() => onAddForSubject()} className="bg-emerald-600 text-white hover:bg-emerald-700">
          <Plus className="mr-1.5 size-4" />{t("grade.create")}
        </Button>
      </div>

      <div className="space-y-4">
        {subjects.map((subject) => {
          const expanded = expandedSubjects.has(subject.id)
          const projection = projections.get(subject.id)
          const stats = perSubject.find((item) => item.subjectId === subject.id)
          const activeAssessments = grades.filter((grade) => grade.subjectId === subject.id && (!grade.groupId || activeGroupIds.has(grade.groupId)))
          const gradedCount = activeAssessments.filter((grade) => (grade.status ?? "graded") === "graded" && grade.score !== null).length
          const coverage = Math.min(100, projection?.groups.reduce((total, group) => total + group.effectiveEvaluatedWeight, 0) ?? 0)
          const remaining = Math.max(0, 100 - coverage)
          const configurationComplete = projection?.validity.isValid ?? false
          const evaluationComplete = configurationComplete && coverage >= 99.999
          const TrendIcon = stats?.trend === "up" ? TrendingUp : stats?.trend === "down" ? TrendingDown : Minus
          const showRisk = projection?.status === "at_risk" || projection?.status === "requires_attention"

          return (
            <Collapsible key={subject.id} open={expanded} onOpenChange={(next) => setSubjectExpanded(subject.id, next)}>
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: subject.color }} aria-hidden="true" />
                        <CardTitle className="truncate text-base">{subject.name}</CardTitle>
                        {showRisk && <Badge variant="destructive" className="gap-1"><AlertTriangle className="size-3" />Requiere atención</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>Promedio actual evaluado: <strong className="text-foreground">{projection?.evaluatedAverage?.toFixed(1) ?? "Sin datos"}</strong></span>
                        <span>Cobertura: {coverage.toFixed(2)}%</span>
                        <span>Restante: {remaining.toFixed(2)}%</span>
                        <span>Evaluaciones: {gradedCount} de {activeAssessments.length}</span>
                        {stats?.trend && <span className="flex items-center gap-1"><TrendIcon className="size-3" />{t(`grade.trend.${stats.trend}` as const)}</span>}
                      </div>
                      <p className="text-xs font-medium">
                        {evaluationComplete
                          ? `Evaluación completa${projection?.definitiveFinalGrade !== null ? ` · Nota final: ${projection?.definitiveFinalGrade}` : ""}`
                          : configurationComplete ? "Evaluación en progreso" : "Configuración incompleta"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => onAddForSubject(subject.id)}>
                        <Plus className="mr-1 size-3.5" />{t("common.add")}
                      </Button>
                      <CollapsibleTrigger asChild>
                        <Button size="sm" variant="outline" aria-expanded={expanded}>
                          <ChevronDown className={`mr-1 size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                          {expanded ? "Contraer" : "Expandir"}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    <GradingPlanManager store={store} subject={subject} onEditAssessment={onEdit} />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )
        })}
      </div>

      <GradeForm
        open={open}
        onOpenChange={setOpen}
        subjects={subjects}
        groups={data.assessmentGroups}
        assessments={grades}
        scale={scale}
        initial={editing}
        defaultSubjectId={defaultSubjectId}
        lockSubject={Boolean(defaultSubjectId)}
        onApplyTwoGroupPreset={(subjectId) => store.applyGradingPreset(subjectId, "presentation60Transversal40")}
        onSubmit={(values) => {
          if (editing) updateGrade(editing.id, values)
          else addGrade(values)
        }}
      />
    </>
  )
}
