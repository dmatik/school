import {
  SCHEDULE_PDF_DAYS,
  SCHEDULE_PDF_FILENAME,
  SCHEDULE_PDF_LAYOUT,
  buildSchedulePdfModel,
  type SchedulePdfInput
} from "./schedule-pdf-shared"

export type SchedulePdfOptions = SchedulePdfInput

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function drawClockIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = SCHEDULE_PDF_LAYOUT.clockStrokePx
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(cx, cy - r * 0.52)
  ctx.lineTo(cx, cy)
  ctx.lineTo(cx + r * 0.38, cy + r * 0.22)
  ctx.stroke()
  ctx.restore()
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []

  const lines: string[] = []
  let current = words[0]

  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate
    } else {
      lines.push(current)
      current = words[i]
      if (lines.length === maxLines - 1) {
        const rest = [current, ...words.slice(i + 1)].join(" ")
        lines.push(truncateWithEllipsis(ctx, rest, maxWidth))
        return lines
      }
    }
  }

  lines.push(truncateWithEllipsis(ctx, current, maxWidth))
  return lines.slice(0, maxLines)
}

function truncateWithEllipsis(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let trimmed = text
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1)
  }
  return `${trimmed}…`
}

function encodeAscii(str: string): Uint8Array {
  const out = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) {
    out[i] = str.charCodeAt(i) & 0xff
  }
  return out
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Packages a JPEG image byte array into a valid single-page A4 landscape PDF 1.4 binary.
 */
export function buildPdfFromJpeg(
  jpegBytes: Uint8Array,
  imageWidth: number,
  imageHeight: number
): Uint8Array {
  const { pageWidthPt, pageHeightPt } = SCHEDULE_PDF_LAYOUT
  const chunks: Uint8Array[] = []
  const offsets: number[] = []
  let byteLength = 0

  const pushBytes = (bytes: Uint8Array) => {
    chunks.push(bytes)
    byteLength += bytes.length
  }

  const pushText = (text: string) => {
    pushBytes(encodeAscii(text))
  }

  pushText("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")

  // 1: Catalog
  offsets.push(byteLength)
  pushText("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")

  // 2: Pages
  offsets.push(byteLength)
  pushText("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")

  // 3: Page (A4 Landscape)
  offsets.push(byteLength)
  pushText(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  )

  // 4: Image XObject
  offsets.push(byteLength)
  pushText(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  )
  pushBytes(jpegBytes)
  pushText("\nendstream\nendobj\n")

  // 5: Page Content Stream
  const contentStream = `q\n${pageWidthPt} 0 0 ${pageHeightPt} 0 0 cm\n/Im0 Do\nQ\n`
  offsets.push(byteLength)
  pushText(`5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`)

  // Cross-reference table
  const xrefStart = byteLength
  pushText(`xref\n0 ${offsets.length + 1}\n`)
  pushText("0000000000 65535 f \n")
  for (const offset of offsets) {
    pushText(`${String(offset).padStart(10, "0")} 00000 n \n`)
  }
  pushText(`trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`)

  const result = new Uint8Array(byteLength)
  let cursor = 0
  for (const chunk of chunks) {
    result.set(chunk, cursor)
    cursor += chunk.length
  }
  return result
}

