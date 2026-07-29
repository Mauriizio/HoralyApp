"use client"

import { Component, lazy, Suspense, useMemo, useState, type ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/components/i18n-provider"
import { createPluginRegistry } from "@/lib/plugins/plugin-registry"
import { toolPlugins } from "@/plugins"
import type { PluginCategory, PluginManifest, ToolPluginProps } from "@/lib/plugins/plugin-types"

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    console.error("[plugin]", error.message)
  }

  render() {
    if (this.state.failed) {
      return (
        <Card>
          <CardContent className="p-4 text-sm text-destructive">
            La herramienta falló sin afectar HoralyApp.
          </CardContent>
        </Card>
      )
    }
    return this.props.children
  }
}

export function PluginsView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang } = useI18n()
  const registry = useMemo(() => createPluginRegistry(toolPlugins), [])
  const plugins = registry.list()
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<PluginCategory | "Todas">("Todas")
  const [active, setActive] = useState<PluginManifest | null>(() => registry.get(searchParams.get("tool") ?? "") ?? null)
  const filtered = useMemo(
    () => plugins.filter((plugin) => {
      const matchesCategory = category === "Todas" || plugin.category === category
      const matchesQuery = `${plugin.name} ${plugin.description}`
        .toLowerCase()
        .includes(query.toLowerCase().trim())
      return matchesCategory && matchesQuery
    }),
    [category, plugins, query],
  )
  const pluginProps = useMemo<ToolPluginProps>(() => ({
    locale: lang,
    theme: "system",
    navigateInternal: (path) => {
      if (!path.startsWith("/") || path.startsWith("//")) return
      router.push(path)
    },
    copyText: async (text) => {
      try {
        await navigator.clipboard?.writeText(text)
        return true
      } catch {
        return false
      }
    },
    emitEvent: () => undefined,
    createNamespacedStorage: (namespace) => createNamespacedStorage(`plugin:${namespace}`),
    log: (error) => console.error("[plugin]", error.message),
  }), [lang, router])

  if (active) {
    const Tool = lazy(() => registry.load(active.id))
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setActive(null)}>Volver al catálogo</Button>
        <Card>
          <CardHeader>
            <CardTitle>{active.icon} {active.name}</CardTitle>
            <CardDescription>{active.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ErrorBoundary>
              <Suspense fallback={<div role="status" aria-live="polite" className="text-sm text-muted-foreground">Cargando herramienta…</div>}>
                <Tool {...pluginProps} />
              </Suspense>
            </ErrorBoundary>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <section className="space-y-4" aria-label="Catálogo de Herramientas">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <Input aria-label="Buscar herramienta" placeholder="Buscar herramienta" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select aria-label="Filtrar por categoría" className="rounded-md border bg-background px-3 py-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value as PluginCategory | "Todas")}>
          <option>Todas</option>
          {registry.categories.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((plugin) => (
          <Card key={plugin.id} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" && plugin.status === "available") setActive(plugin) }}>
            <CardHeader>
              <CardTitle><span aria-hidden>{plugin.icon}</span> {plugin.name}</CardTitle>
              <CardDescription>{plugin.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Categoría: {plugin.category}. Versión {plugin.version}. Estado: {plugin.status === "available" ? "disponible" : "próximamente"}. Permisos: {plugin.permissions.length ? plugin.permissions.join(", ") : "sin permisos adicionales"}.
              </p>
              <Button disabled={plugin.status !== "available"} onClick={() => setActive(plugin)}>Abrir herramienta</Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && <p className="text-sm text-muted-foreground">No encontramos herramientas para esa búsqueda.</p>}
    </section>
  )
}

function createNamespacedStorage(prefix: string): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  return {
    getItem: (key) => localStorage.getItem(`${prefix}:${key}`),
    setItem: (key, value) => localStorage.setItem(`${prefix}:${key}`, value),
    removeItem: (key) => localStorage.removeItem(`${prefix}:${key}`),
  }
}
