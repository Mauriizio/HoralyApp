import { writeFile } from "node:fs/promises"

const endpoint = process.argv[2] ?? "http://localhost:9222"
const targetUrl = process.argv[3] ?? "http://localhost:3010/?tab=horario"
const output = process.argv[4] ?? "docs/qa/browser.png"
const width = Number(process.argv[5] ?? 390), height = Number(process.argv[6] ?? 844)
const pages = await fetch(`${endpoint}/json`).then((response) => response.json())
const page = pages.find((item) => item.type === "page")
if (!page) throw new Error("No browser page target")
const socket = new WebSocket(page.webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
let id = 0; const pending = new Map(); socket.onmessage = (event) => { const message = JSON.parse(event.data); pending.get(message.id)?.(message) }
const call = (method, params = {}) => new Promise((resolve) => { const callId = ++id; pending.set(callId, (message) => { pending.delete(callId); resolve(message.result) }); socket.send(JSON.stringify({ id: callId, method, params })) })
const modules = Array.from({ length: 8 }, (_, index) => ({ id: `m${index + 1}`, label: `Módulo ${index + 1}`, start: `${String(8 + index).padStart(2, "0")}:00`, end: `${String(8 + index).padStart(2, "0")}:45` }))
const semesterId = "qa-semester", subjectId = "qa-subject", noteId = "qa-note"
const tutorialProgress = Object.fromEntries(["basic-tour","schedule-tour","grades-tour","reminders-tour","tools-tour","preferences-tour","assistant-tour","analytics-tour","notebook-tour","advanced-mode-tour"].map((key) => [key, { version: 2, status: "completed", currentStep: 99 }]))
const data = { subjects: [{ id: subjectId, semesterId, name: "Sistemas Electroneumáticos Industriales", color: "#7c3aed", icon: "Orbit", difficulty: 3, createdAt: Date.now() }], blocks: [{ id: "qa-block", semesterId, subjectId, day: "jueves", moduleIds: ["m1", "m2"] }], studyBlocks: [], reminders: [], modules, grades: [], assessmentGroups: [], subjectNotes: [{ id: noteId, semesterId, subjectId, title: "Apunte QA", unit: "Unidad 1", content: "Texto seguro de prueba", document: { version: 1, blocks: [{ id: "p", type: "paragraph", content: [{ text: "Texto seguro de prueba", marks: ["bold"] }] }] }, createdAt: Date.now(), updatedAt: Date.now() }], subjectNoteAttachments: [], profile: { displayName: "Estudiante QA" }, settings: { theme: "dark", language: "es", accentColor: "#7c3aed", fontFamily: "sans", fontScale: 1, timeFormat: "24h", radius: .875, blockOpacity: .9, focusMode: false, enableSaturday: false, visibleScheduleDays: ["lunes","martes","miercoles","jueves"], googleCalendarConnected: false, gradeScale: { min: 1, max: 7, passing: 4 }, onboarding: { currentStep: 0, completed: true, activationCompletedAt: new Date().toISOString() }, advancedModeEnabled: false }, semesters: [{ id: semesterId, name: "Semestre QA", status: "active", createdAt: Date.now() }], activeSemesterId: semesterId, version: 6 }
data.settings.tutorialProgress = tutorialProgress
await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 })
await call("Page.navigate", { url: "http://localhost:3010" }); await new Promise((resolve) => setTimeout(resolve, 1500))
await call("Runtime.evaluate", { expression: `localStorage.setItem("horario-escolar:v1", ${JSON.stringify(JSON.stringify(data))})` })
await call("Page.navigate", { url: targetUrl }); await new Promise((resolve) => setTimeout(resolve, 3500))
if (targetUrl.includes("qa=open-notebook")) { await call("Runtime.evaluate", { expression: `Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes("Abrir cuaderno"))?.click()` }); await new Promise((resolve) => setTimeout(resolve, 1200)); await call("Runtime.evaluate", { expression: `Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes("Apunte QA"))?.click()` }); await new Promise((resolve) => setTimeout(resolve, 1000)) }
if (targetUrl.includes("drawing=true")) { await call("Runtime.evaluate", { expression: `Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes("Dibujar"))?.click()` }); await new Promise((resolve) => setTimeout(resolve, 700)) }
if (targetUrl.includes("qa=edit-module")) { await call("Runtime.evaluate", { expression: `document.querySelector('button[aria-label^="Editar Módulo"]')?.click()` }); await new Promise((resolve) => setTimeout(resolve, 700)) }
const capture = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await writeFile(output, Buffer.from(capture.data, "base64")); socket.close()
