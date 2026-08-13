import { writeFile } from "node:fs/promises"
import { pathToFileURL } from "node:url"

const [input, output] = process.argv.slice(2)
if (!input || !output) throw new Error("Uso: qa-pdf-browser.mjs <pdf> <png>")
const pages = await fetch("http://localhost:9222/json").then((response) => response.json())
const page = pages.find((item) => item.type === "page")
const socket = new WebSocket(page.webSocketDebuggerUrl); await new Promise((resolve) => { socket.onopen = resolve })
let id = 0; const pending = new Map(); socket.onmessage = (event) => { const message = JSON.parse(event.data); if (!Number.isInteger(message.id)) return; const callback = pending.get(message.id); if (typeof callback === "function") callback(message.result); pending.delete(message.id) }
const call = (method, params = {}) => new Promise((resolve) => { const callId = ++id; pending.set(callId, resolve); socket.send(JSON.stringify({ id: callId, method, params })) })
await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await call("Page.navigate", { url: pathToFileURL(input).href }); await new Promise((resolve) => setTimeout(resolve, 1800))
const shot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false })
await writeFile(output, Buffer.from(shot.data, "base64")); socket.close()
