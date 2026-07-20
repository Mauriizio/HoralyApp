"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createPluginRegistry } from "@/lib/plugins/plugin-registry"

export function PluginsView() {
  const plugins = createPluginRegistry().list()
  return <div className="grid gap-4 md:grid-cols-2">{plugins.map((plugin) => <Card key={plugin.id}><CardHeader><CardTitle>{plugin.name}</CardTitle><CardDescription>{plugin.description}</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">Versión {plugin.version}. Permisos: {plugin.permissions.length ? plugin.permissions.join(", ") : "sin permisos adicionales"}.</p></CardContent></Card>)}</div>
}
