export type DrawingPoint = { x: number; y: number }
export type DrawingStroke = { color: string; width: number; points: DrawingPoint[] }

export function commitActiveStroke(strokes: DrawingStroke[], active: DrawingStroke | null) {
  return active?.points.length ? [...strokes, { ...active, points: [...active.points] }] : strokes
}
export function undoStroke(strokes: DrawingStroke[], redo: DrawingStroke[]) {
  const last = strokes.at(-1)
  return last ? { strokes: strokes.slice(0, -1), redo: [last, ...redo] } : { strokes, redo }
}
export function redoStroke(strokes: DrawingStroke[], redo: DrawingStroke[]) {
  const first = redo[0]
  return first ? { strokes: [...strokes, first], redo: redo.slice(1) } : { strokes, redo }
}
