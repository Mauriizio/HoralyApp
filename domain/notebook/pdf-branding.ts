import type { jsPDF } from "jspdf"

export const HORARILY_PUBLIC_URL = "https://horaly-app.vercel.app"
export const HORARILY_LOGOMARK_ASSET = "/horarily_logo_assets_fullhd_svg/horarily_simbolo_transparente_1024.png"

export interface NotebookPdfBranding { subjectName: string; title?: string; unit?: string; date?: string; qrAsset?: Uint8Array }

export async function loadHorarilyLogomark(): Promise<Uint8Array | undefined> {
  if (typeof window === "undefined") return undefined
  try { const response = await fetch(HORARILY_LOGOMARK_ASSET); return response.ok ? new Uint8Array(await response.arrayBuffer()) : undefined } catch { return undefined }
}

export function drawNotebookHeader(doc: jsPDF, input: NotebookPdfBranding, logo?: Uint8Array): number {
  const margin = 42
  if (logo) doc.addImage(logo, "PNG", margin, 28, 28, 28, undefined, "FAST")
  doc.setTextColor(65, 38, 120); doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text("HORARILY", logo ? margin + 36 : margin, 43)
  doc.setTextColor(0); doc.setFontSize(11); doc.text(`Apuntes de ${input.subjectName}`, margin, 70)
  if (input.title) { doc.setFontSize(16); doc.text(input.title, margin, 92) }
  doc.setFont("helvetica", "normal"); doc.setFontSize(9)
  const metadata = [input.unit, input.date].filter(Boolean).join(" · "); if (metadata) doc.text(metadata, margin, 108)
  doc.setDrawColor(190); doc.line(margin, 118, 553, 118)
  return 136
}

export function drawNotebookFooter(doc: jsPDF, input: Pick<NotebookPdfBranding, "subjectName" | "qrAsset">, page: number, total: number) {
  const y = 804; doc.setDrawColor(210); doc.line(42, y - 14, 553, y - 14)
  doc.setTextColor(90); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5)
  doc.text(`Estos apuntes de ${input.subjectName} fueron tomados con Horarily.`, 42, y)
  doc.text("Organiza tus clases, notas y apuntes en un solo lugar.", 42, y + 10)
  doc.text(HORARILY_PUBLIC_URL, 553, y, { align: "right" }); doc.text(`${page}/${total}`, 553, y + 10, { align: "right" })
  // qrAsset is intentionally optional; no placeholder or generated QR is rendered.
  doc.setTextColor(0)
}
