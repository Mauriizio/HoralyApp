"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import {
  CalendarDays,
  BookOpen,
  Bell,
  BookMarked,
  Zap,
  Keyboard,
  Plus,
  Sparkles,
  GraduationCap,
  Settings,
  Cloud,
  HardDrive,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useScheduleStore } from "@/hooks/use-schedule-store"
import { ThemeApplier } from "@/components/theme-applier"
import { ScheduleGrid } from "@/components/schedule-grid"
import { SubjectsPanel } from "@/components/subjects-panel"
import { RemindersPanel } from "@/components/reminders-panel"
import { StudyBlocksPanel } from "@/components/study-blocks-panel"
import { GradesPanel } from "@/components/grades-panel"
import { AnalyticsView } from "@/components/analytics-view"
import { SettingsView } from "@/components/settings-view"
import { SubjectForm } from "@/components/subject-form"
import { ReminderForm } from "@/components/reminder-form"
import { StudyBlockForm } from "@/components/study-block-form"
import { GradeForm } from "@/components/grade-form"
import { QuickAdd, type QuickAction } from "@/components/quick-add"
import { ProfileButton } from "@/components/profile-button"
import { MigrationModal } from "@/components/migration-modal"
import { InstallAppButton } from "@/components/install-app-button"
import { HorarilySpeakingCard } from "@/components/HorarilySpeakingCard"
import { HorarilyCompanion } from "@/components/horarily/horarily-companion"
import { AcademicDashboard } from "@/components/dashboard/academic-dashboard"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { PluginsView } from "@/components/tools/plugins-view"
import { NotebookView } from "@/components/notebook/notebook-view"
import { I18nProvider, useI18n } from "@/components/i18n-provider"
import type { DayKey, Subject } from "@/lib/types"
import { getHorarilyCompanionMessage } from "@/domain/horarily-companion"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { GuestAuthActions } from "@/components/auth/guest-auth-actions"
import { AppShell } from "@/components/app-shell/app-shell"
import { evaluateActivation } from "@/application/activation"
import { getTabUrl, isAppTab, type AppTab } from "@/components/app-shell/navigation"
import { GuidedTour } from "@/components/tutorials/guided-tour"
import { FirstStepsChecklist } from "@/components/tutorials/first-steps-checklist"
import { useTutorialProgress } from "@/hooks/use-tutorial-progress"
import { TUTORIAL_REGISTRY, type TutorialId } from "@/lib/tutorials"
import type { TutorialProgressMap } from "@/lib/tutorial-progress"

type TutorialStartMode = "manual" | "automatic" | "resume"

const DAY_INDEX_TO_KEY: Record<number, DayKey | null> = {
  0: "domingo",
  1: "lunes",
  2: "martes",
  3: "miercoles",
  4: "jueves",
  5: "viernes",
  6: "sabado",
}

