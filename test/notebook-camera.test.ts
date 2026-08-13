import assert from "node:assert/strict"
import test from "node:test"
import { captureVideoFrame, REAR_CAMERA_CONSTRAINTS, stopMediaStream } from "../domain/notebook/camera.ts"

test("cámara solicita entorno posterior sin audio", () => {
  assert.deepEqual(REAR_CAMERA_CONSTRAINTS, { audio: false, video: { facingMode: { ideal: "environment" } } })
})

test("cleanup detiene todos los tracks de cámara", () => {
  let stopped = 0
  stopMediaStream({ getTracks: () => [{ stop: () => { stopped += 1 } }, { stop: () => { stopped += 1 } }] as MediaStreamTrack[] })
  assert.equal(stopped, 2)
})

test("captura convierte el frame en un JPEG File", async () => {
  const previousDocument = globalThis.document
  let drewFrame = false
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: () => { drewFrame = true } }),
    toBlob: (callback: (blob: Blob | null) => void) => callback(new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" })),
  }
  Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: () => canvas } })
  try {
    const file = await captureVideoFrame({ videoWidth: 1280, videoHeight: 720 } as HTMLVideoElement)
    assert.equal(drewFrame, true)
    assert.equal(canvas.width, 1280)
    assert.equal(canvas.height, 720)
    assert.equal(file.type, "image/jpeg")
    assert.match(file.name, /^foto-\d+\.jpg$/)
  } finally {
    Object.defineProperty(globalThis, "document", { configurable: true, value: previousDocument })
  }
})
