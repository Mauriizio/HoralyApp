// Core domain types for the weekly schedule app.
// UI strings are translated via lib/i18n.ts based on settings.language.

export type DayKey =
  | "lunes"
  | "martes"
  | "miercoles"
  | "jueves"
  | "viernes"
  | "sabado"
  | "domingo"

export const DAY_KEYS: DayKey[] = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
]
export const WEEKDAY_KEYS: DayKey[] = ["lunes", "martes", "miercoles", "jueves", "viernes"]

// Default (Spanish) labels for legacy components. Use useI18n().day(key) for translated values.
export const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: "lunes", label: "Lunes", short: "Lun" },
  { key: "martes", label: "Martes", short: "Mar" },
  { key: "miercoles", label: "Miércoles", short: "Mié" },
  { key: "jueves", label: "Jueves", short: "Jue" },
  { key: "viernes", label: "Viernes", short: "Vie" },
  { key: "sabado", label: "Sábado", short: "Sáb" },
  { key: "domingo", label: "Domingo", short: "Dom" },
]

// User-customizable time modules (morning/afternoon/evening blocks).
export interface TimeModule {
  id: string
  start: string // "HH:MM"
  end: string // "HH:MM"
  label: string
}

export const DEFAULT_MODULES: TimeModule[] = [
  { id: "m1", start: "13:41", end: "14:20", label: "Módulo 1" },
  { id: "m2", start: "14:21", end: "15:10", label: "Módulo 2" },
  { id: "m3", start: "15:11", end: "15:50", label: "Módulo 3" },
  { id: "m4", start: "16:01", end: "16:40", label: "Módulo 4" },
  { id: "m5", start: "16:41", end: "17:20", label: "Módulo 5" },
  { id: "m6", start: "17:31", end: "18:10", label: "Módulo 6" },
]

// Quick presets the user can apply with one click.
export const MODULE_PRESETS: { id: "morning" | "afternoon" | "evening"; modules: TimeModule[] }[] = [
  {
    id: "morning",
    modules: [
      { id: "am1", start: "07:30", end: "08:15", label: "Módulo 1" },
      { id: "am2", start: "08:15", end: "09:00", label: "Módulo 2" },
      { id: "am3", start: "09:15", end: "10:00", label: "Módulo 3" },
      { id: "am4", start: "10:00", end: "10:45", label: "Módulo 4" },
      { id: "am5", start: "11:00", end: "11:45", label: "Módulo 5" },
      { id: "am6", start: "11:45", end: "12:30", label: "Módulo 6" },
    ],
  },
  {
    id: "afternoon",
    modules: [
      { id: "pm1", start: "13:41", end: "14:20", label: "Módulo 1" },
      { id: "pm2", start: "14:21", end: "15:10", label: "Módulo 2" },
      { id: "pm3", start: "15:11", end: "15:50", label: "Módulo 3" },
      { id: "pm4", start: "16:01", end: "16:40", label: "Módulo 4" },
      { id: "pm5", start: "16:41", end: "17:20", label: "Módulo 5" },
      { id: "pm6", start: "17:31", end: "18:10", label: "Módulo 6" },
    ],
  },
  {
    id: "evening",
    modules: [
      { id: "ev1", start: "18:30", end: "19:15", label: "Módulo 1" },
      { id: "ev2", start: "19:15", end: "20:00", label: "Módulo 2" },
      { id: "ev3", start: "20:15", end: "21:00", label: "Módulo 3" },
      { id: "ev4", start: "21:00", end: "21:45", label: "Módulo 4" },
    ],
  },
]

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  1: "Muy fácil",
  2: "Fácil",
  3: "Normal",
  4: "Difícil",
  5: "Muy difícil",
}

export interface Subject {
  id: string
  semesterId?: string
  name: string
  color: string
  icon?: string
  notes?: string
  commandKey?: string
  difficulty: DifficultyLevel
  createdAt: number
}

export interface ScheduleBlock {
  id: string
  semesterId?: string
  subjectId: string
  day: DayKey
  moduleIds: string[]
}

export interface StudyBlock {
  id: string
  semesterId?: string
  title: string
  subjectId?: string
  day: DayKey
  start: string
  end: string
  notes?: string
}