function buildMinimalFallbackPdf(): Uint8Array {
  const { pageWidthPt, pageHeightPt } = SCHEDULE_PDF_LAYOUT
  const chunks: Uint8Array[] = []
  const offsets: number[] = []
  let byteLength = 0

  const pushText = (text: string) => {
    const bytes = encodeAscii(text)
    chunks.push(bytes)
    byteLength += bytes.length
  }

  pushText("%PDF-1.4\n")
  offsets.push(byteLength)
  pushText("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
  offsets.push(byteLength)
  pushText("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")
  offsets.push(byteLength)
  pushText(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] >>\nendobj\n`
  )
  const xrefStart = byteLength
  pushText(`xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`)
  for (const offset of offsets) {
    pushText(`${String(offset).padStart(10, "0")} 00000 n \n`)
  }
  pushText(`trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`)

  const result = new Uint8Array(byteLength)
  let cursor = 0
  for (const chunk of chunks) {
    result.set(chunk, cursor)
    cursor += chunk.length
  }
  return result
}

/**
 * Renders the 6-day weekly schedule into a centered landscape A4 PDF File
 * driven by the shared PDF model used across Web and Mobile.
 */
export function generateSchedulePdfFile(options: SchedulePdfOptions): File {
  const fileName = SCHEDULE_PDF_FILENAME
  const {
    canvasWidth,
    canvasHeight,
    borderRadiusPx,
    outerBorderWidthPx,
    innerBorderWidthPx,
    mainFontPx,
    subLabelFontPx,
    subjectLineHeightPx,
    subjectHorizontalPaddingPx,
    dismissalLabelHorizontalPaddingPx,
    clockRadiusPx,
    fontFamily,
    colors
  } = SCHEDULE_PDF_LAYOUT

  const canvas = document.createElement("canvas")
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    const fallbackBytes = buildMinimalFallbackPdf()
    return new File([fallbackBytes as BlobPart], fileName, { type: "application/pdf" })
  }

  const model = buildSchedulePdfModel(options)
  const {
    isRtl,
    tableW,
    tableH,
    tableX,
    tableY,
    hourColW,
    dayColW,
    headerH,
    dismissalH,
    lessonRowH
  } = model

  // White landscape page background
  ctx.fillStyle = colors.pageBg
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Clip everything inside the rounded table container
  ctx.save()
  drawRoundedRectPath(ctx, tableX, tableY, tableW, tableH, borderRadiusPx)
  ctx.clip()

  // White card interior
  ctx.fillStyle = colors.pageBg
  ctx.fillRect(tableX, tableY, tableW, tableH)

  // Compute column X positions matching RTL / LTR order
  const hourX = isRtl ? tableX + tableW - hourColW : tableX
  const dayX = (dayIndex: number) =>
    isRtl
      ? tableX + (SCHEDULE_PDF_DAYS.length - 1 - dayIndex) * dayColW
      : tableX + hourColW + dayIndex * dayColW

  // 1. Header Row
  ctx.fillStyle = model.headerBgHex
  ctx.fillRect(tableX, tableY, tableW, headerH)

  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.direction = isRtl ? "rtl" : "ltr"
  ctx.fillStyle = colors.headerText
  ctx.font = `700 ${mainFontPx}px ${fontFamily}`

  const headerCenterY = tableY + headerH / 2
  ctx.fillText(model.hourHeader, hourX + hourColW / 2, headerCenterY)
  for (const header of model.dayHeaders) {
    const x = dayX(header.day)
    ctx.fillText(header.label, x + dayColW / 2, headerCenterY)
  }

  // Header vertical dividers
  ctx.strokeStyle = colors.headerDivider
  ctx.lineWidth = innerBorderWidthPx
  for (let i = 1; i <= SCHEDULE_PDF_DAYS.length; i++) {
    const lineX = isRtl ? tableX + i * dayColW : tableX + hourColW + (i - 1) * dayColW
    ctx.beginPath()
    ctx.moveTo(lineX, tableY)
    ctx.lineTo(lineX, tableY + headerH)
    ctx.stroke()
  }

  // 2. Lesson Rows
  model.rows.forEach((row, idx) => {
    const rowY = tableY + headerH + idx * lessonRowH
    const rowCenterY = rowY + lessonRowH / 2

    // Hour number cell
    ctx.fillStyle = colors.hourText
    ctx.font = `700 ${mainFontPx}px ${fontFamily}`
    ctx.fillText(String(row.hourNum), hourX + hourColW / 2, rowCenterY)

    // Day cells
    for (const cell of row.cells) {
      if (!cell.subject) continue

      const x = dayX(cell.day)
      ctx.fillStyle = cell.colorHex
      ctx.font = `700 ${mainFontPx}px ${fontFamily}`

      const lines = wrapTextLines(ctx, cell.subject, dayColW - subjectHorizontalPaddingPx, 2)
      const totalTextH = lines.length * subjectLineHeightPx
      const startY = rowCenterY - totalTextH / 2 + subjectLineHeightPx / 2

      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        ctx.fillText(lines[lineIdx], x + dayColW / 2, startY + lineIdx * subjectLineHeightPx)
      }
    }

    // Horizontal row separator
    if (idx > 0) {
      ctx.strokeStyle = colors.borderColor
      ctx.lineWidth = innerBorderWidthPx
      ctx.beginPath()
      ctx.moveTo(tableX, rowY)
      ctx.lineTo(tableX + tableW, rowY)
      ctx.stroke()
    }
  })

  // 3. Dismissal Finish Time Row
  const dismissalY = tableY + tableH - dismissalH
  ctx.fillStyle = colors.dismissalBg
  ctx.fillRect(tableX, dismissalY, tableW, dismissalH)

  // Top border of dismissal row
  ctx.strokeStyle = colors.borderColor
  ctx.lineWidth = innerBorderWidthPx
  ctx.beginPath()
  ctx.moveTo(tableX, dismissalY)
  ctx.lineTo(tableX + tableW, dismissalY)
  ctx.stroke()

  // Clock icon in # column
  drawClockIcon(
    ctx,
    hourX + hourColW / 2,
    dismissalY + dismissalH / 2,
    clockRadiusPx,
    colors.clockColor
  )

  for (const cell of model.dismissalCells) {
    const x = dayX(cell.day)
    const centerX = x + dayColW / 2

    ctx.fillStyle = cell.isEmpty ? colors.dismissalEmptyText : colors.dismissalTimeText
    ctx.font = `700 ${mainFontPx}px ${fontFamily}`
    ctx.fillText(cell.timeText, centerX, dismissalY + dismissalH * 0.36)

    ctx.fillStyle = colors.dismissalLabelText
    ctx.font = `500 ${subLabelFontPx}px ${fontFamily}`
    ctx.fillText(
      truncateWithEllipsis(ctx, cell.label, dayColW - dismissalLabelHorizontalPaddingPx),
      centerX,
      dismissalY + dismissalH * 0.72
    )
  }

  // Vertical column dividers across all lesson + dismissal rows
  ctx.strokeStyle = colors.borderColor
  ctx.lineWidth = innerBorderWidthPx
  for (let i = 1; i <= SCHEDULE_PDF_DAYS.length; i++) {
    const lineX = isRtl ? tableX + i * dayColW : tableX + hourColW + (i - 1) * dayColW
    ctx.beginPath()
    ctx.moveTo(lineX, tableY + headerH)
    ctx.lineTo(lineX, tableY + tableH)
    ctx.stroke()
  }

  ctx.restore()

  // Crisp outer rounded border
  ctx.strokeStyle = colors.borderColor
  ctx.lineWidth = outerBorderWidthPx
  drawRoundedRectPath(ctx, tableX, tableY, tableW, tableH, borderRadiusPx)
  ctx.stroke()

  const dataUrl = canvas.toDataURL("image/jpeg", 0.94)
  const base64Part = dataUrl.split(",")[1]
  if (!base64Part) {
    const fallbackBytes = buildMinimalFallbackPdf()
    return new File([fallbackBytes as BlobPart], fileName, { type: "application/pdf" })
  }

  const jpegBytes = base64ToUint8Array(base64Part)
  const pdfBytes = buildPdfFromJpeg(jpegBytes, canvasWidth, canvasHeight)
  return new File([pdfBytes as BlobPart], fileName, { type: "application/pdf" })
}

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent || ""
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true
  // iPadOS 13+ reports MacIntel with multi-touch support
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true
  return false
}

/**
 * Generates the schedule landscape PDF. On mobile devices (iOS/Android), shares it
 * via the native Web Share API; on desktop, opens the PDF in a new browser tab
 * (falling back to a direct download if pop-ups are blocked).
 */
export async function shareSchedulePdf(options: SchedulePdfOptions): Promise<void> {
  const file = generateSchedulePdfFile(options)

  if (
    isMobileDevice() &&
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function"
  ) {
    const canShareFiles =
      typeof navigator.canShare === "function" ? navigator.canShare({ files: [file] }) : false

    if (canShareFiles) {
      try {
        await navigator.share({
          files: [file],
          title: options.t("schedule.title")
        })
        return
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return
        }
        // Fall through to opening in a new tab if native share failed unexpectedly
      }
    }
  }

  const url = URL.createObjectURL(file)
  const opened = typeof window !== "undefined" ? window.open(url, "_blank") : null
  if (opened) {
    setTimeout(() => URL.revokeObjectURL(url), 60000)
    return
  }

  const link = document.createElement("a")
  link.href = url
  link.download = file.name
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
