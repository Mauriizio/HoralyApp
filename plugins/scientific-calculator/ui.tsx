"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import type { ToolPluginProps } from "@/lib/plugins/plugin-types"
import { CalculatorError, evaluateExpression, formatCalculatorResult, type AngleMode } from "./domain"

const keys = [
  ["sin(", "cos(", "tan(", "DEG/RAD", "⌫"],
  ["log(", "ln(", "sqrt(", "^", "C"],
  ["(", ")", "!", "%", "/"],
  ["7", "8", "9", "π", "*"],
  ["4", "5", "6", "e", "-"],
  ["1", "2", "3", "x²", "+"],
  ["±", "0", ".", "1/x", "="],
]

export default function ScientificCalculator({ createNamespacedStorage }: ToolPluginProps) {
  const storage = useMemo(() => createNamespacedStorage("scientific-calculator"), [createNamespacedStorage])
  const [expression, setExpression] = useState("")
  const [result, setResult] = useState("0")
  const [error, setError] = useState("")
  const [angleMode, setAngleMode] = useState<AngleMode>("DEG")
  const [history, setHistory] = useState<Array<{ expression: string; result: string }>>([])
  const [tourStep, setTourStep] = useState(() => storage.getItem("tour-v1") ? -1 : 0)

  const calculate = () => {
    try {
      const value = evaluateExpression(expression, angleMode)
      const formatted = formatCalculatorResult(value)
      setResult(formatted)
      setHistory((current) => [{ expression, result: formatted }, ...current].slice(0, 20))
      setError("")
    } catch (caught) {
      setError(caught instanceof CalculatorError ? caught.message : "No se pudo calcular la expresión.")
    }
  }
  const press = (key: string) => {
    if (key === "=") return calculate()
    if (key === "C") { setExpression(""); setResult("0"); setError(""); return }
    if (key === "⌫") { setExpression((value) => value.slice(0, -1)); return }
    if (key === "DEG/RAD") { setAngleMode((mode) => mode === "DEG" ? "RAD" : "DEG"); return }
    if (key === "±") { setExpression((value) => value ? `-(${value})` : "-"); return }
    if (key === "x²") { setExpression((value) => `(${value})^2`); return }
    if (key === "1/x") { setExpression((value) => `1/(${value})`); return }
    setExpression((value) => value + key)
  }
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (/^[0-9+\-*/^().%!e]$/.test(event.key)) press(event.key)
      else if (event.key === "Enter") { event.preventDefault(); calculate() }
      else if (event.key === "Backspace") press("⌫")
      else if (event.key === "Escape") press("C")
    }
    window.addEventListener("keydown", keyboard)
    return () => window.removeEventListener("keydown", keyboard)
  })

  const tour = [
    "Escribe una expresión con el teclado físico o los botones.",
    "Usa funciones científicas como sin, log, raíz y factorial.",
    "Cambia entre grados y radianes con el botón DEG/RAD.",
    "Revisa los resultados recientes en el historial de esta sesión.",
  ]
  const closeTour = () => { storage.setItem("tour-v1", "completed"); setTourStep(-1) }

  return (
    <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      {tourStep >= 0 && <div className="absolute inset-x-2 top-2 z-20 rounded-xl border-2 border-primary bg-card p-4 shadow-xl" role="dialog" aria-label="Tutorial de calculadora"><p className="text-xs text-primary">Paso {tourStep + 1} de 4</p><p className="mt-2 font-medium">{tour[tourStep]}</p><div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={closeTour}>Saltar</Button>{tourStep < 3 ? <Button onClick={() => setTourStep((step) => step + 1)}>Siguiente</Button> : <Button onClick={closeTour}>Finalizar</Button>}</div></div>}
      <section className="space-y-3 rounded-2xl border bg-card p-3 sm:p-5">
        <div className="rounded-xl bg-muted p-4 text-right">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground"><button className="underline" onClick={() => setTourStep(0)}>Ver tutorial</button><span>{angleMode}</span></div>
          <input aria-label="Expresión" value={expression} onChange={(event) => setExpression(event.target.value)} className="w-full bg-transparent text-right text-lg outline-none" placeholder="0" />
          <output className="mt-2 block min-h-10 break-all text-3xl font-semibold">{result}</output>
          {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {keys.flat().map((key, index) => <Button key={`${key}-${index}`} type="button" variant={key === "=" ? "default" : "outline"} className="min-h-12 px-1 text-sm sm:text-base" onClick={() => press(key)}>{key === "DEG/RAD" ? angleMode : key}</Button>)}
        </div>
      </section>
      <aside className="rounded-2xl border bg-card p-4">
        <h3 className="font-semibold">Historial de sesión</h3>
        <div className="mt-3 max-h-[32rem] space-y-2 overflow-y-auto">{history.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay cálculos.</p> : history.map((entry, index) => <button key={`${entry.expression}-${index}`} className="w-full rounded-lg bg-muted p-2 text-right" onClick={() => setExpression(entry.expression)}><span className="block truncate text-xs text-muted-foreground">{entry.expression}</span><span className="font-medium">= {entry.result}</span></button>)}</div>
      </aside>
    </div>
  )
}
