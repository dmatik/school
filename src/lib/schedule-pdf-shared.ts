import type { ScheduleFinishTime, ScheduleLesson } from "../types"
import { getChildSolidHex } from "./child-colors"
import { HEEBO_500_TTF_BASE64, HEEBO_700_TTF_BASE64 } from "./heebo-font-data"
import { getSubjectColorSpec } from "./subject-palette"

export const SCHEDULE_PDF_FILENAME = "schedule.pdf"
export const SCHEDULE_PDF_DAYS = [0, 1, 2, 3, 4, 5] as const

export const SCHEDULE_PDF_LAYOUT = {
  // A4 landscape dimensions in PDF points (72 pt/inch)
  pageWidthPt: 841.89,
  pageHeightPt: 595.28,
  // High-DPI design space matching A4 landscape aspect ratio
  canvasWidth: 2400,
  canvasHeight: 1697,
  tableWidthRatio: 0.85,
  tableHeightRatio: 0.80,
  borderRadiusPx: 32,
  hourColWidthPx: 150,
  headerHeightPx: 150,
  dismissalHeightPx: 186,
  minRows: 6,
  outerBorderWidthPx: 3,
  innerBorderWidthPx: 2.5,
  mainFontPx: 52,
  subLabelFontPx: 40,
  subjectLineHeightPx: 58,
  subjectHorizontalPaddingPx: 32,
  dismissalLabelHorizontalPaddingPx: 24,
  clockRadiusPx: 27,
  clockStrokePx: 5,
  fontFamily: "'Heebo', 'Assistant', sans-serif",
  colors: {
    pageBg: "#ffffff",
    headerText: "#ffffff",
    headerFallbackBg: "#2463eb",
    headerDivider: "rgba(255, 255, 255, 0.4)",
    borderColor: "#94a3b8",
    hourText: "#475569",
    dismissalBg: "#f1f5f9",
    dismissalTimeText: "#0f172a",
    dismissalEmptyText: "#94a3b8",
    dismissalLabelText: "#64748b",
    clockColor: "#2463eb"
  }
} as const

export type SchedulePdfTranslator = (key: string) => string

export interface SchedulePdfInput {
  lessons: Pick<ScheduleLesson, "dayOfWeek" | "hourNum" | "subject">[]
  finishTimes: Pick<ScheduleFinishTime, "dayOfWeek" | "finishTime">[]
  childColor?: string | null
  isRtl: boolean
  t: SchedulePdfTranslator
}

export interface SchedulePdfDayHeader {
  day: number
  label: string
}

export interface SchedulePdfCell {
  day: number
  subject: string | null
  colorHex: string
}

export interface SchedulePdfRow {
  hourNum: number
  cells: SchedulePdfCell[]
}

export interface SchedulePdfDismissalCell {
  day: number
  timeText: string
  isEmpty: boolean
  label: string
}

export interface SchedulePdfModel {
  isRtl: boolean
  tableW: number
  tableH: number
  tableX: number
  tableY: number
  hourColW: number
  dayColW: number
  headerH: number
  dismissalH: number
  rowCount: number
  lessonRowH: number
  headerBgHex: string
  hourHeader: string
  dayHeaders: SchedulePdfDayHeader[]
  rows: SchedulePdfRow[]
  dismissalCells: SchedulePdfDismissalCell[]
}

