export type BandCount = 4 | 5 | 6
export type ResistorColor = "negro" | "marrón" | "rojo" | "naranja" | "amarillo" | "verde" | "azul" | "violeta" | "gris" | "blanco" | "oro" | "plata"

const DIGITS: Record<Exclude<ResistorColor, "oro" | "plata">, number> = { negro: 0, marrón: 1, rojo: 2, naranja: 3, amarillo: 4, verde: 5, azul: 6, violeta: 7, gris: 8, blanco: 9 }
const MULTIPLIERS: Partial<Record<ResistorColor, number>> = { negro: 1, marrón: 10, rojo: 100, naranja: 1_000, amarillo: 10_000, verde: 100_000, azul: 1_000_000, violeta: 10_000_000, gris: 100_000_000, blanco: 1_000_000_000, oro: 0.1, plata: 0.01 }
const TOLERANCES: Partial<Record<ResistorColor, number>> = { marrón: 1, rojo: 2, verde: 0.5, azul: 0.25, violeta: 0.1, gris: 0.05, oro: 5, plata: 10 }
const TEMPERATURE: Partial<Record<ResistorColor, number>> = { marrón: 100, rojo: 50, naranja: 15, amarillo: 25, azul: 10, violeta: 5 }
const DIGIT_TO_COLOR = Object.fromEntries(Object.entries(DIGITS).map(([color, digit]) => [digit, color])) as Record<number, ResistorColor>

export function bandsToValue(input: { bandCount: BandCount; colors: ResistorColor[] }) {
  const { bandCount, colors } = input
  if (colors.length !== bandCount) throw new Error("Cantidad de bandas inválida.")
  const significantCount = bandCount === 4 ? 2 : 3
  const significant = colors.slice(0, significantCount).map((color) => {
    if (!(color in DIGITS)) throw new Error("Color significativo inválido.")
    return DIGITS[color as keyof typeof DIGITS]
  })
  const multiplierColor = colors[significantCount]
  const toleranceColor = colors[significantCount + 1]
  const multiplier = MULTIPLIERS[multiplierColor]
  const tolerancePercent = TOLERANCES[toleranceColor]
  if (multiplier == null) throw new Error("Multiplicador inválido.")
  if (tolerancePercent == null) throw new Error("Tolerancia inválida.")
  const temperatureCoefficientPpm = bandCount === 6 ? TEMPERATURE[colors[5]] : undefined
  if (bandCount === 6 && temperatureCoefficientPpm == null) throw new Error("Coeficiente térmico inválido.")
  const nominalOhms = Number(significant.join("")) * multiplier
  return { bandCount, colors, nominalOhms, tolerancePercent, temperatureCoefficientPpm, minimumOhms: nominalOhms * (1 - tolerancePercent / 100), maximumOhms: nominalOhms * (1 + tolerancePercent / 100) }
}

export function valueToBands(input: { ohms: number; bandCount: BandCount; tolerancePercent: number; temperatureCoefficientPpm?: number }) {
  const { ohms, bandCount, tolerancePercent } = input
  if (!Number.isFinite(ohms) || ohms <= 0 || ohms > 1e12) throw new Error("Ingresa un valor válido y positivo dentro del rango permitido.")
  const toleranceColor = findColor(TOLERANCES, tolerancePercent, "tolerancia")
  const tempColor = bandCount === 6 ? findColor(TEMPERATURE, input.temperatureCoefficientPpm ?? 100, "coeficiente térmico") : undefined
  const significantCount = bandCount === 4 ? 2 : 3
  let best: { colors: ResistorColor[]; representedOhms: number; differenceOhms: number } | null = null
  for (const [multiplierColor, multiplier] of Object.entries(MULTIPLIERS) as [ResistorColor, number][]) {
    const raw = ohms / multiplier
    const rounded = Math.round(raw)
    const min = 10 ** (significantCount - 1)
    const max = 10 ** significantCount - 1
    if (rounded < min || rounded > max) continue
    const digits = String(rounded).padStart(significantCount, "0").split("").map(Number)
    if (digits[0] === 0) continue
    const representedOhms = rounded * multiplier
    const differenceOhms = representedOhms - ohms
    const candidate = { colors: [...digits.map((digit) => DIGIT_TO_COLOR[digit]), multiplierColor, toleranceColor, ...(tempColor ? [tempColor] : [])], representedOhms, differenceOhms }
    if (!best || Math.abs(candidate.differenceOhms) < Math.abs(best.differenceOhms)) best = candidate
  }
  if (!best) throw new Error("Valor fuera del rango representable.")
  return { bandCount, ...best, exact: Math.abs(best.differenceOhms) < 1e-9, warning: Math.abs(best.differenceOhms) < 1e-9 ? undefined : "El valor solicitado no es exacto; se recomiendan las bandas más cercanas." }
}

function findColor(table: Partial<Record<ResistorColor, number>>, value: number, label: string): ResistorColor {
  const entry = Object.entries(table).find(([, current]) => current === value)
  if (!entry) throw new Error(`No existe color para ${label}.`)
  return entry[0] as ResistorColor
}

export const RESISTOR_COLORS = { DIGITS, MULTIPLIERS, TOLERANCES, TEMPERATURE }
