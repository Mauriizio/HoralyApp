"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, ImagePlus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { captureVideoFrame, REAR_CAMERA_CONSTRAINTS, stopMediaStream } from "@/domain/notebook/camera"

export function CameraCaptureDialog({ open, onOpenChange, onPhoto, onGalleryFallback }: { open: boolean; onOpenChange: (open: boolean) => void; onPhoto: (file: File) => void; onGalleryFallback: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const requestRef = useRef(0)
  const [error, setError] = useState("")
  const [ready, setReady] = useState(false)

  const stop = useCallback(() => { requestRef.current += 1; stopMediaStream(streamRef.current); streamRef.current = null; if (videoRef.current) videoRef.current.srcObject = null; setReady(false) }, [])
  const start = useCallback(async () => {
    stop(); setError(""); const request = requestRef.current
    try {
      const stream = await navigator.mediaDevices.getUserMedia(REAR_CAMERA_CONSTRAINTS)
      if (request !== requestRef.current || !videoRef.current) { stopMediaStream(stream); return }
      streamRef.current = stream; videoRef.current.srcObject = stream; await videoRef.current.play()
    } catch { stop(); setError("No pudimos acceder a la cámara.") }
  }, [stop])
  useEffect(() => { if (open) void start(); else stop(); return stop }, [open, start, stop])

  const close = () => { stop(); onOpenChange(false) }
  const capture = async () => {
    try { const file = await captureVideoFrame(videoRef.current!); stop(); onOpenChange(false); onPhoto(file) }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo capturar la foto.") }
  }
  return <Dialog open={open} onOpenChange={(next) => next ? onOpenChange(true) : close()}>
    <DialogContent data-testid="camera-dialog" className="sm:max-w-xl" onEscapeKeyDown={close}>
      <DialogHeader><DialogTitle>Cámara</DialogTitle><DialogDescription>Fotografía tu pizarra o apunte. La imagen se procesa solo en este dispositivo.</DialogDescription></DialogHeader>
      {error ? <div className="grid min-h-56 place-items-center rounded-lg border border-dashed p-6 text-center"><div><p role="alert" className="text-sm text-destructive">{error}</p><div className="mt-4 flex flex-wrap justify-center gap-2"><Button type="button" variant="outline" onClick={() => void start()}><RefreshCw className="mr-2 size-4" />Reintentar</Button><Button type="button" onClick={() => { close(); onGalleryFallback() }}><ImagePlus className="mr-2 size-4" />Elegir de galería</Button></div></div></div> : <video ref={videoRef} data-testid="camera-preview" autoPlay muted playsInline onLoadedMetadata={() => setReady(true)} className="max-h-[65vh] w-full rounded-lg bg-black object-contain" />}
      {!error ? <DialogFooter><Button type="button" variant="outline" onClick={close}>Cancelar</Button><Button type="button" disabled={!ready} onClick={() => void capture()}><Camera className="mr-2 size-4" />Tomar foto</Button></DialogFooter> : null}
    </DialogContent>
  </Dialog>
}
