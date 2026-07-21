#!/usr/bin/env node
import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const slug = process.argv[2]
const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const pluginsDir = join(root, "plugins")
const templateDir = join(pluginsDir, "_template")

if (!slug || !slugRe.test(slug)) fail("Uso: pnpm tool:create mi-herramienta (slug kebab-case).")
const target = resolve(pluginsDir, slug)
if (!target.startsWith(`${pluginsDir}/`)) fail("Slug inválido: path traversal bloqueado.")
if (existsSync(target)) fail(`La carpeta ya existe: plugins/${slug}`)

const title = titleFromSlug(slug)
const constant = slug.toUpperCase().replaceAll("-", "_")
const component = `${slug.split("-").map(capitalize).join("")}Tool`
const exportName = `${slug.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase())}Plugin`

await mkdir(target, { recursive: false })
for (const entry of await readdir(templateDir)) {
  const source = join(templateDir, entry)
  const destinationName = entry.endsWith(".template") ? entry.slice(0, -".template".length) : entry
  const destination = join(target, destinationName)
  if ((await stat(source)).isDirectory()) continue
  const text = await readFile(source, "utf8")
  await writeFile(destination, text
    .replaceAll("__PLUGIN_ID__", slug)
    .replaceAll("__PLUGIN_NAME__", title)
    .replaceAll("__CATEGORY__", "Utilidades")
    .replaceAll("__PLUGIN_CONSTANT__", constant)
    .replaceAll("__PLUGIN_COMPONENT__", component)
    .replaceAll("__PLUGIN_EXPORT__", exportName))
}

console.log(`Herramienta creada en plugins/${slug}`)
console.log("Paso manual único: registrar el módulo en plugins/index.ts.")
console.log("No se instalaron dependencias ni se modificaron archivos sensibles.")

function fail(message) {
  console.error(message)
  process.exit(1)
}
function titleFromSlug(value) {
  return value.split("-").map(capitalize).join(" ")
}
function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
