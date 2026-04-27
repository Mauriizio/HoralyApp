export type HorarilySpriteLayer =
  | "ojos"
  | "ojos-cerrados"
  | "ojos-triste"
  | "cejas"
  | "cejas-riendo"
  | "cejas-triste"
  | "boca"
  | "boca-riendo"
  | "boca-triste"
  | "lapiz"
  | "cuerpo"
  | "pies"
  | "brazo-izq"
  | "brazo-der"

export type HorarlyAnimationState =
  | "IDLE"
  | "HABLANDO"
  | "FELIZ"
  | "TRISTE"
  | "ESCRIBIENDO"
  | "SORPRENDIDO"
  | "PENSANDO"

export type BrazoAnimation = "idle-swing" | "wave" | "write" | "excited" | "droopy" | "talking"

export interface HorarilyLayerConfig {
  visible: HorarilySpriteLayer[]
  hidden: HorarilySpriteLayer[]
  brazoIzqAnim: BrazoAnimation
  brazoDerAnim: BrazoAnimation
  bodyFloat: boolean
  blinkInterval: number
  description: string
}

const ALWAYS_VISIBLE: HorarilySpriteLayer[] = ["cuerpo", "pies", "brazo-izq", "brazo-der"]

const ALL_SWAP_LAYERS: HorarilySpriteLayer[] = [
  "ojos",
  "ojos-cerrados",
  "ojos-triste",
  "cejas",
  "cejas-riendo",
  "cejas-triste",
  "boca",
  "boca-riendo",
  "boca-triste",
  "lapiz",
]

function buildConfig(
  visible: HorarilySpriteLayer[],
  opts: Omit<HorarilyLayerConfig, "visible" | "hidden">,
): HorarilyLayerConfig {
  return {
    visible: [...ALWAYS_VISIBLE, ...visible],
    hidden: ALL_SWAP_LAYERS.filter((layer) => !visible.includes(layer)),
    ...opts,
  }
}

export const HORARILY_STATES: Record<HorarlyAnimationState, HorarilyLayerConfig> = {
  IDLE: buildConfig(["ojos", "cejas", "boca"], {
    brazoIzqAnim: "idle-swing",
    brazoDerAnim: "idle-swing",
    bodyFloat: true,
    blinkInterval: 4000,
    description: 'Estado de reposo. Horarily está "vivo": flota, parpadea y mueve los brazos suavemente.',
  }),
  HABLANDO: buildConfig(["ojos", "cejas", "boca"], {
    brazoIzqAnim: "talking",
    brazoDerAnim: "talking",
    bodyFloat: true,
    blinkInterval: 5000,
    description:
      "Horarily está hablando. La boca alterna entre #boca y #boca-riendo cada 300ms. Los brazos gesticulan.",
  }),
  FELIZ: buildConfig(["ojos-cerrados", "cejas-riendo", "boca-riendo"], {
    brazoIzqAnim: "excited",
    brazoDerAnim: "excited",
    bodyFloat: true,
    blinkInterval: 0,
    description: "Horarily está feliz. Ojos cerrados riendo, boca abierta, brazos arriba celebrando.",
  }),
  TRISTE: buildConfig(["ojos-triste", "cejas-triste", "boca-triste"], {
    brazoIzqAnim: "droopy",
    brazoDerAnim: "droopy",
    bodyFloat: false,
    blinkInterval: 6000,
    description: "Horarily está triste. Ojos caídos, boca hacia abajo, brazos colgando. Sin float.",
  }),
  ESCRIBIENDO: buildConfig(["ojos", "cejas", "boca", "lapiz"], {
    brazoIzqAnim: "write",
    brazoDerAnim: "idle-swing",
    bodyFloat: false,
    blinkInterval: 4000,
    description:
      "Horarily ayuda al usuario a escribir. El lápiz aparece. Brazo izq hace movimiento de escritura.",
  }),
  SORPRENDIDO: buildConfig(["ojos", "cejas-riendo", "boca-riendo"], {
    brazoIzqAnim: "wave",
    brazoDerAnim: "wave",
    bodyFloat: false,
    blinkInterval: 2000,
    description: "Horarily está sorprendido/alerta. Parpadeo rápido, brazos levantados. Para eventos urgentes.",
  }),
  PENSANDO: buildConfig(["ojos", "cejas", "boca"], {
    brazoIzqAnim: "write",
    brazoDerAnim: "idle-swing",
    bodyFloat: true,
    blinkInterval: 3500,
    description:
      "Horarily está pensando/cargando. Brazos sugestivos de reflexión. Usar con spinner en el cuadro de diálogo.",
  }),
}

export function getLayersForState(state: HorarlyAnimationState): HorarilyLayerConfig {
  return HORARILY_STATES[state]
}

export function resolveHorarlyState(context: {
  isSpeaking?: boolean
  isUserTyping?: boolean
  isLoading?: boolean
  hasUrgentEvent?: boolean
  lastNoteGrade?: number
  hasPendingTasks?: boolean
  isWeekend?: boolean
}): HorarlyAnimationState {
  const { isSpeaking, isUserTyping, isLoading, hasUrgentEvent, lastNoteGrade, hasPendingTasks } = context

  if (isUserTyping) return "ESCRIBIENDO"
  if (isLoading) return "PENSANDO"
  if (isSpeaking) return "HABLANDO"
  if (hasUrgentEvent) return "SORPRENDIDO"

  if (lastNoteGrade !== undefined) {
    if (lastNoteGrade >= 5.0) return "FELIZ"
    if (lastNoteGrade < 4.0) return "TRISTE"
  }

  if (hasPendingTasks) return "TRISTE"

  return "IDLE"
}
