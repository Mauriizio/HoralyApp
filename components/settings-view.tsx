"use client"

import { useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Bell, Download, Upload, RotateCcw, Calendar, Languages } from "lucide-react"
import type { ScheduleStore } from "@/hooks/use-schedule-store"
import { downloadJson, exportAsJson, importFromJson } from "@/lib/storage"
import { getPermission, requestPermission } from "@/lib/notifications"
import { toast } from "sonner"
import { useI18n } from "@/components/i18n-provider"
import { TimeModulesEditor } from "@/components/time-modules-editor"
import { GradeScaleEditor } from "@/components/grade-scale-editor"
import { SemesterManager } from "@/components/semesters/semester-manager"

const ACCENT_PRESETS = [
  { hex: "#0d9488", label: "Teal" },
  { hex: "#2563eb", label: "Azul" },
  { hex: "#dc2626", label: "Rojo" },
  { hex: "#ea580c", label: "Naranja" },
  { hex: "#ca8a04", label: "Amarillo" },
  { hex: "#16a34a", label: "Verde" },
  { hex: "#db2777", label: "Rosa" },
  { hex: "#475569", label: "Pizarra" },
]

export function SettingsView({ store, onOpenOnboarding }: { store: ScheduleStore; onOpenOnboarding?: () => void }) {
  const { t } = useI18n()
  const { data, updateSettings, replaceAll, resetSettings, storageRecovery, clearStorageRecovery } = store
  const { settings } = data
  const fileInput = useRef<HTMLInputElement>(null)
  const [permission, setPermission] = useState<string>(() => getPermission())

  const handleExport = () => {
    const json = exportAsJson(data)
    downloadJson(`horario-escolar-${new Date().toISOString().slice(0, 10)}.json`, json)
    toast.success(t("settings.data.export"))
  }

  const handleImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const next = importFromJson(String(reader.result))
        const confirmed = window.confirm(
          `Se importarán ${next.subjects.length} materia(s), ${next.blocks.length} bloque(s), ${next.grades.length} nota(s) y ${next.reminders.length} recordatorio(s). Se descargará un respaldo antes de reemplazar tus datos actuales. ¿Continuar?`,
        )
        if (!confirmed) return
        downloadJson(`horario-escolar-respaldo-${new Date().toISOString().slice(0, 10)}.json`, exportAsJson(data))
        replaceAll(next)
        toast.success(t("settings.data.import"))
      } catch (err) {
        toast.error("No se pudo importar el archivo. Tus datos actuales se conservaron.")
        console.warn("[Horaly] Error importando datos:", err)
      }
    }
    reader.readAsText(file)
  }

  const handleRequestPermission = async () => {
    const result = await requestPermission()
    setPermission(result)
    if (result === "granted") toast.success("OK")
  }

  return (
    <div className="space-y-6">
      {storageRecovery && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Recuperación de datos locales</CardTitle>
            <CardDescription>
              No se pudieron cargar los datos guardados. El contenido original se conservó y el guardado automático está detenido hasta que decidas cómo continuar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="list-disc pl-5 text-xs text-muted-foreground">
              {storageRecovery.errors.slice(0, 3).map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => downloadJson(`horario-escolar-recuperacion-${new Date().toISOString().slice(0, 10)}.json`, storageRecovery.raw)}
              >
                <Download className="h-4 w-4 mr-2" /> Exportar datos originales
              </Button>
              <Button variant="destructive" onClick={clearStorageRecovery}>
                Descartar datos dañados y empezar vacío
              </Button>
            </div>
          </CardContent>
        </Card>
      )}


      <SemesterManager store={store} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuración académica inicial</CardTitle>
          <CardDescription>Revisa el onboarding existente sin reiniciar datos, semestres ni materias.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p><span className="text-muted-foreground">Estado:</span> {data.settings.onboarding.completed || data.profile.onboardingCompletedAt ? "Completado" : "No completado"}</p>
            <p><span className="text-muted-foreground">Institución:</span> {data.profile.institution ?? "No definida"}</p>
            <p><span className="text-muted-foreground">Carrera:</span> {data.profile.career ?? "No definida"}</p>
            <p><span className="text-muted-foreground">Zona horaria:</span> {data.profile.timezone ?? "No definida"}</p>
            <p><span className="text-muted-foreground">Semestre activo:</span> {data.semesters.find((semester) => semester.id === data.activeSemesterId)?.name ?? "Sin semestre activo"}</p>
          </div>
          <Button onClick={onOpenOnboarding}>
            {data.settings.onboarding.completed || data.profile.onboardingCompletedAt ? "Revisar configuración inicial" : "Continuar onboarding"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sincronización en la nube</CardTitle>
          <CardDescription>Si inicias sesión, puedes migrar tus datos locales a tu cuenta sin borrar el respaldo del navegador.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => toast.info("Inicia sesión y confirma la migración desde el aviso de tu cuenta. Tus datos locales no se eliminarán automáticamente.")}>Migrar datos locales a mi cuenta</Button>
          <Badge variant="secondary">Guardado local disponible</Badge>
        </CardContent>
      </Card>

      {/* Language + Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Languages className="h-4 w-4" />
            {t("settings.language")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 max-w-sm">
            <Button
              variant={settings.language === "es" ? "default" : "outline"}
              onClick={() => updateSettings({ language: "es" })}
              aria-pressed={settings.language === "es"}
            >
              {t("settings.languageEs")}
            </Button>
            <Button
              variant={settings.language === "en" ? "default" : "outline"}
              onClick={() => updateSettings({ language: "en" })}
              aria-pressed={settings.language === "en"}
            >
              {t("settings.languageEn")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.appearance")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="theme">{t("settings.theme")}</Label>
              <Select
                value={settings.theme}
                onValueChange={(v) => updateSettings({ theme: v as "light" | "dark" | "system" })}
              >
                <SelectTrigger id="theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t("settings.themeLight")}</SelectItem>
                  <SelectItem value="dark">{t("settings.themeDark")}</SelectItem>
                  <SelectItem value="system">{t("settings.themeSystem")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="font">{t("settings.font")}</Label>
              <Select
                value={settings.fontFamily}
                onValueChange={(v) =>
                  updateSettings({
                    fontFamily: v as
                      | "sans"
                      | "serif"
                      | "mono"
                      | "system"
                      | "rounded"
                      | "display"
                      | "clean"
                      | "friendly"
                      | "classic"
                      | "tech",
                  })
                }
              >
                <SelectTrigger id="font">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sans">{t("settings.fontSans")}</SelectItem>
                  <SelectItem value="serif">{t("settings.fontSerif")}</SelectItem>
                  <SelectItem value="mono">{t("settings.fontMono")}</SelectItem>
                  <SelectItem value="system">{t("settings.fontSystem")}</SelectItem>
                  <SelectItem value="rounded">{t("settings.fontRounded")}</SelectItem>
                  <SelectItem value="display">{t("settings.fontDisplay")}</SelectItem>
                  <SelectItem value="clean">{t("settings.fontClean")}</SelectItem>
                  <SelectItem value="friendly">{t("settings.fontFriendly")}</SelectItem>
                  <SelectItem value="classic">{t("settings.fontClassic")}</SelectItem>
                  <SelectItem value="tech">{t("settings.fontTech")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("settings.accentColor")}</Label>
            <div className="flex flex-wrap items-center gap-2">
              {ACCENT_PRESETS.map((p) => (
                <button
                  key={p.hex}
                  type="button"
                  onClick={() => updateSettings({ accentColor: p.hex })}
                  className={`flex items-center gap-2 rounded-full border-2 px-3 py-1 text-xs transition ${
                    settings.accentColor === p.hex
                      ? "border-foreground"
                      : "border-transparent hover:border-border"
                  }`}
                  style={{ backgroundColor: `${p.hex}22` }}
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: p.hex }}
                  />
                  {p.label}
                </button>
              ))}
              <label className="flex items-center gap-2 rounded-full border border-input px-3 py-1 cursor-pointer">
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => updateSettings({ accentColor: e.target.value })}
                  className="h-4 w-4 cursor-pointer border-0 bg-transparent p-0"
                  aria-label={t("settings.accentColor")}
                />
                <span className="text-xs">{t("settings.gradeScale.preset.custom")}</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("settings.radius")}</Label>
                <span className="text-xs text-muted-foreground font-mono">
                  {settings.radius.toFixed(2)}rem
                </span>
              </div>
              <Slider
                value={[settings.radius]}
                onValueChange={([v]) => updateSettings({ radius: v })}
                min={0}
                max={1.5}
                step={0.05}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("settings.blockOpacity")}</Label>
                <span className="text-xs text-muted-foreground font-mono">
                  {Math.round(settings.blockOpacity * 100)}%
                </span>
              </div>
              <Slider
                value={[settings.blockOpacity]}
                onValueChange={([v]) => updateSettings({ blockOpacity: v })}
                min={0.4}
                max={1}
                step={0.05}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tamaño de letra</Label>
                <span className="text-xs text-muted-foreground font-mono">
                  {Math.round(settings.fontScale * 100)}%
                </span>
              </div>
              <Slider
                value={[settings.fontScale]}
                onValueChange={([v]) => updateSettings({ fontScale: v })}
                min={0.9}
                max={1.2}
                step={0.02}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time-format">Formato de hora</Label>
              <Select
                value={settings.timeFormat}
                onValueChange={(v) => updateSettings({ timeFormat: v as "12h" | "24h" })}
              >
                <SelectTrigger id="time-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 horas (14:30)</SelectItem>
                  <SelectItem value="12h">12 horas (2:30 PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Incluir sábado en el horario</div>
              <div className="text-xs text-muted-foreground">
                Activa esta opción si tienes clases los sábados.
              </div>
            </div>
            <Switch
              checked={settings.enableSaturday}
              onCheckedChange={(v) => updateSettings({ enableSaturday: v })}
            />
          </div>

          <div className="pt-2">
            <Button variant="ghost" size="sm" onClick={resetSettings}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> {t("settings.data.reset")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Time modules */}
      <TimeModulesEditor store={store} />

      {/* Grade scale */}
      <GradeScaleEditor store={store} />

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" /> {t("priority.alta")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Badge
                variant={permission === "granted" ? "default" : "secondary"}
                className="uppercase"
              >
                {permission}
              </Badge>
            </div>
            {permission !== "granted" && permission !== "unsupported" && (
              <Button onClick={handleRequestPermission} size="sm">
                {t("common.add")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Google Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" /> {t("settings.calendar")}
          </CardTitle>
          <CardDescription>{t("settings.calendar.help")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Para recibir notificaciones reales en el teléfono incluso con la app cerrada, hace
            falta integrar Push Notifications (service worker + servidor con Web Push).
          </p>
          <p>
            Para sonido y sincronización con Google Calendar, también se requiere OAuth de Google
            y crear eventos/recordatorios en su API.
          </p>
          <p>
            Esta app web no puede crear widgets nativos del sistema, pero al instalarla sí puede
            ofrecer accesos rápidos desde el ícono (si tu teléfono los soporta).
          </p>
        </CardContent>
      </Card>

      {/* Data + focus */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.data")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">{t("header.focusMode")}</div>
            </div>
            <Switch
              checked={settings.focusMode}
              onCheckedChange={(v) => updateSettings({ focusMode: v })}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> {t("settings.data.export")}
            </Button>
            <Button variant="outline" onClick={() => fileInput.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> {t("settings.data.import")}
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleImport(f)
                e.target.value = ""
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}