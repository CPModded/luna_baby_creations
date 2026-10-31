import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

type InvoiceItem = { name: string; quantity: number; unitPrice: number }
type InvoiceOrder = {
  invoiceNumber: string
  createdAt: Date | string
  customerName?: string | null
  email: string
  shippingAddress?: Record<string, unknown> | string | null
  items?: InvoiceItem[]
  subtotal: number
  shipping: number
  tax: number
  total: number
}

const euro = (cents: number) => `${(Number(cents || 0) / 100).toFixed(2).replace('.', ',')} EUR`
function safeText(value: unknown) {
  return String(value ?? '')
    .replace(/[€]/g, ' EUR')
    .replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
    .replace(/♡/g, '').replace(/[^\x20-\xFF]/g, ' ')
}
function wrap(text: string, font: any, size: number, maxWidth: number) {
  const words = safeText(text).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) { lines.push(line); line = word }
    else line = candidate
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

export async function makeInvoice(order: InvoiceOrder): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const ink = rgb(0.28, 0.23, 0.21)
  const muted = rgb(0.46, 0.41, 0.38)
  const accent = rgb(0.72, 0.48, 0.39)
  const rule = rgb(0.88, 0.83, 0.80)
  const siteName = process.env.SITE_NAME || 'Luna Baby Créations'
  const siteAddress = process.env.SITE_ADDRESS || 'Adresse à renseigner'
  const siteEmail = process.env.SITE_EMAIL || 'contact@lunababy.fr'
  let logo: any = null
  try { logo = await pdf.embedPng(await readFile(path.join(process.cwd(), 'public', 'logo.png'))) } catch { /* Logo optionnel selon le déploiement. */ }

  const pageSize: [number, number] = [595.28, 841.89]
  let page: any
  let y = 0
  const draw = (text: unknown, x: number, atY: number, size = 10, useBold = false, color = ink) => {
    page.drawText(safeText(text), { x, y: atY, size, font: useBold ? bold : font, color })
  }
  const newPage = () => {
    page = pdf.addPage(pageSize)
    if (logo) {
      const dims = logo.scale(1)
      const scale = Math.min(0.22, 58 / dims.width, 58 / dims.height)
      page.drawImage(logo, { x: 48, y: 765, width: dims.width * scale, height: dims.height * scale })
    } else {
      page.drawCircle({ x: 69, y: 790, size: 22, color: accent })
      draw('LB', 57, 785, 11, true, rgb(1, 1, 1))
    }
    draw(siteName, 104, 795, 17, true)
    draw(siteAddress, 104, 778, 9, false, muted)
    draw(siteEmail, 104, 764, 9, false, muted)
    draw('FACTURE', 430, 795, 15, true, accent)
    draw(`N° ${order.invoiceNumber}`, 430, 776, 9)
    draw(`Date : ${new Date(order.createdAt).toLocaleDateString('fr-FR')}`, 430, 761, 9)
    page.drawLine({ start: { x: 48, y: 744 }, end: { x: 547, y: 744 }, thickness: 1, color: rule })
    y = 720
  }
  newPage()

  let address: any = order.shippingAddress
  if (typeof address === 'string') { try { address = JSON.parse(address) } catch { address = null } }
  draw('FACTURÉ À', 48, y, 10, true, accent); y -= 17
  draw(order.customerName || 'Client', 48, y, 10, true); y -= 15
  draw(order.email, 48, y, 9, false, muted); y -= 14
  if (address && typeof address === 'object') {
    const addressLine = [address.address, address.postal, address.city, address.country].filter(Boolean).join(', ')
    for (const line of wrap(addressLine, font, 9, 310)) { draw(line, 48, y, 9, false, muted); y -= 13 }
  }
  y -= 22

  const drawTableHead = () => {
    page.drawRectangle({ x: 48, y: y - 7, width: 499, height: 24, color: rgb(0.97, 0.94, 0.92) })
    draw('Désignation', 56, y, 9, true)
    draw('Qté', 390, y, 9, true)
    draw('Prix unitaire', 435, y, 9, true)
    draw('Total', 510, y, 9, true)
    y -= 28
  }
  drawTableHead()
  for (const item of order.items || []) {
    const lines = wrap(item.name, font, 9, 315)
    const required = Math.max(22, lines.length * 12)
    if (y - required < 95) { page = pdf.addPage(pageSize); y = 790; draw('FACTURE (suite)', 48, y, 12, true, accent); y -= 30; drawTableHead() }
    lines.forEach((line, index) => draw(line, 56, y - index * 12, 9))
    draw(String(item.quantity), 390, y, 9)
    draw(euro(item.unitPrice), 435, y, 9)
    draw(euro(item.unitPrice * item.quantity), 510, y, 9)
    y -= required
    page.drawLine({ start: { x: 48, y: y + 7 }, end: { x: 547, y: y + 7 }, thickness: 0.5, color: rule })
  }

  if (y < 150) { page = pdf.addPage(pageSize); y = 790 }
  y -= 8
  const totalLine = (label: string, value: number, strong = false) => {
    draw(label, 365, y, strong ? 11 : 9, strong, strong ? accent : ink)
    draw(euro(value), 475, y, strong ? 11 : 9, strong, strong ? accent : ink)
    y -= strong ? 24 : 18
  }
  totalLine('Sous-total', order.subtotal)
  totalLine('Livraison', order.shipping)
  totalLine('TVA', order.tax)
  page.drawLine({ start: { x: 360, y: y + 7 }, end: { x: 547, y: y + 7 }, thickness: 1, color: accent })
  totalLine('TOTAL À PAYER', order.total, true)

  for (const invoicePage of pdf.getPages()) {
    invoicePage.drawLine({ start: { x: 48, y: 48 }, end: { x: 547, y: 48 }, thickness: 0.6, color: rule })
    invoicePage.drawText(safeText(`${siteName} · ${siteEmail}`), { x: 48, y: 32, size: 8, font, color: muted })
  }
  return pdf.save()
}
