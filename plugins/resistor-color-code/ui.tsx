"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { bandsToValue, valueToBands, type BandCount, type ResistorColor } from "./domain"

const colorOptions: ResistorColor[] = ["negro", "marrón", "rojo", "naranja", "amarillo", "verde", "azul", "violeta", "gris", "blanco", "oro", "plata"]
const swatch: Record<ResistorColor, string> = { negro: "#111827", marrón: "#92400e", rojo: "#dc2626", naranja: "#f97316", amarillo: "#facc15", verde: "#16a34a", azul: "#2563eb", violeta: "#7c3aed", gris: "#6b7280", blanco: "#f8fafc", oro: "#d4af37", plata: "#c0c0c0" }

export function ResistorColorCodeTool() {
  const [bandCount, setBandCount] = useState<BandCount>(4)
  const [colors, setColors] = useState<ResistorColor[]>(["marrón", "negro", "rojo", "oro", "marrón", "marrón"])
  const [value, setValue] = useState("4700")
  const [unit, setUnit] = useState<"Ω" | "kΩ" | "MΩ">("Ω")
  const [copied, setCopied] = useState(false)
  const visible = colors.slice(0, bandCount)
  const factor = unit === "Ω" ? 1 : unit === "kΩ" ? 1_000 : 1_000_000
  const colorResult = useMemo(() => { try { return bandsToValue({ bandCount, colors: visible }) } catch (error) { return error instanceof Error ? error : new Error("Entrada inválida") } }, [bandCount, visible.join("|")])
  const valueResult = useMemo(() => { try { return valueToBands({ ohms: Number(value) * factor, bandCount, tolerancePercent: 5, temperatureCoefficientPpm: bandCount === 6 ? 100 : undefined }) } catch (error) { return error instanceof Error ? error : new Error("Entrada inválida") } }, [bandCount, factor, value])
  const summary = colorResult instanceof Error ? colorResult.message : `${formatOhms(colorResult.nominalOhms)} ±${colorResult.tolerancePercent}% (${formatOhms(colorResult.minimumOhms)} a ${formatOhms(colorResult.maximumOhms)})${colorResult.temperatureCoefficientPpm ? `, ${colorResult.temperatureCoefficientPpm} ppm/°C` : ""}`
  return <div className="space-y-5" aria-label="Calculadora de código de colores de resistencias">
    <div className="flex flex-wrap gap-2" role="group" aria-label="Número de bandas">{([4,5,6] as BandCount[]).map((count) => <Button key={count} variant={bandCount === count ? "default" : "outline"} onClick={() => setBandCount(count)} aria-pressed={bandCount === count}>{count} bandas</Button>)}</div>
    <div className="rounded-xl border bg-muted/30 p-4"><div className="mx-auto flex h-16 max-w-lg items-center justify-center rounded-full border bg-amber-100 px-8" aria-label={`Resistencia visual con bandas ${visible.join(", ")}`}>{visible.map((color, index) => <span key={`${color}-${index}`} className="mx-1 h-16 w-4 border border-black/20" style={{ backgroundColor: swatch[color] }} title={`${bandLabel(index, bandCount)}: ${color}`} />)}</div></div>
    <section className="grid gap-3 md:grid-cols-2"><div className="space-y-3"><h3 className="font-semibold">Colores → valor</h3>{visible.map((color, index) => <div key={index} className="grid gap-1"><Label htmlFor={`band-${index}`}>{bandLabel(index, bandCount)}</Label><select id={`band-${index}`} className="rounded-md border bg-background px-3 py-2 text-sm" value={color} onChange={(e) => setColors((current) => current.map((item, i) => i === index ? e.target.value as ResistorColor : item))}>{colorOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>)}<p role={colorResult instanceof Error ? "alert" : "status"} className="rounded-md border p-3 text-sm">{summary}</p></div><div className="space-y-3"><h3 className="font-semibold">Valor → colores</h3><Label htmlFor="resistor-value">Valor</Label><Input id="resistor-value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} /><Label htmlFor="unit">Unidad</Label><select id="unit" className="rounded-md border bg-background px-3 py-2 text-sm" value={unit} onChange={(e) => setUnit(e.target.value as typeof unit)}><option>Ω</option><option>kΩ</option><option>MΩ</option></select><p className="rounded-md border p-3 text-sm">{valueResult instanceof Error ? valueResult.message : `${valueResult.colors.join(" · ")} = ${formatOhms(valueResult.representedOhms)}. Diferencia: ${formatOhms(valueResult.differenceOhms)}${valueResult.warning ? `. ${valueResult.warning}` : ""}`}</p></div></section>
    <div className="flex flex-wrap gap-2"><Button type="button" onClick={async () => { await navigator.clipboard?.writeText(summary); setCopied(true) }}>{copied ? "Copiado" : "Copiar resultado"}</Button><Button type="button" variant="outline" onClick={() => { setBandCount(4); setColors(["marrón", "negro", "rojo", "oro", "marrón", "marrón"]); setValue("4700"); setCopied(false) }}>Reiniciar</Button><Button type="button" variant="ghost" onClick={() => { setBandCount(5); setColors(["marrón", "negro", "negro", "naranja", "marrón", "marrón"]); setValue("100") }}>Ejemplo 100 kΩ</Button></div>
  </div>
}
function bandLabel(index: number, count: BandCount) { const names = count === 4 ? ["Primer dígito", "Segundo dígito", "Multiplicador", "Tolerancia"] : ["Primer dígito", "Segundo dígito", "Tercer dígito", "Multiplicador", "Tolerancia", "Coeficiente térmico"]; return names[index] ?? "Banda" }
function formatOhms(value: number) { if (Math.abs(value) >= 1_000_000) return `${Number((value / 1_000_000).toFixed(4))} MΩ`; if (Math.abs(value) >= 1_000) return `${Number((value / 1_000).toFixed(4))} kΩ`; return `${Number(value.toFixed(4))} Ω` }
