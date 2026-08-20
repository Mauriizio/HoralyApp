import type { HorarilyCompanionMessage } from "./horarily-companion.ts"

const MOTIVATIONS = [
  "Dale, una cosa a la vez. Vas avanzando.",
  "Un repaso corto hoy vale más que el estrés de última hora.",
  "Vamos, enfócate en lo próximo. Lo demás viene después.",
  "Cada clase que completas te acerca un poco más a la meta.",
  "Hoy no necesitas hacerlo perfecto; necesitas avanzar.",
  "Un bloque de estudio ahora puede salvarte bastante mañana.",
  "Ese examen se prepara paso a paso. Tú puedes con eso.",
] as const

function utcDayOfYear(now: Date) {
  const start = Date.UTC(now.getUTCFullYear(), 0, 0)
  return Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - start) / 86_400_000)
}

export function getHorarilyDailyMotivation(now: Date): HorarilyCompanionMessage {
  const day = utcDayOfYear(now)
  return {
    key: `motivation:${now.toISOString().slice(0, 10)}`,
    kind: "motivation",
    message: MOTIVATIONS[day % MOTIVATIONS.length],
  }
}
