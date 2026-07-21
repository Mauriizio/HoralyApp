// Pure utilities for academic analytics. No React, no DOM — fully testable.

import type { Grade, GradeScale, Subject } from "./types"

export interface SubjectAcademicStats {
  subjectId: string
  count: number
  weightedAverage: number | null // weighted by `weight` field
  simpleAverage: number | null
  totalWeight: number // sum of weights actually evaluated (0..100+)
  coverage: number // 0..1, clamps `totalWeight / 100`
  isPassing: boolean | null // null when no grades
  distanceToPassing: number | null // weightedAverage - passing
  trend: "up" | "down" | "stable" | null
}

export interface GlobalAcademicStats {
  globalWeightedAverage: number | null
  bestSubjectId: string | null
  worstSubjectId: string | null
  atRiskSubjectIds: string[]
  averageCoverage: number // 0..1
  trend: "up" | "down" | "stable" | null
}

const EPS = 0.05 // grade points considered "stable"

function avg(nums: number[]): number {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

/**
 * Validates that a score lies within a scale.
 */
export function isScoreInScale(score: number, scale: GradeScale): boolean {
  if (Number.isNaN(score)) return false
  return score >= scale.min && score <= scale.max
}

/**
 * Validates a weight is a positive percentage value <= 100 (we allow >100 but warn).
 */
export function isValidWeight(weight: number): boolean {
  return Number.isFinite(weight) && weight > 0 && weight <= 100
}

/**
 * Computes per-subject stats for a single subject.
 */
export function computeSubjectStats(
  subjectId: string,
  grades: Grade[],
  scale: GradeScale,
): SubjectAcademicStats {
  const subjectGrades = grades
    .filter((g) => g.subjectId === subjectId)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))

  if (subjectGrades.length === 0) {
    return {
      subjectId,
      count: 0,
      weightedAverage: null,
      simpleAverage: null,
      totalWeight: 0,
      coverage: 0,
      isPassing: null,
      distanceToPassing: null,
      trend: null,
    }
  }

  const evaluated = subjectGrades.filter((g) => g.score !== null && (g.status ?? "graded") === "graded")
  const totalWeight = evaluated.reduce((acc, g) => acc + (g.weight || 0), 0)
  const weightedSum = evaluated.reduce((acc, g) => acc + (g.score ?? 0) * (g.weight || 0), 0)
  const weightedAverage = totalWeight > 0 ? weightedSum / totalWeight : null
  const simpleAverage = avg(evaluated.map((g) => g.score ?? 0))

  // Trend: compare latest vs previous. With <2 grades → null.
  let trend: "up" | "down" | "stable" | null = null
  if (subjectGrades.length >= 2) {
    const recent = subjectGrades.slice(-3)
    const earlier = subjectGrades.slice(-6, -3)
    if (earlier.length === 0) {
      const last = recent[recent.length - 1].score ?? 0
      const first = recent[0].score ?? 0
      const delta = last - first
      if (Math.abs(delta) <= EPS) trend = "stable"
      else trend = delta > 0 ? "up" : "down"
    } else {
      const a = avg(recent.map((g) => g.score ?? 0))
      const b = avg(earlier.map((g) => g.score ?? 0))
      const delta = a - b
      if (Math.abs(delta) <= EPS) trend = "stable"
      else trend = delta > 0 ? "up" : "down"
    }
  }

  const reference = weightedAverage ?? simpleAverage
  const isPassing = reference !== null ? reference >= scale.passing : null
  const distanceToPassing = reference !== null ? +(reference - scale.passing).toFixed(2) : null

  return {
    subjectId,
    count: subjectGrades.length,
    weightedAverage: weightedAverage !== null ? +weightedAverage.toFixed(2) : null,
    simpleAverage: +simpleAverage.toFixed(2),
    totalWeight,
    coverage: clamp(totalWeight / 100, 0, 1),
    isPassing,
    distanceToPassing,
    trend,
  }
}

/**
 * Aggregates across all subjects.
 */
export function computeGlobalStats(
  subjects: Subject[],
  grades: Grade[],
  scale: GradeScale,
): { perSubject: SubjectAcademicStats[]; global: GlobalAcademicStats } {
  const perSubject = subjects.map((s) => computeSubjectStats(s.id, grades, scale))

  const subjectsWithAvg = perSubject.filter(
    (s): s is SubjectAcademicStats & { weightedAverage: number } => s.weightedAverage !== null,
  )

  const globalWeightedAverage = subjectsWithAvg.length
    ? +(
        subjectsWithAvg.reduce((acc, s) => acc + s.weightedAverage, 0) / subjectsWithAvg.length
      ).toFixed(2)
    : null

  let bestSubjectId: string | null = null
  let worstSubjectId: string | null = null
  if (subjectsWithAvg.length) {
    const sorted = subjectsWithAvg.slice().sort((a, b) => b.weightedAverage - a.weightedAverage)
    bestSubjectId = sorted[0].subjectId
    worstSubjectId = sorted[sorted.length - 1].subjectId
  }

  const atRiskSubjectIds = subjectsWithAvg
    .filter((s) => s.weightedAverage < scale.passing)
    .map((s) => s.subjectId)

  const averageCoverage = perSubject.length
    ? perSubject.reduce((acc, s) => acc + s.coverage, 0) / perSubject.length
    : 0

  // Global trend = mode of per-subject trends.
  const trendCounts: Record<string, number> = { up: 0, down: 0, stable: 0 }
  for (const s of perSubject) {
    if (s.trend) trendCounts[s.trend]++
  }
  const totalTrend = trendCounts.up + trendCounts.down + trendCounts.stable
  let trend: "up" | "down" | "stable" | null = null
  if (totalTrend > 0) {
    const sorted = Object.entries(trendCounts).sort((a, b) => b[1] - a[1])
    trend = sorted[0][0] as "up" | "down" | "stable"
  }

  return {
    perSubject,
    global: {
      globalWeightedAverage,
      bestSubjectId,
      worstSubjectId,
      atRiskSubjectIds,
      averageCoverage,
      trend,
    },
  }
}
