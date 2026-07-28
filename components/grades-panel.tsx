"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, ChevronDown, Minus, Plus, TrendingDown, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useI18n } from "@/components/i18n-provider"
import { GradeForm } from "@/components/grade-form"
import { GradingPlanManager } from "@/components/grades/grading-plan-manager"
import { evaluateSubjectGradingPlan } from "@/domain/grading"
import { computeGlobalStats } from "@/lib/grade-utils"
import { getAvailableAssessmentGroups, getSubjectStructureStatus, isActiveAssessmentGroup, type GradingPresetId } from "@/lib/assessment-groups"
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
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false)
  const [configuringSubjectId, setConfiguringSubjectId] = useState<string | undefined>()
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
    if (!subjectId) {
      setSubjectPickerOpen(true)
      return
    }
    const structureStatus = getSubjectStructureStatus(data.assessmentGroups, grades, subjectId)
    if (structureStatus === "missing") {
      setConfiguringSubjectId(subjectId)
      return
    }
    if (structureStatus === "invalid") {
      setSubjectExpanded(subjectId, true)
      return
    }
    if (getAvailableAssessmentGroups(data.assessmentGroups, grades, subjectId).length === 0) return
    setEditing(undefined)
    setDefaultSubjectId(subjectId)
    setOpen(true)
  }
  const configureSubject = (preset: GradingPresetId) => {
    const subjectId = configuringSubjectId
    if (!subjectId) return
    if (preset === "custom") {
      const subject = subjects.find((item) => item.id === subjectId)
      store.createAssessmentGroup({
        semesterId: subject?.semesterId ?? data.activeSemesterId ?? "",
        subjectId,
        name: "Grupo personalizado",
        kind: "custom",
        courseWeight: 100,
        position: 1,
      })
    } else {
      store.applyGradingPreset(subjectId, preset)
    }
    setConfiguringSubjectId(undefined)
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
          <p className="text-sm text-muted-foreground">Escala {scale.min.toFixed(1)} a {scale.max.toFixed(1)} · aprobación {scale.passing.toFixed(1)}</p>
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
          const structureStatus = getSubjectStructureStatus(data.assessmentGroups, grades, subject.id)
          const availableGroups = getAvailableAssessmentGroups(data.assessmentGroups, grades, subject.id)
          const evaluationComplete = configurationComplete && coverage >= 99.999
          const TrendIcon = stats?.trend === "up" ? TrendingUp : stats?.trend === "down" ? TrendingDown : Minus
          const showRisk = projection?.status === "at_risk" || projection?.status === "requires_attention"

          if (structureStatus === "missing") return (
            <Card key={subject.id}>
              <CardHeader className="flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="size-3 rounded-full" style={{ backgroundColor: subject.color }} aria-hidden="true" />
                    {subject.name}
                  </CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">Sin evaluaciones · Configuración pendiente</p>
                </div>
                <Button size="sm" onClick={() => setConfiguringSubjectId(subject.id)}>Configurar evaluación</Button>
              </CardHeader>
            </Card>
          )

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
                        <span>Promedio actual evaluado: <strong className="text-lg text-foreground">{projection?.evaluatedAverage?.toFixed(1) ?? "Sin datos"}</strong></span>
                        <span>Cobertura: {coverage.toFixed(2)}%</span>
                        <span>Restante: {remaining.toFixed(2)}%</span>
                        <span>Evaluaciones: {gradedCount} de {activeAssessments.length}</span>
                        {stats?.trend && <span className="flex items-center gap-1"><TrendIcon className="size-3" />{t(`grade.trend.${stats.trend}` as const)}</span>}
                      </div>
                      <p className="text-xs font-medium">
                        {evaluationComplete
                          ? `Evaluación completa${projection?.definitiveFinalGrade !== null ? ` · Nota final: ${projection?.definitiveFinalGrade}` : ""}`
                          : structureStatus === "invalid" ? "Estructura requiere revisión" : "Evaluación en progreso"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {structureStatus === "invalid" ? (
                        <Button size="sm" variant="outline" onClick={() => setSubjectExpanded(subject.id, true)}>Revisar estructura</Button>
                      ) : availableGroups.length > 0 ? (
                        <Button size="sm" variant="ghost" onClick={() => onAddForSubject(subject.id)}>
                          <Plus className="mr-1 size-3.5" />{t("common.add")}
                        </Button>
                      ) : <span className="text-xs text-muted-foreground">Estructura completa</span>}
                      <CollapsibleTrigger asChild>
                        <Button size="sm" variant="outline" className="border-primary/50 bg-primary/5 text-primary hover:bg-primary/15" aria-expanded={expanded}>
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

      <Dialog open={subjectPickerOpen} onOpenChange={setSubjectPickerOpen}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecciona una materia</DialogTitle>
            <DialogDescription>Las materias completas se muestran sin acción de registro.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {subjects.map((subject) => {
              const status = getSubjectStructureStatus(data.assessmentGroups, grades, subject.id)
              const canAdd = status !== "valid" || getAvailableAssessmentGroups(data.assessmentGroups, grades, subject.id).length > 0
              return <Button key={subject.id} variant="outline" className="w-full justify-between" disabled={!canAdd} onClick={() => {
                setSubjectPickerOpen(false)
                onAddForSubject(subject.id)
              }}>
                {subject.name}<span className="text-xs text-muted-foreground">{!canAdd ? "Completa" : status === "missing" ? "Configurar" : status === "invalid" ? "Revisar" : "Registrar"}</span>
              </Button>
            })}
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setSubjectPickerOpen(false)}>Cancelar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(configuringSubjectId)} onOpenChange={(next) => { if (!next) setConfiguringSubjectId(undefined) }}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configura cómo se calculará esta asignatura</DialogTitle>
            <DialogDescription>Define la estructura antes de registrar la primera nota. Podrás ajustarla después.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button variant="outline" onClick={() => configureSubject("continuous100")}>Continua 100%</Button>
            <Button variant="outline" onClick={() => configureSubject("presentation60Transversal40")}>Parciales 60% + transversal 40%</Button>
            <Button variant="outline" onClick={() => configureSubject("laboratoryTheoryTransversal")}>Laboratorio + teoría + transversal</Button>
            <Button variant="outline" onClick={() => configureSubject("custom")}>Estructura personalizada</Button>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setConfiguringSubjectId(undefined)}>Cancelar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

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
