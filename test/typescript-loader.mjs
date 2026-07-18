import { readFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import ts from "typescript"

const rootDir = process.cwd()

function resolvePathWithTsExtension(specifier, parentURL) {
  const basePath = specifier.startsWith("@/")
    ? path.join(rootDir, specifier.slice(2))
    : path.resolve(path.dirname(new URL(parentURL).pathname), specifier)

  if (path.extname(basePath)) return basePath
  return `${basePath}.ts`
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("node:") || /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(specifier)) {
    return nextResolve(specifier, context)
  }

  if (specifier.startsWith("@/") || specifier.startsWith("./") || specifier.startsWith("../")) {
    try {
      return await nextResolve(specifier, context)
    } catch (error) {
      const resolvedPath = resolvePathWithTsExtension(specifier, context.parentURL ?? pathToFileURL(rootDir).href)
      return { url: pathToFileURL(resolvedPath).href, shortCircuit: true }
    }
  }

  return nextResolve(specifier, context)
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const source = await readFile(new URL(url), "utf8")
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        isolatedModules: true,
      },
      fileName: new URL(url).pathname,
    })

    return { format: "module", source: transpiled.outputText, shortCircuit: true }
  }

  return nextLoad(url, context)
}
