import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { existsSync, rmSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { ComponentType } from "react"

import { createPluginRegistry, TOOL_CATEGORIES } from "../lib/plugins/plugin-registry.ts"
import type { ToolPluginModule, ToolPluginProps } from "../lib/plugins/plugin-types.ts"
import { toolPlugins } from "../plugins/index.ts"
import { bandsToValue } from "../plugins/resistor-color-code/domain.ts"

const Dummy: ComponentType<ToolPluginProps> = () => null
const loadDummy = async () => ({ default: Dummy })

function module(overrides: Partial<ToolPluginModule["manifest"]> = {}, load: ToolPluginModule["load"] | null = loadDummy): ToolPluginModule {
  const candidate: ToolPluginModule = {
    manifest: {
      id: "plugin-ficticio",
      name: "Plugin ficticio",
      version: "1.2.3",
      description: "Solo para pruebas del contrato.",
      enabled: true,
      category: "Utilidades",
      icon: "T",
      status: "available",
      featureFlag: "NEXT_PUBLIC_PLUGIN_FICTICIO_ENABLED",
      capabilities: ["navigation:internal"],
      permissions: ["navigate:internal"],
      routes: [{ path: "herramientas/plugin-ficticio", label: "Plugin ficticio" }],
      ...overrides,
    },
    isEnabled: () => process.env.NEXT_PUBLIC_PLUGIN_FICTICIO_ENABLED !== "false",
  }
  if (load !== null) candidate.load = load
  return candidate
}

test("PluginsView no conoce herramientas concretas ni mapas por ID", async () => {
  const source = await readFile("components/tools/plugins-view.tsx", "utf8")
  assert.equal(/resistor-color-code|ResistorColorCodeTool|pluginComponents/.test(source), false)
  assert.match(source, /registry\.load\(active\.id\)/)
  assert.match(source, /lazy\(/)
  assert.match(source, /Suspense/)
  assert.match(source, /Cargando herramienta/)
})

test("plugin-registry no importa plugins concretos", async () => {
  const source = await readFile("lib/plugins/plugin-registry.ts", "utf8")
  assert.equal(/resistor|plugins\/index|@\/plugins|process\.env\[/.test(source), false)
})

test("plugins/index.ts es el único índice concreto registrado", async () => {
  const source = await readFile("plugins/index.ts", "utf8")
  assert.match(source, /resistorColorCode/)
  assert.match(source, /toolPlugins/)
  assert.equal(source.includes("_template"), false)
  assert.equal(toolPlugins.length, 1)
})

test("registrar y cargar plugin ficticio no exige modificar la UI", async () => {
  const registry = createPluginRegistry([module()])
  assert.equal(registry.list()[0]?.id, "plugin-ficticio")
  const loaded = await registry.load("plugin-ficticio")
  assert.equal(loaded.default, Dummy)
})

test("loader fallido queda reportado de forma segura", async () => {
  const registry = createPluginRegistry([module({ id: "loader-falla" }, async () => { throw new Error("secreto-interno") })])
  await assert.rejects(() => registry.load("loader-falla"), /No se pudo cargar la herramienta/)
})

test("validaciones del registro rechazan módulos inválidos", () => {
  assert.equal(createPluginRegistry([module(), module()]).diagnostics.some((d) => d.code === "duplicate-id"), true)
  assert.equal(createPluginRegistry([module(), module({ id: "otro", routes: [{ path: "herramientas/plugin-ficticio", label: "Duplicado" }] })]).diagnostics.some((d) => d.code === "duplicate-route"), true)
  assert.equal(createPluginRegistry([module({ id: "Plugin Malo" })]).diagnostics.some((d) => d.code === "invalid-id"), true)
  assert.equal(createPluginRegistry([module({ version: "1" })]).diagnostics.some((d) => d.code === "invalid-version"), true)
  assert.equal(createPluginRegistry([module({ status: "available" }, null)]).diagnostics.some((d) => d.code === "missing-loader"), true)
  assert.equal(createPluginRegistry([module({ status: "coming-soon" }, null)]).list().length, 1)
  assert.equal(createPluginRegistry([module({ permissions: ["write:clipboard"] })]).diagnostics.some((d) => d.code === "incompatible-permission"), true)
  assert.equal(createPluginRegistry([module({ featureFlag: "GOOGLE_SECRET" })]).diagnostics.some((d) => d.code === "invalid-feature-flag"), true)
  const missingResolver = module({ featureFlag: "NEXT_PUBLIC_PLUGIN_FICTICIO_ENABLED" })
  delete missingResolver.isEnabled
  assert.equal(createPluginRegistry([missingResolver]).diagnostics.some((d) => d.code === "missing-feature-flag-resolver"), true)
  assert.equal(createPluginRegistry([module({ category: "Otra" as never })]).diagnostics.some((d) => d.code === "invalid-category"), true)
  assert.deepEqual(createPluginRegistry([module()]).categories, TOOL_CATEGORIES)
})

test("feature flag desactivada oculta la herramienta", () => {
  const previous = process.env.NEXT_PUBLIC_PLUGIN_FICTICIO_ENABLED
  process.env.NEXT_PUBLIC_PLUGIN_FICTICIO_ENABLED = "false"
  assert.equal(createPluginRegistry([module()]).list().length, 0)
  process.env.NEXT_PUBLIC_PLUGIN_FICTICIO_ENABLED = previous
})

test("calculadora actual sigue funcionando y dominio está separado de UI", async () => {
  assert.equal(bandsToValue({ bandCount: 4, colors: ["marrón", "negro", "rojo", "oro"] }).nominalOhms, 1000)
  const ui = await readFile("plugins/resistor-color-code/ui.tsx", "utf8")
  const domain = await readFile("plugins/resistor-color-code/domain.ts", "utf8")
  assert.match(ui, /from "\.\/domain"/)
  assert.equal(/react|jsx|tsx|@\/components/i.test(domain), false)
})

test("plugin no recibe Supabase, JWT, cookies ni store global", async () => {
  const types = await readFile("lib/plugins/plugin-types.ts", "utf8")
  assert.match(types, /ToolPluginProps/)
  assert.equal(/supabase|session|jwt|cookie|store|repository/i.test(types), false)
})

test("generador crea estructura válida, rechaza traversal y no sobrescribe", async () => {
  const slug = `temporal-${Date.now()}`
  const dir = join("plugins", slug)
  try {
    execFileSync(process.execPath, ["scripts/create-tool.mjs", slug], { encoding: "utf8" })
    assert.equal(existsSync(join(dir, "manifest.ts")), true)
    assert.equal(existsSync(join(dir, "domain.ts")), true)
    assert.equal(existsSync(join(dir, "ui.tsx")), true)
    assert.equal(existsSync(join(dir, "index.ts")), true)
    assert.equal(existsSync(join(dir, "README.md")), true)
    assert.throws(() => execFileSync(process.execPath, ["scripts/create-tool.mjs", "../malo"], { encoding: "utf8", stdio: "pipe" }))
    assert.throws(() => execFileSync(process.execPath, ["scripts/create-tool.mjs", slug], { encoding: "utf8", stdio: "pipe" }))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test("plantilla no se registra como herramienta y contiene marcadores", async () => {
  const template = await readFile("plugins/_template/index.ts.template", "utf8")
  assert.match(template, /__PLUGIN_ID__/)
  assert.match(template, /__PLUGIN_NAME__/)
  assert.match(template, /__CATEGORY__/)
  assert.equal(toolPlugins.some((plugin) => plugin.manifest.id.includes("template")), false)
})

test("docs y AGENTS documentan el proceso permanente sin tocar migraciones", async () => {
  const guide = await readFile("docs/20-adding-tools.md", "utf8")
  for (const text of ["pnpm tool:create mi-herramienta", "ToolPluginModule", "no importar Supabase", "no modificar PluginsView", "SemVer", "Checklist final"]) assert.match(guide, new RegExp(text))
  const agents = await readFile("AGENTS.md", "utf8")
  assert.match(agents, /Nuevas herramientas/)
  assert.match(agents, /docs\/20-adding-tools\.md/)
  const changed = execFileSync("git", ["diff", "--name-only", "HEAD"], { encoding: "utf8" })
  assert.equal(/supabase\/migrations|rls/i.test(changed), false)
})
