import type { jsPDF } from "jspdf"

export const HORARILY_PUBLIC_URL = "https://horaly-app.vercel.app"
export const HORARILY_LOGO_ASSET = "/LOGO.png"
export const HORARILY_QR_ASSET = "/qr-code.png"
export const NOTEBOOK_PDF_FOOTER_TOP = 716

export interface NotebookPdfBranding { subjectName: string; title?: string; unit?: string; date?: string; qrAsset?: Uint8Array }

async function loadPngAsset(path: string): Promise<Uint8Array | undefined> {
  if (typeof window === "undefined") return undefined
  try {
    const response = await fetch(path)
    return response.ok ? new Uint8Array(await response.arrayBuffer()) : undefined
  } catch { return undefined }
}

export function loadHorarilyLogo() { return loadPngAsset(HORARILY_LOGO_ASSET) }
export function loadHorarilyQr() { return loadPngAsset(HORARILY_QR_ASSET) }

export function drawNotebookHeader(doc: jsPDF, input: NotebookPdfBranding, logo?: Uint8Array): number {
  const margin = 42
  if (logo) doc.addImage(logo, "PNG", margin, 24, 42, 42, undefined, "FAST")
  const textX = logo ? margin + 50 : margin
  doc.setTextColor(65, 38, 120); doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text("HORARILY", textX, 39)
  doc.setTextColor(0); doc.setFontSize(11); doc.text(`Apuntes de ${input.subjectName}`, textX, 57)
  if (input.title) { doc.setFontSize(16); doc.text(input.title, margin, 88) }
  doc.setFont("helvetica", "normal"); doc.setFontSize(9)
  const metadata = [input.unit, input.date].filter(Boolean).join(" · "); if (metadata) doc.text(metadata, margin, 104)
  doc.setDrawColor(190); doc.line(margin, 116, 553, 116)
  return 136
}

export function drawNotebookFooter(doc: jsPDF, input: Pick<NotebookPdfBranding, "subjectName" | "qrAsset">, page: number, total: number) {
  const margin = 42, pageWidth = 595.28, qrSize = 58, qrX = pageWidth - margin - qrSize, qrY = NOTEBOOK_PDF_FOOTER_TOP + 18
  doc.setDrawColor(210); doc.line(margin, NOTEBOOK_PDF_FOOTER_TOP, pageWidth - margin, NOTEBOOK_PDF_FOOTER_TOP)
  doc.setTextColor(90); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5)
  doc.text(`Estos apuntes de ${input.subjectName} fueron tomados con Horarily.`, margin, NOTEBOOK_PDF_FOOTER_TOP + 20)
  doc.text("Organiza tus clases, notas y apuntes en un solo lugar.", margin, NOTEBOOK_PDF_FOOTER_TOP + 32)
  doc.text(HORARILY_PUBLIC_URL.replace("https://", ""), margin, NOTEBOOK_PDF_FOOTER_TOP + 48)
  doc.text(`${page}/${total}`, margin, NOTEBOOK_PDF_FOOTER_TOP + 64)
  if (input.qrAsset) {
    doc.addImage(input.qrAsset, "PNG", qrX, qrY, qrSize, qrSize, undefined, "FAST")
    doc.setFontSize(7); doc.text("Instala Horarily", qrX + qrSize / 2, qrY + qrSize + 10, { align: "center" })
  }
  doc.setTextColor(0)
}