function HomePageInner({ store }: { store: ReturnType<typeof useScheduleStore> }) {
  const {
    data,
    createSubject,
    updateSubject,
    addReminder,
    addStudyBlock,
    addGrade,
    updateProfile,
    updateSettings,
  } = store
  const { t, day: tDay } = useI18n()
  const [tab, setTab] = useState<AppTab>("dashboard")
  const [quickOpen, setQuickOpen] = useState(false)
  const { authenticated, loading: authLoading, transitioning } = useAuth()
  const persistTutorialProgress = useCallback((progress: TutorialProgressMap, context: { expectedUserId: string; expectedAuthGeneration: number }) => {
    return store.updateSettingsConfirmed({ tutorialProgress: progress }, context)
  }, [store.updateSettingsConfirmed])
  const tutorials = useTutorialProgress({
    cloudProgress: data.settings.tutorialProgress as TutorialProgressMap | undefined,
    persistCloudProgress: persistTutorialProgress,
  })
  const [activeTutorial, setActiveTutorial] = useState<TutorialId | null>(null)

  const [subjectOpen, setSubjectOpen] = useState(false)
  const [subjectEditing, setSubjectEditing] = useState<Subject | undefined>()
  const [reminderOpen, setReminderOpen] = useState(false)
  const [studyOpen, setStudyOpen] = useState(false)
  const [gradeOpen, setGradeOpen] = useState(false)

  const todayKey = useMemo(() => DAY_INDEX_TO_KEY[new Date().getDay()], [])
  const focusDay =
    todayKey === "sabado" && !data.settings.enableSaturday ? null : todayKey
  const showFocus = data.settings.focusMode && focusDay && focusDay !== "domingo"

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedTab = params.get("tab")
    if (isAppTab(requestedTab)) {
      setTab(requestedTab)
    }
  }, [])

  const navigateTo = useCallback((nextTab: AppTab) => {
    setTab(nextTab)
    window.history.replaceState(null, "", getTabUrl(nextTab, window.location.search))
  }, [])
  const tutorialIdentityRef = useRef(tutorials.identity)
  const startLockRef = useRef(false)
  const startTutorial = useCallback(({ id, mode }: { id: TutorialId; mode: TutorialStartMode }) => {
    if (!tutorials.ready || startLockRef.current) return
    const definition = TUTORIAL_REGISTRY[id]
    const current = tutorials.get(id)
    if (mode === "automatic" && current.status !== "not-started") return
    startLockRef.current = true
    setActiveTutorial(null)
    navigateTo(definition.entryTab)
    const currentStep = mode === "resume" && current.status === "in-progress"
      ? current.currentStep
      : 0
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        tutorials.update(id, { status: "in-progress", currentStep })
        setActiveTutorial(id)
        startLockRef.current = false
      })
    })
  }, [navigateTo, tutorials])

  useEffect(() => {
    if (!tutorials.ready || activeTutorial) return
    const contextual: Partial<Record<AppTab, TutorialId>> = {
      horario: "schedule-tour",
      notas: "grades-tour",
      recordatorios: "reminders-tour",
      herramientas: "tools-tour",
      cuaderno: "notebook-tour",
      preferencias: "preferences-tour",
    }
    const id = contextual[tab]
    if (id && tutorials.get(id).status === "not-started") startTutorial({ id, mode: "automatic" })
    if (tab === "analitica" && data.grades.length > 0 && tutorials.get("analytics-tour").status === "not-started") {
      startTutorial({ id: "analytics-tour", mode: "automatic" })
    }
  }, [activeTutorial, data.grades.length, startTutorial, tab, tutorials])

  useEffect(() => {
    if (tutorialIdentityRef.current === tutorials.identity) return
    tutorialIdentityRef.current = tutorials.identity
    setActiveTutorial(null)
  }, [tutorials.identity])
  const openSubjectCreation = () => {
    const requiresAcademicSetup = evaluateActivation(store.allData, {
      hydrated: store.hydrated,
      identityReady: store.identityReady,
      transitioning,
    }).kind !== "ready"
    if (requiresAcademicSetup) {
      navigateTo("onboarding")
      return
    }
    setSubjectEditing(undefined)
    setSubjectOpen(true)
  }

  const handleQuickAction = (action: QuickAction) => {
    setQuickOpen(false)
    switch (action) {
      case "new-subject":
        openSubjectCreation()
        break
      case "new-reminder":
        setReminderOpen(true)
        break
      case "new-study-block":
        setStudyOpen(true)
        break
      case "new-grade":
        setGradeOpen(true)
        break
      case "toggle-focus":
        updateSettings({ focusMode: !data.settings.focusMode })
        break
      case "theme-light":
        updateSettings({ theme: "light" })
        break
      case "theme-dark":
        updateSettings({ theme: "dark" })
        break
      case "theme-system":
        updateSettings({ theme: "system" })
        break
    }
  }

  const openEditSubject = (s: Subject) => {
    setSubjectEditing(s)
    setSubjectOpen(true)
  }

  const subjectCount = data.subjects.length
  const blockCount = data.blocks.length

  const companion = useMemo(() => {
    const modules = new Map(data.modules.map((module) => [module.id, module]))
    return getHorarilyCompanionMessage({
      reminders: data.reminders,
      assessments: data.grades,
      subjects: data.subjects.map((subject) => ({ name: subject.name, requiresAttention: subject.difficulty >= 4 })),
      classes: data.blocks.flatMap((block) => {
        const subject = data.subjects.find((item) => item.id === block.subjectId)
        const ordered = block.moduleIds.map((id) => modules.get(id)).filter((item): item is NonNullable<typeof item> => Boolean(item)).sort((a, b) => a.start.localeCompare(b.start))
        return subject && ordered.length ? [{ subjectName: subject.name, day: block.day, start: ordered[0].start, end: ordered.at(-1)!.end }] : []
      }),
    }, new Date())
  }, [data])

  const hasAnyData =
    data.subjects.length > 0 ||
    data.blocks.length > 0 ||
    data.reminders.length > 0 ||
    data.studyBlocks.length > 0 ||
    data.grades.length > 0

  const addSubjectFromConsole = ({ name, commandKey }: { name: string; commandKey?: string }) => {
    const result = store.createSubject({ name, commandKey })
    if (result.kind !== "created") return null
    return { name: result.subject.name, commandKey: result.subject.commandKey ?? "" }
  }

  const addGradeFromConsole = ({
    commandKey,
    score,
    title,
    weight,
  }: {
    commandKey: string
    score: number
    title: string
    weight: number
  }) => {
    const subject = data.subjects.find((s) => (s.commandKey ?? "").toUpperCase() === commandKey.toUpperCase())
    if (!subject) return false
    addGrade({
      subjectId: subject.id,
      title: title.trim(),
      score,
      weight,
      date: new Date().toISOString().slice(0, 10),
    })
    return true
  }

  if (transitioning || !store.identityReady) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Cambiando de cuenta…
      </div>
    )
  }

  if (!store.hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t("app.loading")}
      </div>
    )
  }

  const activation = evaluateActivation(store.allData, {
    hydrated: store.hydrated,
    identityReady: store.identityReady,
    transitioning,
  })

  if (activation.kind !== "ready") {
    return (
      <>
        <ThemeApplier settings={data.settings} />
        <OnboardingFlow
          store={store}
          initialStep={"resumeStep" in activation ? activation.resumeStep : undefined}
          onDone={(startBasic) => {
            navigateTo("dashboard")
            if (startBasic) startTutorial({ id: "basic-tour", mode: "manual" })
          }}
        />
      </>
    )
  }

  return (
    <>
      <ThemeApplier settings={data.settings} />

      <AppShell
        activeTab={tab}
        onNavigate={navigateTo}
        syncMessage={store.syncMessage}
        header={
        <header className="sticky top-0 z-30 border-b border-border/80 bg-background/88 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-2 font-semibold sm:flex-initial lg:hidden">
              <div className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md bg-primary/10"><Image src="/logo/horarily_mascot_logo.svg" alt="" width={32} height={32} className="size-8 object-contain" /></div>
              <span className="text-sm sm:text-base truncate">{t("app.title")}</span>
              {showFocus && (
                <Badge variant="secondary" className="ml-1 hidden md:inline-flex shrink-0">
                  <Zap className="h-3 w-3 mr-1" />
                  {t("header.focusMode")}
                </Badge>
              )}
            </div>

            <div className="hidden sm:block flex-1" />

            <Badge variant="outline" className="hidden shrink-0 xl:inline-flex" title={store.syncMessage}>
              {store.syncStatus === "synced" || store.syncStatus === "syncing" ? <Cloud className="h-3 w-3 mr-1" /> : <HardDrive className="h-3 w-3 mr-1" />}
              {store.syncMessage}
            </Badge>
            {store.syncStatus === "error" && (
              <Button variant="outline" size="sm" className="hidden sm:inline-flex shrink-0" onClick={store.retrySync}>Reintentar</Button>
            )}
            <div className="hidden sm:block">
              <GuestAuthActions loading={authLoading} authenticated={authenticated} />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="hidden shrink-0 xl:inline-flex"
              onClick={() => setQuickOpen(true)}
            >
              <Keyboard className="h-3.5 w-3.5 mr-1.5" />
              {t("header.quickActions")}
              <KbdGroup className="ml-2">
                <Kbd>Ctrl</Kbd>
                <Kbd>K</Kbd>
              </KbdGroup>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="shrink-0" aria-label={t("common.add")}>
                  <Plus className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">{t("common.add")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={openSubjectCreation}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  {t("header.newSubject")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setReminderOpen(true)}>
                  <Bell className="h-4 w-4 mr-2" />
                  {t("header.newReminder")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStudyOpen(true)}>
                  <BookMarked className="h-4 w-4 mr-2" />
                  {t("header.newStudyBlock")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGradeOpen(true)}>
                  <GraduationCap className="h-4 w-4 mr-2" />
                  {t("header.newGrade")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => navigateTo("preferencias")}
              aria-label={t("tabs.settings")}
              title={t("tabs.settings")}
            >
              <Settings className="h-4 w-4" />
            </Button>

            {authenticated && <ProfileButton store={store} />}
          </div>
        </header>
        }
      >
          {!activeTutorial && <HorarilyCompanion message={companion.message} action={companion.action} onNavigate={navigateTo} />}

          {/* Advanced console */}
          {data.settings.advancedModeEnabled && <div className="mb-4">
            <HorarilySpeakingCard
              hideMascot
              suspended={Boolean(activeTutorial)}
              userName={data.profile.displayName}
              message={companion.message}
              commandContext={{
                nextClassText: companion.message,
                subjects: data.subjects.map((s) => ({
                  id: s.id,
                  name: s.name,
                  commandKey: s.commandKey,
                })),
                grades: data.grades.map((g) => ({
                  subjectId: g.subjectId,
                  title: g.title,
                  score: g.score ?? 0,
                  date: g.date,
                  weight: g.weight,
                })),
                reminders: data.reminders.map((r) => ({
                  title: r.title,
                  targetDateTime: r.targetDateTime,
                })),
                passingGrade: data.settings.gradeScale.passing,
                hasAnyData,
                language: data.settings.language,
              }}
              commandActions={{
                addSubject: addSubjectFromConsole,
                addGrade: addGradeFromConsole,
                updateProfileName: (name) => updateProfile({ displayName: name }),
                openSubjectForm: openSubjectCreation,
                openGradeForm: () => {
                  if (data.assessmentGroups.length === 0) {
                    navigateTo("notas")
                    return
                  }
                  setGradeOpen(true)
                },
                openSchedule: () => navigateTo("horario"),
                openReminderForm: () => setReminderOpen(true),
                openTools: () => navigateTo("herramientas"),
                openNotebook: () => navigateTo("cuaderno"),
                createNote: async ({ subjectId, title, unit, content }) => {
                  const subject = data.subjects.find((item) => item.id === subjectId)
                  if (!subject?.semesterId) return false
                  try {
                    await store.saveSubjectNoteConfirmed({ semesterId: subject.semesterId, subjectId, title, unit, content }, store.dataOwnerUserId ? {
                      expectedUserId: store.dataOwnerUserId,
                      expectedAuthGeneration: store.authGeneration,
                    } : undefined)
                    return true
                  } catch {
                    return false
                  }
                },
                openScientificCalculator: () => {
                  setTab("herramientas")
                  window.history.replaceState(null, "", "?tab=herramientas&tool=scientific-calculator")
                },
                openPreferences: () => navigateTo("preferencias"),
              }}
              grade={data.grades.length > 0 ? (data.grades[data.grades.length - 1]?.score ?? undefined) : undefined}
              isTyping={subjectOpen || reminderOpen || studyOpen || gradeOpen}
              isUrgent={data.reminders.some((r) => {
                const target = new Date(r.targetDateTime)
                if (Number.isNaN(target.getTime())) return false
                const diff = target.getTime() - Date.now()
                return diff >= 0 && diff <= 24 * 60 * 60 * 1000
              })}
              isLoading={!store.hydrated}
            />
          </div>}

          {/* Welcome banner when empty */}
          {subjectCount === 0 && (
            <div className="mb-6 rounded-lg border border-border bg-card p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-xl font-semibold text-balance">
                    {t("app.welcome.title")}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1 text-pretty">
                    {t("app.welcome.body")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={openSubjectCreation}
                    >
                      <BookOpen className="h-4 w-4 mr-1.5" />
                      {t("app.welcome.firstSubject")}
                    </Button>
                    <InstallAppButton variant="outline" size="sm" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hidden sm:inline-flex"
                      onClick={() => setQuickOpen(true)}
                    >
                      <Keyboard className="h-3.5 w-3.5 mr-1.5" />
                      {t("common.shortcuts")}
                      <KbdGroup className="ml-2">
                        <Kbd>Ctrl</Kbd>
                        <Kbd>K</Kbd>
                      </KbdGroup>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Tabs value={tab} onValueChange={(value) => isAppTab(value) && navigateTo(value)} className="space-y-4">

            <TabsContent value="dashboard" className="space-y-4 mt-4">
              {!activeTutorial && tutorials.pending.map((id) => (
                <div key={id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Tienes un tutorial pendiente</p>
                    <p className="text-xs text-muted-foreground">{TUTORIAL_REGISTRY[id].title}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => tutorials.update(id, { status: "skipped" })}>Descartar</Button>
                    <Button size="sm" onClick={() => startTutorial({ id, mode: "resume" })}>Continuar</Button>
                  </div>
                </div>
              ))}
              <div data-tour="dashboard-overview"><FirstStepsChecklist store={store} onNavigate={navigateTo} /><AcademicDashboard store={store} onNavigate={navigateTo} /></div>
            </TabsContent>

            <TabsContent value="onboarding" className="space-y-4 mt-4">
              <OnboardingFlow store={store} onDone={(startBasic) => {
                navigateTo("dashboard")
                if (startBasic) startTutorial({ id: "basic-tour", mode: "manual" })
              }} />
            </TabsContent>

            <TabsContent value="horario" className="space-y-4 mt-4" data-tour="schedule-grid">
              <div className="flex items-start sm:items-center justify-between flex-wrap gap-2">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold truncate">
                    {showFocus
                      ? t("schedule.todayTitle", { day: tDay(focusDay!) })
                      : `Días de clase: ${data.settings.visibleScheduleDays.map((key) => ({ lunes: "Lun", martes: "Mar", miercoles: "Mié", jueves: "Jue", viernes: "Vie", sabado: "Sáb", domingo: "Dom" })[key]).join(" · ")}`}
                  </h2>
                  <p className="text-sm text-muted-foreground hidden sm:block">
                    {t("schedule.help")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span data-tour="schedule-modules-summary" className="text-xs text-muted-foreground hidden md:inline">
                    {blockCount === 1
                      ? t("schedule.blockCount.one", { n: blockCount })
                      : t("schedule.blockCount.other", { n: blockCount })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateSettings({ focusMode: !data.settings.focusMode })}
                  >
                    <Zap className="h-3.5 w-3.5 mr-1.5" />
                    <span className="hidden sm:inline">
                      {data.settings.focusMode ? t("header.viewWeek") : t("header.focusMode")}
                    </span>
                    <span className="sm:hidden">
                      {data.settings.focusMode ? t("header.viewWeek") : t("header.focusMode")}
                    </span>
                  </Button>
                </div>
              </div>

              <ScheduleGrid
                store={store}
                onNewSubject={openSubjectCreation}
                onEditSubject={openEditSubject}
                restrictedDay={showFocus ? focusDay! : undefined}
                showSaturday={data.settings.enableSaturday}
                visibleDays={data.settings.visibleScheduleDays}
                timeFormat={data.settings.timeFormat}
                reminders={data.reminders}
                onOpenReminders={() => navigateTo("recordatorios")}
              />
            </TabsContent>

            <TabsContent value="materias" className="mt-4">
              <SubjectsPanel store={store} onRequireSetup={() => navigateTo("onboarding")} />
            </TabsContent>

            <TabsContent value="estudio" className="mt-4">
              <StudyBlocksPanel store={store} />
            </TabsContent>

            <TabsContent value="recordatorios" className="mt-4" data-tour="reminders-overview">
              <RemindersPanel store={store} />
            </TabsContent>

            <TabsContent value="notas" className="mt-4" data-tour="grades-overview">
              <GradesPanel store={store} />
            </TabsContent>

            <TabsContent value="cuaderno" className="mt-4">
              <NotebookView store={store} onAddSubject={openSubjectCreation} />
            </TabsContent>

            <TabsContent value="analitica" className="mt-4" data-tour="analytics-overview">
              <AnalyticsView store={store} />
            </TabsContent>

            <TabsContent value="herramientas" className="mt-4">
              <div data-tour="tools-catalog"><PluginsView /></div>
            </TabsContent>

            <TabsContent value="preferencias" className="mt-4">
              <div data-tour="preferences-overview">
                <SettingsView
                  store={store}
                  onRestartTutorial={(id) => {
                    tutorials.reset(id)
                    requestAnimationFrame(() => startTutorial({ id, mode: "manual" }))
                  }}
                  onAdvancedModeFirstEnabled={() => startTutorial({ id: "advanced-mode-tour", mode: "automatic" })}
                />
              </div>
            </TabsContent>
          </Tabs>
        <footer className="hidden py-6 text-xs text-muted-foreground lg:block">
          <div>{t("app.tagline")}</div>
          <div className="mt-1">
            App diseñada por{" "}
            <a
              href="https://maurizio.dev"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              maurizio.dev
            </a>
          </div>
        </footer>
      </AppShell>

      {/* Global dialogs */}
      <SubjectForm
        key={`subject-${subjectEditing?.id ?? "new"}`}
        open={subjectOpen}
        onOpenChange={setSubjectOpen}
        initial={subjectEditing}
        onSubmit={(values) => {
          if (subjectEditing) updateSubject(subjectEditing.id, values)
          else createSubject(values)
        }}
      />
      <ReminderForm
        key="reminder-quick"
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        subjects={data.subjects}
        onSubmit={(values) => addReminder(values)}
      />
      <StudyBlockForm
        key="study-quick"
        open={studyOpen}
        onOpenChange={setStudyOpen}
        subjects={data.subjects}
        onSubmit={(values) => addStudyBlock(values)}
      />
      <GradeForm
        key="grade-quick"
        open={gradeOpen}
        onOpenChange={setGradeOpen}
        subjects={data.subjects}
        groups={data.assessmentGroups}
        assessments={data.grades}
        scale={data.settings.gradeScale}
        onApplyTwoGroupPreset={(subjectId) => store.applyGradingPreset(subjectId, "presentation60Transversal40")}
        onSubmit={(values) => addGrade(values)}
      />
      <MigrationModal store={store} />
      <QuickAdd
        open={quickOpen}
        onOpenChange={setQuickOpen}
        onAction={handleQuickAction}
        store={store}
      />
      {activeTutorial && <GuidedTour
        definition={TUTORIAL_REGISTRY[activeTutorial]}
        currentStep={tutorials.get(activeTutorial).currentStep}
        onStepChange={(currentStep) => {
          const step = TUTORIAL_REGISTRY[activeTutorial].steps[currentStep]
          if (step?.tab && isAppTab(step.tab)) navigateTo(step.tab)
          requestAnimationFrame(() => tutorials.update(activeTutorial, { status: "in-progress", currentStep }))
        }}
        onSkip={() => { tutorials.update(activeTutorial, { status: "skipped" }); setActiveTutorial(null) }}
        onFinish={() => { tutorials.update(activeTutorial, { status: "completed" }); setActiveTutorial(null) }}
      />}
    </>
  )
}

function WorkspaceSessionBoundary() {
  const { userId, loading, transitioning } = useAuth()
  if (loading || transitioning) {
    return (
      <I18nProvider lang="es">
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">
          Cambiando de cuenta…
        </div>
      </I18nProvider>
    )
  }
  return <HomePageWorkspace key={userId ?? "guest"} />
}

// Wrapper that reads the language from storage and provides i18n context.
function HomePageWorkspace() {
  const store = useScheduleStore()
  return (
    <I18nProvider lang={store.data.settings.language}>
      <HomePageInner store={store} />
    </I18nProvider>
  )
}

export default function HomePage() {
  return (
    <AuthProvider>
      <WorkspaceSessionBoundary />
    </AuthProvider>
  )
}
