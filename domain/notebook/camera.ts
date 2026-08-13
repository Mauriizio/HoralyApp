export const REAR_CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: { facingMode: { ideal: "environment" } },
}

export function stopMediaStream(stream: Pick<MediaStream, "getTracks"> | null | undefined) {
  stream?.getTracks().forEach((track) => track.stop())
}

export function cameraApiAvailable() {
  return typeof window !== "undefined" && window.isSecureContext && typeof navigator.mediaDevices?.getUserMedia === "function"
}

export async function captureVideoFrame(video: Pick<HTMLVideoElement, "videoWidth" | "videoHeight"> & CanvasImageSource): Promise<File> {
  const width = video.videoWidth, height = video.videoHeight
  if (!width || !height) throw new Error("La cámara aún no está lista.")
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height
  const context = canvas.getContext("2d"); if (!context) throw new Error("No se pudo capturar la foto.")
  context.drawImage(video, 0, 0, width, height)
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("No se pudo capturar la foto.")), "image/jpeg", 0.9))
  return new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" })
}
