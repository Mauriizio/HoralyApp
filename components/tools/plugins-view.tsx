"use client"

import { Component, useMemo, useState, type ComponentType, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createPluginRegistry, TOOL_CATEGORIES } from "@/lib/plugins/plugin-registry"
import { ResistorColorCodeTool } from "@/plugins/resistor-color-code/ui"
import type { PluginCategory, PluginManifest } from "@/lib/plugins/plugin-types"

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
  const plugins = createPluginRegistry().list()
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<PluginCategory | "Todas">("Todas")
  const [active, setActive] = useState<PluginManifest | null>(null)
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

  if (active) {
    const Tool = pluginComponents[active.id]
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setActive(null)}>Volver al catálogo</Button>
        <Card>
          <CardHeader>
            <CardTitle>{active.icon} {active.name}</CardTitle>
            <CardDescription>{active.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {Tool ? <ErrorBoundary><Tool /></ErrorBoundary> : <p>Herramienta próximamente.</p>}
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
          {TOOL_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
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

const pluginComponents: Record<string, ComponentType> = { "resistor-color-code": ResistorColorCodeTool }
