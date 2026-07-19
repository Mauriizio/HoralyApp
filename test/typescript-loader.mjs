import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const rootDir = process.cwd()

function resolvePathWithTsExtension(specifier, parentURL) {
  const parentPath = fileURLToPath(
    parentURL ?? pathToFileURL(`${rootDir}${path.sep}`).href,
  )

  const basePath = specifier.startsWith("@/")
    ? path.join(rootDir, specifier.slice(2))
    : path.resolve(path.dirname(parentPath), specifier)

  if (path.extname(basePath)) return basePath

  return `${basePath}.ts`
}

export async function resolve(specifier, context, nextResolve) {
  if (
    specifier.startsWith("node:") ||
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(specifier)
  ) {
    return nextResolve(specifier, context)
  }

  if (
    specifier.startsWith("@/") ||
    specifier.startsWith("./") ||
    specifier.startsWith("../")
  ) {
    try {
      return await nextResolve(specifier, context)
    } catch {
      const resolvedPath = resolvePathWithTsExtension(
        specifier,
        context.parentURL,
      )

      return {
        url: pathToFileURL(resolvedPath).href,
        shortCircuit: true,
      }
    }
  }

  return nextResolve(specifier, context)
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const filePath = fileURLToPath(url)
    const source = await readFile(filePath, "utf8")

    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        isolatedModules: true,
      },
      fileName: filePath,
    })

    return {
      format: "module",
      source: transpiled.outputText,
      shortCircuit: true,
    }
  }

  return nextLoad(url, context)
}