export type ReminderPriority = "baja" | "media" | "alta"

export type ReminderTrigger =
  | { kind: "hoursBefore"; hours: number }
  | { kind: "dayBefore" }
  | { kind: "customDateTime"; datetime: string }

export interface Reminder {
  id: string
  semesterId?: string
  subjectId?: string
  studyBlockId?: string
  title: string
  description?: string
  priority: ReminderPriority
  triggers: ReminderTrigger[]
  targetDateTime: string
  createdAt: number
  notifiedTriggerIndexes: number[]
}

// --- New: grades / evaluations ---
export type AssessmentGroupKind = "continuous" | "laboratory" | "project" | "final_exam" | "custom"
export type AssessmentStatus = "planned" | "graded" | "missing" | "exempt"

export interface AssessmentGroup {
  id: string
  semesterId: string
  subjectId: string
  name: string
  kind: AssessmentGroupKind
  courseWeight: number
  position: number
  createdAt: number
}

export interface Grade {
  id: string
  semesterId?: string
  subjectId: string
  groupId?: string
  title: string
  score: number | null
  weight: number // legacy/effective internal percentage 0-100
  weightWithinGroup?: number
  date: string // ISO date (YYYY-MM-DD)
  status?: AssessmentStatus
  notes?: string
  createdAt: number
}

export interface GradeScale {
  min: number
  max: number
  passing: number
}

export type GradeScalePresetId = "chile" | "custom"

export const GRADE_SCALE_PRESETS: { id: GradeScalePresetId; scale: GradeScale }[] = [
  { id: "chile", scale: { min: 1, max: 7, passing: 4 } },
  { id: "custom", scale: { min: 0, max: 100, passing: 60 } },
]

// --- New: user profile ---
export interface UserProfile {
  displayName: string
  avatar?: string // data URL
  institution?: string
  career?: string
  timezone?: string
  onboardingCompletedAt?: string
}

export interface Semester {
  id: string
  name: string
  startsOn?: string
  endsOn?: string
  status: "planned" | "active" | "archived"
  createdAt: number
}

export interface OnboardingState {
  currentStep: number
  completed: boolean
  updatedAt?: string
  activationCompletedAt?: string
  draftSubjectName?: string
  draftSemesterName?: string
}

export const DEFAULT_PROFILE: UserProfile = {
  displayName: "",
}

// User customization.
export type ThemeMode = "light" | "dark" | "system"
export type Language = "es" | "en"

export interface AppSettings {
  theme: ThemeMode
  language: Language
  accentColor: string
  fontFamily:
    | "sans"
    | "serif"
    | "mono"
    | "system"
    | "rounded"
    | "display"
    | "clean"
    | "friendly"
    | "classic"
    | "tech"
  fontScale: number
  timeFormat: "12h" | "24h"
  radius: number
  blockOpacity: number
  focusMode: boolean
  enableSaturday: boolean
  googleCalendarConnected: boolean
  gradeScale: GradeScale
  onboarding: OnboardingState
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  language: "es",
  accentColor: "#7c3aed",
  fontFamily: "sans",
  fontScale: 1,
  timeFormat: "24h",
  radius: 0.875,
  blockOpacity: 0.9,
  focusMode: false,
  enableSaturday: false,
  googleCalendarConnected: false,
  gradeScale: { min: 1, max: 7, passing: 4 },
  onboarding: { currentStep: 0, completed: false },
}

export interface AppData {
  subjects: Subject[]
  blocks: ScheduleBlock[]
  studyBlocks: StudyBlock[]
  reminders: Reminder[]
  modules: TimeModule[]
  grades: Grade[]
  assessmentGroups: AssessmentGroup[]
  profile: UserProfile
  settings: AppSettings
  semesters: Semester[]
  activeSemesterId?: string
  version: 4
}

export const EMPTY_APP_DATA: AppData = {
  subjects: [],
  blocks: [],
  studyBlocks: [],
  reminders: [],
  modules: DEFAULT_MODULES,
  grades: [],
  assessmentGroups: [],
  profile: DEFAULT_PROFILE,
  settings: DEFAULT_SETTINGS,
  semesters: [],
  activeSemesterId: undefined,
  version: 4,
}
