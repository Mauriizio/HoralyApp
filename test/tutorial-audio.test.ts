import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { selectPreferredSpeechVoice } from "../hooks/use-speech-synthesis.ts"

test("audio tutorial está aislado en un hook y administra voces y cleanup", async () => {
  const guidedTour = await readFile("components/tutorials/guided-tour.tsx", "utf8")
  const speechHook = await readFile("hooks/use-speech-synthesis.ts", "utf8")
  assert.match(guidedTour, /useSpeechSynthesis/)
  assert.doesNotMatch(guidedTour, /new SpeechSynthesisUtterance/)
  assert.match(speechHook, /voiceschanged/)
  assert.match(speechHook, /getVoices/)
  assert.match(speechHook, /es-cl/i)
  assert.match(speechHook, /es-419/)
  assert.match(speechHook, /es-es/i)
  assert.match(speechHook, /speechSynthesis\.resume/)
  assert.match(speechHook, /speechSynthesis\.cancel/)
})

test("selección de voz prioriza es-CL, es-419, es-ES y luego español", () => {
  const voice = (lang: string) => ({ lang, name: lang, default: false, localService: true, voiceURI: lang }) as SpeechSynthesisVoice
  assert.equal(selectPreferredSpeechVoice([voice("en-US"), voice("es-ES"), voice("es-CL")])?.lang, "es-CL")
  assert.equal(selectPreferredSpeechVoice([voice("en-US"), voice("es-MX"), voice("es-419")])?.lang, "es-419")
  assert.equal(selectPreferredSpeechVoice([voice("en-US"), voice("es-ES")])?.lang, "es-ES")
  assert.equal(selectPreferredSpeechVoice([voice("en-US"), voice("es-MX")])?.lang, "es-MX")
})