export function buildSchedulePdfModel({
  lessons,
  finishTimes,
  childColor,
  isRtl,
  t
}: SchedulePdfInput): SchedulePdfModel {
  const {
    canvasWidth,
    canvasHeight,
    tableWidthRatio,
    tableHeightRatio,
    hourColWidthPx,
    headerHeightPx,
    dismissalHeightPx,
    minRows,
    colors
  } = SCHEDULE_PDF_LAYOUT

  const tableW = Math.round(canvasWidth * tableWidthRatio)
  const tableH = Math.round(canvasHeight * tableHeightRatio)
  const tableX = Math.round((canvasWidth - tableW) / 2)
  const tableY = Math.round((canvasHeight - tableH) / 2)
  const hourColW = hourColWidthPx
  const dayColW = (tableW - hourColW) / SCHEDULE_PDF_DAYS.length
  const headerH = headerHeightPx
  const dismissalH = dismissalHeightPx

  const maxPopulatedHour = lessons.reduce((max, item) => {
    if (item.subject && item.subject.trim() && item.hourNum > max) {
      return item.hourNum
    }
    return max
  }, 0)
  const rowCount = Math.min(12, Math.max(minRows, maxPopulatedHour))
  const lessonRowH = (tableH - headerH - dismissalH) / rowCount

  const lessonMap = new Map<string, Pick<ScheduleLesson, "dayOfWeek" | "hourNum" | "subject">>()
  for (const l of lessons) {
    if (l.subject && l.subject.trim()) {
      lessonMap.set(`${l.dayOfWeek}-${l.hourNum}`, l)
    }
  }

  const finishTimeMap = new Map<number, string>()
  for (const f of finishTimes) {
    if (f.finishTime && f.finishTime.trim()) {
      finishTimeMap.set(f.dayOfWeek, f.finishTime.trim())
    }
  }

  const headerBgHex = getChildSolidHex(childColor, colors.headerFallbackBg)
  const hourHeader = t("schedule.hour_col_header")
  const dayHeaders: SchedulePdfDayHeader[] = SCHEDULE_PDF_DAYS.map((day) => ({
    day,
    label: t(`schedule.days.day_${day}`)
  }))

  const rows: SchedulePdfRow[] = Array.from({ length: rowCount }, (_, idx) => {
    const hourNum = idx + 1
    const cells: SchedulePdfCell[] = SCHEDULE_PDF_DAYS.map((day) => {
      const lesson = lessonMap.get(`${day}-${hourNum}`)
      if (!lesson) {
        return {
          day,
          subject: null,
          colorHex: getSubjectColorSpec(null).textLight
        }
      }
      return {
        day,
        subject: lesson.subject,
        colorHex: getSubjectColorSpec(lesson.subject).textLight
      }
    })
    return { hourNum, cells }
  })

  const finishLabel = t("schedule.finish_time_row")
  const dismissalCells: SchedulePdfDismissalCell[] = SCHEDULE_PDF_DAYS.map((day) => {
    const finishTime = finishTimeMap.get(day)
    return {
      day,
      timeText: finishTime || "--:--",
      isEmpty: !finishTime,
      label: finishLabel
    }
  })

  return {
    isRtl,
    tableW,
    tableH,
    tableX,
    tableY,
    hourColW,
    dayColW,
    headerH,
    dismissalH,
    rowCount,
    lessonRowH,
    headerBgHex,
    hourHeader,
    dayHeaders,
    rows,
    dismissalCells
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

const PT_PER_PX = SCHEDULE_PDF_LAYOUT.pageWidthPt / SCHEDULE_PDF_LAYOUT.canvasWidth

function toPt(px: number): string {
  return `${(px * PT_PER_PX).toFixed(2)}pt`
}

/**
 * Generates an exact physical A4 landscape single-page HTML document matching
 * the Web Canvas schedule PDF layout across iOS and Android without DPI scaling drift.
 */
export function buildSchedulePdfHtml(model: SchedulePdfModel): string {
  const {
    pageWidthPt,
    pageHeightPt,
    borderRadiusPx,
    outerBorderWidthPx,
    innerBorderWidthPx,
    mainFontPx,
    subLabelFontPx,
    subjectLineHeightPx,
    subjectHorizontalPaddingPx,
    dismissalLabelHorizontalPaddingPx,
    clockStrokePx,
    colors
  } = SCHEDULE_PDF_LAYOUT

  const dir = model.isRtl ? "rtl" : "ltr"
  const tableWidthPt = toPt(model.tableW)
  const tableHeightPt = toPt(model.tableH)
  const hourColWidthPt = toPt(model.hourColW)
  const headerHeightPt = toPt(model.headerH)
  const dismissalHeightPt = toPt(model.dismissalH)
  const clockSizePt = toPt(64)
  const subjectPadEachSidePt = toPt(subjectHorizontalPaddingPx / 2)
  const labelPadEachSidePt = toPt(dismissalLabelHorizontalPaddingPx / 2)

  const headerCellsHtml = model.dayHeaders
    .map((h) => `<div class="header-cell day-col">${escapeHtml(h.label)}</div>`)
    .join("")

  const rowsHtml = model.rows
    .map((row, idx) => {
      const cellsHtml = row.cells
        .map((cell) => {
          if (!cell.subject) {
            return `<div class="body-cell day-col"></div>`
          }
          return `<div class="body-cell day-col"><span class="subject-text" style="color:${cell.colorHex};">${escapeHtml(cell.subject)}</span></div>`
        })
        .join("")
      return `<div class="lesson-row${idx > 0 ? " row-divider" : ""}"><div class="body-cell hour-col hour-num">${row.hourNum}</div>${cellsHtml}</div>`
    })
    .join("")

  const dismissalCellsHtml = model.dismissalCells
    .map(
      (cell) =>
        `<div class="dismissal-cell day-col"><span class="dismissal-time${cell.isEmpty ? " is-empty" : ""}">${escapeHtml(cell.timeText)}</span><span class="dismissal-label">${escapeHtml(cell.label)}</span></div>`
    )
    .join("")

  const clockSvg = `<svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true"><circle cx="32" cy="32" r="${SCHEDULE_PDF_LAYOUT.clockRadiusPx}" fill="none" stroke="${colors.clockColor}" stroke-width="${clockStrokePx}" stroke-linecap="round" stroke-linejoin="round"/><path d="M32 17.96 L32 32 L42.26 37.94" fill="none" stroke="${colors.clockColor}" stroke-width="${clockStrokePx}" stroke-linecap="round" stroke-linejoin="round"/></svg>`

  return `<!DOCTYPE html>
<html dir="${dir}">
  <head>
    <meta charset="utf-8" />
    <style>
      @font-face {
        font-family: 'Heebo';
        font-style: normal;
        font-weight: 500;
        src: url(data:font/ttf;base64,${HEEBO_500_TTF_BASE64}) format('truetype');
      }
      @font-face {
        font-family: 'Heebo';
        font-style: normal;
        font-weight: 700;
        src: url(data:font/ttf;base64,${HEEBO_700_TTF_BASE64}) format('truetype');
      }
      @page {
        size: ${pageWidthPt}pt ${pageHeightPt}pt;
        margin: 0;
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      html,
      body {
        width: 841.5pt;
        height: 594pt;
        max-width: 841.5pt;
        max-height: 594pt;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: ${colors.pageBg};
        font-family: 'Heebo', 'Assistant', -apple-system, BlinkMacSystemFont, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .schedule-table {
        width: ${tableWidthPt};
        height: ${tableHeightPt};
        background: ${colors.pageBg};
        border: ${toPt(outerBorderWidthPx)} solid ${colors.borderColor};
        border-radius: ${toPt(borderRadiusPx)};
        background-clip: padding-box;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .hour-col {
        width: ${hourColWidthPt};
        flex-shrink: 0;
      }
      .day-col {
        flex: 1;
        min-width: 0;
      }
      .header-row {
        height: ${headerHeightPt};
        background: ${model.headerBgHex};
        color: ${colors.headerText};
        display: flex;
        align-items: stretch;
        flex-shrink: 0;
      }
      .header-cell {
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        font-weight: 700;
        font-size: ${toPt(mainFontPx)};
        line-height: 1.1;
        padding: 0 ${toPt(12)};
        overflow: hidden;
      }
      .header-cell.day-col {
        border-inline-start: ${toPt(innerBorderWidthPx)} solid ${colors.headerDivider};
      }
      .rows-wrap {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      .lesson-row {
        flex: 1;
        min-height: 0;
        display: flex;
        align-items: stretch;
      }
      .row-divider {
        border-top: ${toPt(innerBorderWidthPx)} solid ${colors.borderColor};
      }
      .body-cell {
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        overflow: hidden;
      }
      .body-cell.day-col {
        border-inline-start: ${toPt(innerBorderWidthPx)} solid ${colors.borderColor};
        padding: 0 ${subjectPadEachSidePt};
      }
      .hour-num {
        color: ${colors.hourText};
        font-weight: 700;
        font-size: ${toPt(mainFontPx)};
        line-height: 1;
      }
      .subject-text {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        max-width: 100%;
        font-weight: 700;
        font-size: ${toPt(mainFontPx)};
        line-height: ${toPt(subjectLineHeightPx)};
        text-align: center;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      .dismissal-row {
        height: ${dismissalHeightPt};
        background: ${colors.dismissalBg};
        border-top: ${toPt(innerBorderWidthPx)} solid ${colors.borderColor};
        display: flex;
        align-items: stretch;
        flex-shrink: 0;
      }
      .dismissal-clock-cell {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .clock-wrap {
        width: ${clockSizePt};
        height: ${clockSizePt};
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .dismissal-cell {
        border-inline-start: ${toPt(innerBorderWidthPx)} solid ${colors.borderColor};
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        overflow: hidden;
        padding: 0 ${labelPadEachSidePt};
      }
      .dismissal-time {
        font-weight: 700;
        font-size: ${toPt(mainFontPx)};
        line-height: 1.1;
        color: ${colors.dismissalTimeText};
        font-variant-numeric: tabular-nums;
      }
      .dismissal-time.is-empty {
        color: ${colors.dismissalEmptyText};
      }
      .dismissal-label {
        font-weight: 500;
        font-size: ${toPt(subLabelFontPx)};
        line-height: 1.15;
        color: ${colors.dismissalLabelText};
        margin-top: ${toPt(10)};
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    </style>
  </head>
  <body>
    <div class="schedule-table">
      <div class="header-row">
        <div class="header-cell hour-col">${escapeHtml(model.hourHeader)}</div>
        ${headerCellsHtml}
      </div>
      <div class="rows-wrap">
        ${rowsHtml}
      </div>
      <div class="dismissal-row">
        <div class="dismissal-clock-cell hour-col">
          <div class="clock-wrap">${clockSvg}</div>
        </div>
        ${dismissalCellsHtml}
      </div>
    </div>
  </body>
</html>`
}
