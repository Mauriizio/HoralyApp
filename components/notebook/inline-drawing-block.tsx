"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Eraser, Pencil, Redo2, RotateCcw, Trash2, Undo2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { commitActiveStroke, redoStroke, undoStroke, type DrawingStroke } from "@/domain/notebook/drawing-strokes"
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No se pudo generar el dibujo.")), "image/png"))
}

function paint(canvas: HTMLCanvasElement, strokes: DrawingStroke[], active: DrawingStroke | null) {
  const context = canvas.getContext("2d"); if (!context) return
  context.clearRect(0, 0, canvas.width, canvas.height); context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height)
  for (const stroke of active ? [...strokes, active] : strokes) {
    context.strokeStyle = stroke.color; context.lineWidth = stroke.width; context.lineCap = "round"; context.lineJoin = "round"; context.beginPath()
    stroke.points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)); context.stroke()
  }
}

export function InlineDrawingBlock({ blockId, onComplete, onCancel }: { blockId: string; onComplete: (blob: Blob) => Promise<void>; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef<DrawingStroke | null>(null)
  const [strokes, setStrokes] = useState<DrawingStroke[]>([])
  const strokesRef = useRef(strokes); strokesRef.current = strokes
  const [redo, setRedo] = useState<DrawingStroke[]>([])
  const [width, setWidth] = useState(3), [eraser, setEraser] = useState(false)
  const [saving, setSaving] = useState(false), [error, setError] = useState("")

  const redraw = useCallback(() => { if (canvasRef.current) paint(canvasRef.current, strokesRef.current, activeRef.current) }, [])
  useEffect(redraw, [redraw, strokes])
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => { const rect = event.currentTarget.getBoundingClientRect(); return { x: (event.clientX - rect.left) * event.currentTarget.width / rect.width, y: (event.clientY - rect.top) * event.currentTarget.height / rect.height } }
  const finishPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    const active = activeRef.current; activeRef.current = null
    if (active) setStrokes((current) => commitActiveStroke(current, active)); redraw()
  }
  const complete = async () => {
    if (!canvasRef.current || !strokes.length || saving) return
    setSaving(true); setError("")
    try { await onComplete(await canvasToBlob(canvasRef.current)) }
    catch { setError("No se pudo guardar el dibujo. Intenta nuevamente.") }
    finally { setSaving(false) }
  }
  return <section data-testid="drawing-draft-block" data-block-id={blockId} className="overflow-hidden rounded-xl border bg-muted/20 shadow-sm" aria-label="Bloque de dibujo en edición">
    <div className="sticky top-0 z-10 space-y-1 border-b bg-background/95 p-2 backdrop-blur">
      <div className="flex max-w-full items-center gap-1 overflow-x-auto">
      <Button size="sm" variant={!eraser ? "secondary" : "ghost"} onClick={() => setEraser(false)}><Pencil className="mr-1 size-4" />Lápiz</Button>
      <Button size="sm" variant={eraser ? "secondary" : "ghost"} onClick={() => setEraser(true)}><Eraser className="mr-1 size-4" />Borrador</Button>
      <label className="flex min-h-9 items-center gap-1 px-2 text-xs">Grosor <input aria-label="Grosor del trazo" className="w-20" type="range" min="1" max="18" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></label>
      <Button size="icon" variant="ghost" aria-label="Deshacer" disabled={!strokes.length || saving} onClick={() => { const next = undoStroke(strokes, redo); setStrokes(next.strokes); setRedo(next.redo) }}><Undo2 className="size-4" /></Button>
      <Button size="icon" variant="ghost" aria-label="Rehacer" disabled={!redo.length || saving} onClick={() => { const next = redoStroke(strokes, redo); setStrokes(next.strokes); setRedo(next.redo) }}><Redo2 className="size-4" /></Button>
      <Button size="icon" variant="ghost" aria-label="Limpiar" disabled={!strokes.length || saving} onClick={() => { setStrokes([]); setRedo([]) }}><Trash2 className="size-4" /></Button>
      </div>
      <div className="flex justify-end gap-1 border-t pt-1"><Button size="sm" variant="ghost" disabled={saving} onClick={onCancel}><X className="mr-1 size-4" />Cancelar</Button><Button size="sm" disabled={!strokes.length || saving} onClick={() => void complete()}>{saving ? <><RotateCcw className="mr-1 size-4 animate-spin" />Guardando dibujo…</> : "Listo"}</Button></div>
    </div>
    <canvas ref={canvasRef} width={1000} height={440} aria-label="Lienzo de dibujo dentro del apunte" className="block h-[clamp(260px,38vw,400px)] w-full touch-none bg-white" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); activeRef.current = { color: eraser ? "#ffffff" : "#111827", width: eraser ? width * 3 : width, points: [point(event)] }; setRedo([]); redraw() }} onPointerMove={(event) => { if (!activeRef.current) return; activeRef.current.points.push(point(event)); redraw() }} onPointerUp={finishPointer} onPointerCancel={finishPointer} />
    {error ? <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-destructive/5 p-2"><p role="alert" className="text-sm text-destructive">{error}</p><Button size="sm" variant="outline" disabled={saving} onClick={() => void complete()}>Reintentar</Button></div> : null}
  </section>
}
