export function startCompanionRotation(input: {
  count: number
  intervalMs?: number
  isPaused: () => boolean
  onAdvance: () => void
}) {
  if (input.count < 2) return () => undefined
  const timer = globalThis.setInterval(() => {
    if (!input.isPaused()) input.onAdvance()
  }, input.intervalMs ?? 8_000)
  return () => globalThis.clearInterval(timer)
}
