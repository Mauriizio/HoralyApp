"use client"

import { useEffect, useMemo, useState } from "react"
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
import { AcademicDashboard } from "@/components/dashboard/academic-dashboard"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { PluginsView } from "@/components/tools/plugins-view"
import { usePwaInstall } from "@/hooks/use-pwa-install"
import { I18nProvider, useI18n } from "@/components/i18n-provider"
import type { DayKey, Subject } from "@/lib/types"
import { formatTime, parseTime } from "@/lib/time-format"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { GuestAuthActions } from "@/components/auth/guest-auth-actions"
import { AppShell } from "@/components/app-shell/app-shell"
import { getTabUrl, isAppTab, type AppTab } from "@/components/app-shell/navigation"

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
    addSubject,
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

  const navigateTo = (nextTab: AppTab) => {
    setTab(nextTab)
    window.history.replaceState(null, "", getTabUrl(nextTab, window.location.search))
  }
  const requiresAcademicSetup =
    !data.activeSemesterId ||
    (!data.settings.onboarding.completed && !data.profile.onboardingCompletedAt)
  const openSubjectCreation = () => {
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

  const assistantMessage = useMemo(() => {
    const now = new Date()
    const toLocalIso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`
    const todayIso = toLocalIso(now)
    const nowMinutes = now.getHours() * 60 + now.getMinutes()

    const reminderToday = data.reminders
      .map((r) => ({ r, date: new Date(r.targetDateTime) }))
      .filter(({ date }) => !Number.isNaN(date.getTime()))
      .filter(({ date }) => {
        const localIso = toLocalIso(date)
        return localIso === todayIso && date.getTime() >= now.getTime()
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0]

    if (reminderToday) {
      return t("profile.assistant.reminder", {
        title: reminderToday.r.title,
        time: formatTime(
          `${String(reminderToday.date.getHours()).padStart(2, "0")}:${String(
            reminderToday.date.getMinutes(),
          ).padStart(2, "0")}`,
          data.settings.timeFormat,
        ),
      })
    }

    if (todayKey && todayKey !== "domingo") {
      const modulesById = new Map(data.modules.map((m) => [m.id, m]))
      const nextBlock = data.blocks
        .filter((b) => b.day === todayKey)
        .map((b) => {
          const subject = data.subjects.find((s) => s.id === b.subjectId)
          if (!subject) return null
          const firstModule = b.moduleIds
            .map((id) => modulesById.get(id))
            .filter((m): m is NonNullable<typeof m> => Boolean(m))
            .sort((a, b2) => a.start.localeCompare(b2.start))[0]
          if (!firstModule) return null
          const parsed = parseTime(firstModule.start)
          if (!parsed) return null
          return {
            subject,
            module: firstModule,
            startMinutes: parsed.hour * 60 + parsed.minute,
          }
        })
        .filter((v): v is NonNullable<typeof v> => Boolean(v))
        .filter((v) => v.startMinutes >= nowMinutes)
        .sort((a, b) => a.startMinutes - b.startMinutes)[0]

      if (nextBlock) {
        return t("profile.assistant.nextClass", {
          subject: nextBlock.subject.name,
          time: nextBlock.module.start,
          minutes: nextBlock.startMinutes - nowMinutes,
        })
      }
    }

    return t("profile.assistant.empty")
  }, [data, t, todayKey])

  const hasAnyData =
    data.subjects.length > 0 ||
    data.blocks.length > 0 ||
    data.reminders.length > 0 ||
    data.studyBlocks.length > 0 ||
    data.grades.length > 0

  const addSubjectFromConsole = ({ name, commandKey }: { name: string; commandKey: string }) => {
    if (data.subjects.some((s) => (s.commandKey ?? "").toUpperCase() === commandKey.toUpperCase())) return null
    const created = addSubject({
      name: name.trim(),
      color: "#2563EB",
      difficulty: 3,
      commandKey: commandKey.toUpperCase(),
    })
    return { name: created.name, commandKey: created.commandKey ?? commandKey.toUpperCase() }
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
              <div
                className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
                style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                <CalendarDays className="h-4 w-4" />
              </div>
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
          {/* Greeting */}
          <div className="mb-4">
            <HorarilySpeakingCard
              userName={data.profile.displayName}
              message={`${t("profile.assistant.hello")} ${assistantMessage}`}
              commandContext={{
                nextClassText: assistantMessage,
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
                resetProfileName: () => updateProfile({ displayName: "" }),
                openSubjectForm: openSubjectCreation,
                openGradeForm: () => setGradeOpen(true),
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
          </div>

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

          {/* Persistent install banner: shown only when there's already content
              AND the app is installable. Auto-hides after install. */}
          {subjectCount > 0 && <InstallBanner />}

          <Tabs value={tab} onValueChange={(value) => isAppTab(value) && navigateTo(value)} className="space-y-4">

            <TabsContent value="dashboard" className="space-y-4 mt-4">
              <AcademicDashboard store={store} onNavigate={navigateTo} />
            </TabsContent>

            <TabsContent value="onboarding" className="space-y-4 mt-4">
              <OnboardingFlow store={store} onDone={() => navigateTo("dashboard")} />
            </TabsContent>

            <TabsContent value="horario" className="space-y-4 mt-4">
              <div className="flex items-start sm:items-center justify-between flex-wrap gap-2">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold truncate">
                    {showFocus
                      ? t("schedule.todayTitle", { day: tDay(focusDay!) })
                      : data.settings.enableSaturday
                        ? t("schedule.weekTitleWithSaturday")
                        : t("schedule.weekTitle")}
                  </h2>
                  <p className="text-sm text-muted-foreground hidden sm:block">
                    {t("schedule.help")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground hidden md:inline">
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

            <TabsContent value="recordatorios" className="mt-4">
              <RemindersPanel store={store} />
            </TabsContent>

            <TabsContent value="notas" className="mt-4">
              <GradesPanel store={store} />
            </TabsContent>

            <TabsContent value="analitica" className="mt-4">
              <AnalyticsView store={store} />
            </TabsContent>

            <TabsContent value="herramientas" className="mt-4">
              <PluginsView />
            </TabsContent>

            <TabsContent value="preferencias" className="mt-4">
              <SettingsView store={store} onOpenOnboarding={() => navigateTo("onboarding")} />
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
          else addSubject(values)
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
    </>
  )
}

/**
 * Compact install banner shown above the tabs when the user already has
 * content and the app is installable. Renders null when the device cannot
 * install (already installed, unsupported browser, etc.).
 */
function InstallBanner() {
  const { t } = useI18n()
  const { canPrompt, showInstructions, installed } = usePwaInstall()
  if (installed || (!canPrompt && !showInstructions)) return null
  return (
    <div className="mb-4 rounded-lg border border-border bg-card/60 px-4 py-3 flex items-center gap-3">
      <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{t("install.banner.title")}</div>
        <div className="text-xs text-muted-foreground line-clamp-2 sm:truncate">
          {t("install.banner.body")}
        </div>
      </div>
      <InstallAppButton variant="default" size="sm" />
    </div>
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
