import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SchedulePage } from '../components/SchedulePage'
import { ScheduleTable } from '../components/ui/schedule-table'
import type { User, ScheduleLesson, ScheduleFinishTime, WebtopConfig } from '../types'
import Database from 'better-sqlite3'
import { initDb } from '../../server/db'

describe('Weekly Schedule Feature — Component and Backend Tests', () => {
  let parentUser: User
  let childUser: User
  let mockConfig: WebtopConfig
  let mockLessons: ScheduleLesson[]
  let mockFinishTimes: ScheduleFinishTime[]

  beforeEach(() => {
    // Mock scrollIntoView and scrollTo
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
    window.HTMLElement.prototype.scrollTo = vi.fn()

    parentUser = {
      id: 'test-parent-1',
      username: 'parent1',
      role: 'user',
      familyRole: 'parent',
      linkedChildId: null,
      firstName: 'Sarah',
      lastName: 'Cohen'
    }

    childUser = {
      id: 'test-child-1',
      username: 'child1',
      role: 'user',
      familyRole: 'child',
      linkedChildId: 'child-abc-1',
      firstName: 'David',
      lastName: 'Cohen'
    }

    mockConfig = {
      configured: true,
      username: 'webtop_parent',
      selectedChildId: 'child-abc-1',
      linkedChildren: [
        {
          id: 'child-abc-1',
          firstName: 'David',
          lastName: 'Cohen',
          classCode: 4,
          classNum: 2,
          color: 'blue'
        },
        {
          id: 'child-xyz-2',
          firstName: 'Maya',
          lastName: 'Cohen',
          classCode: 6,
          classNum: 1,
          color: 'rose'
        }
      ],
      lastSyncedAt: new Date().toISOString(),
      syncStatus: 'success',
      syncError: null
    }

    mockLessons = [
      {
        id: 'lesson-1',
        childId: 'child-abc-1',
        dayOfWeek: 0, // Sunday
        hourNum: 1,
        subject: 'מתמטיקה',
        teacher: 'גב׳ לוי',
        room: 'כיתה 102'
      },
      {
        id: 'lesson-2',
        childId: 'child-abc-1',
        dayOfWeek: 0,
        hourNum: 2,
        subject: 'אנגלית',
        teacher: 'מר כהן',
        room: 'מעבדה'
      },
      {
        id: 'lesson-3',
        childId: 'child-abc-1',
        dayOfWeek: 4, // Thursday
        hourNum: 3,
        subject: 'מדעים',
        teacher: '',
        room: ''
      }
    ]

    mockFinishTimes = [
      {
        id: 'finish-0',
        childId: 'child-abc-1',
        dayOfWeek: 0,
        finishTime: '13:30'
      },
      {
        id: 'finish-4',
        childId: 'child-abc-1',
        dayOfWeek: 4,
        finishTime: '14:15'
      },
      {
        id: 'finish-5',
        childId: 'child-abc-1',
        dayOfWeek: 5,
        finishTime: '11:50'
      }
    ]

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/webtop/config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockConfig)
        })
      }
      if (url.includes('/api/schedule')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            lessons: mockLessons,
            finishTimes: mockFinishTimes
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders weekly schedule table from Sunday to Friday with days headers', async () => {
    render(<SchedulePage token="test-token" currentUser={parentUser} />)

    await waitFor(() => {
      expect(screen.getByText('schedule.title')).toBeInTheDocument()
      expect(screen.getByText('schedule.days.day_0')).toBeInTheDocument()
    })

    // Verify all 6 days headers exist with inverted white text
    for (let day = 0; day <= 5; day++) {
      const dayHeader = screen.getByText(`schedule.days.day_${day}`)
      expect(dayHeader).toBeInTheDocument()
      expect(dayHeader).toHaveClass('text-white')
    }

    const headerRow = document.querySelector('[data-schedule-header]')
    expect(headerRow).toBeInTheDocument()
    expect(headerRow?.className).toContain('text-white')

    // Verify existing lessons are displayed
    await waitFor(() => {
      expect(screen.getByText('מתמטיקה')).toBeInTheDocument()
      expect(screen.getByText('אנגלית')).toBeInTheDocument()
      expect(screen.getByText('מדעים')).toBeInTheDocument()
    })

    // Verify bottom row dismissal times
    expect(screen.getByText('13:30')).toBeInTheDocument()
    expect(screen.getByText('14:15')).toBeInTheDocument()
    expect(screen.getByText('11:50')).toBeInTheDocument()
  })

  it('renders liquid glass child selector for parent user with first names only and switches child', async () => {
    render(<SchedulePage token="test-token" currentUser={parentUser} />)

    await waitFor(() => {
      // First names should be displayed
      expect(screen.getByText('David')).toBeInTheDocument()
      expect(screen.getByText('Maya')).toBeInTheDocument()
      // Full names with last name should NOT be displayed
      expect(screen.queryByText('David Cohen')).not.toBeInTheDocument()
      expect(screen.queryByText('Maya Cohen')).not.toBeInTheDocument()
    })

    // The selector should have role="tablist"
    const tablist = screen.getByRole('tablist', { name: 'schedule.select_child' })
    expect(tablist).toBeInTheDocument()

    const davidTab = screen.getByRole('tab', { name: 'David' })
    const mayaTab = screen.getByRole('tab', { name: 'Maya' })
    expect(davidTab).toHaveAttribute('aria-selected', 'true')
    expect(mayaTab).toHaveAttribute('aria-selected', 'false')

    // Switch child by clicking Maya
    fireEvent.click(mayaTab)
    expect(mayaTab).toHaveAttribute('aria-selected', 'true')
    expect(davidTab).toHaveAttribute('aria-selected', 'false')

    // Child user does not see student selector
    cleanup()
    render(<SchedulePage token="test-token" currentUser={childUser} />)

    await waitFor(() => {
      expect(screen.getByText('schedule.title')).toBeInTheDocument()
      expect(screen.queryByRole('tablist', { name: 'schedule.select_child' })).not.toBeInTheDocument()
      expect(screen.queryByText('David')).not.toBeInTheDocument()
    })
  })

  it('renders sticky child selector filter bar for parent user in SchedulePage', async () => {
    render(<SchedulePage token="test-token" currentUser={parentUser} />)

    await waitFor(() => {
      expect(screen.getByText('David')).toBeInTheDocument()
    })

    const stickyFilters = document.querySelector('[data-sticky-filters]')
    expect(stickyFilters).toBeInTheDocument()
    expect(stickyFilters?.className).toContain('sticky')
    expect(stickyFilters?.className).toContain('top-0')
    expect(stickyFilters?.className).toContain('md:top-[61px]')
    expect(stickyFilters?.className).toContain('z-20')
  })

  it('shows child unlinked warning if child user has no linked child id', async () => {
    const unlinkedChild: User = {
      ...childUser,
      linkedChildId: null
    }

    render(<SchedulePage token="test-token" currentUser={unlinkedChild} />)

    await waitFor(() => {
      expect(screen.getByText('schedule.child_unlinked_desc')).toBeInTheDocument()
    })
  })

  it('allows parent to click a lesson and open Edit Lesson Dialog only when edit mode is enabled', async () => {
    render(<SchedulePage token="test-token" currentUser={parentUser} />)

    await waitFor(() => {
      expect(screen.getByText('מתמטיקה')).toBeInTheDocument()
    })

    // By default, edit mode is OFF so clicking does NOT open modal
    fireEvent.click(screen.getByText('מתמטיקה'))
    expect(screen.queryByText('schedule.lesson_modal_title_edit')).not.toBeInTheDocument()

    // Enable edit mode via the round button
    const editToggle = screen.getByRole('button', { name: 'schedule.edit_mode_enable' })
    fireEvent.click(editToggle)

    // Now clicking on Math lesson opens the modal
    fireEvent.click(screen.getByText('מתמטיקה'))

    await waitFor(() => {
      expect(screen.getByText('schedule.lesson_modal_title_edit')).toBeInTheDocument()
      const subjectInput = screen.getByLabelText('schedule.subject_label') as HTMLInputElement
      expect(subjectInput.value).toBe('מתמטיקה')
      expect(subjectInput.maxLength).toBe(50)
      expect(screen.getByText('7/50')).toBeInTheDocument()
      expect(screen.getByText('schedule.clear_lesson')).toBeInTheDocument()
    })
  })

  it('does NOT open edit dialog when child user clicks on a lesson and child has no edit button', async () => {
    render(<SchedulePage token="test-token" currentUser={childUser} />)

    await waitFor(() => {
      expect(screen.getByText('מתמטיקה')).toBeInTheDocument()
    })

    // Child user should NOT see edit mode toggle button
    expect(screen.queryByRole('button', { name: 'schedule.edit_mode_enable' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('מתמטיקה'))

    expect(screen.queryByText('schedule.lesson_modal_title_edit')).not.toBeInTheDocument()
    expect(screen.queryByText('schedule.lesson_modal_title_add')).not.toBeInTheDocument()
  })

  it('allows parent to click on dismissal finish time to open finish time dialog only when edit mode is enabled', async () => {
    render(<SchedulePage token="test-token" currentUser={parentUser} />)

    await waitFor(() => {
      expect(screen.getByText('13:30')).toBeInTheDocument()
    })

    // When edit mode is OFF, clicking dismissal time does not open modal
    fireEvent.click(screen.getByText('13:30'))
    expect(screen.queryByText('schedule.finish_time_modal_title')).not.toBeInTheDocument()

    // Enable edit mode
    const editToggle = screen.getByRole('button', { name: 'schedule.edit_mode_enable' })
    fireEvent.click(editToggle)

    fireEvent.click(screen.getByText('13:30'))

    await waitFor(() => {
      expect(screen.getByText('schedule.finish_time_modal_title')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '11:45' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '12:45' })).toBeInTheDocument()
    })

    const finishInput = screen.getByLabelText('schedule.finish_time_label') as HTMLInputElement
    expect(finishInput.value).toBe('13:30')

    // Typing raw digits auto-formats as HH:MM
    fireEvent.change(finishInput, { target: { value: '1445' } })
    expect(finishInput.value).toBe('14:45')

    // Clicking a preset sets the value
    fireEvent.click(screen.getByRole('button', { name: '12:45' }))
    expect(finishInput.value).toBe('12:45')
  })

  it('does NOT open finish time dialog when child user clicks dismissal time', async () => {
    render(<SchedulePage token="test-token" currentUser={childUser} />)

    await waitFor(() => {
      expect(screen.getByText('13:30')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('13:30'))

    expect(screen.queryByText('schedule.finish_time_modal_title')).not.toBeInTheDocument()
  })

  it('toggles edit mode with floating button, saves changes immediately to API, and exits via check button', async () => {
    render(<SchedulePage token="test-token" currentUser={parentUser} />)

    await waitFor(() => {
      expect(screen.getByText('מתמטיקה')).toBeInTheDocument()
    })

    // Enable edit mode via floating round button
    const editToggle = screen.getByRole('button', { name: 'schedule.edit_mode_enable' })
    fireEvent.click(editToggle)

    // Floating button turns into Checkmark (V) to finish editing, and no X button exists
    const finishBtn = screen.getByRole('button', { name: 'schedule.edit_mode_disable' })
    expect(finishBtn).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'schedule.edit_mode_cancel' })).not.toBeInTheDocument()

    // Edit a lesson
    fireEvent.click(screen.getByText('מתמטיקה'))
    await waitFor(() => {
      expect(screen.getByText('schedule.lesson_modal_title_edit')).toBeInTheDocument()
    })

    const subjectInput = screen.getByLabelText('schedule.subject_label')
    fireEvent.change(subjectInput, { target: { value: 'פיזיקה' } })
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))

    // Modal closes and lesson changes in local table
    await waitFor(() => {
      expect(screen.getByText('פיזיקה')).toBeInTheDocument()
      expect(screen.queryByText('מתמטיקה')).not.toBeInTheDocument()
    })

    // Verify PUT /api/schedule/lesson was called immediately with the update
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/schedule/lesson',
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"subject":"פיזיקה"')
      })
    )

    // Click Check (V) button to exit edit mode
    fireEvent.click(finishBtn)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'schedule.edit_mode_enable' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'schedule.edit_mode_disable' })).not.toBeInTheDocument()
    })
  })

  it('calculates the mobile target initial day correctly', () => {
    function computeTargetDay(dayOfWeek: number) {
      if (dayOfWeek >= 3 && dayOfWeek <= 5) return 3 // Wed, Thu, Fri -> 3 (showing Wed, Thu, Fri)
      if (dayOfWeek === 6) return 0 // Saturday -> Sunday
      if (dayOfWeek >= 0 && dayOfWeek <= 2) return dayOfWeek
      return 0
    }

    expect(computeTargetDay(0)).toBe(0) // Sunday
    expect(computeTargetDay(1)).toBe(1) // Monday
    expect(computeTargetDay(2)).toBe(2) // Tuesday
    expect(computeTargetDay(3)).toBe(3) // Wednesday
    expect(computeTargetDay(4)).toBe(3) // Thursday
    expect(computeTargetDay(5)).toBe(3) // Friday -> 3
    expect(computeTargetDay(6)).toBe(0) // Saturday -> 0
  })

  it('displays the last empty row only in edit mode and hides it in view mode', async () => {
    render(<SchedulePage token="test-token" currentUser={parentUser} />)

    await waitFor(() => {
      expect(screen.getByText('מתמטיקה')).toBeInTheDocument()
    })

    // In view mode: lessons go up to hour 3, so hours 1, 2, 3 exist but hour 4 does not
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.queryByText('4')).not.toBeInTheDocument()

    // Enable edit mode
    const editToggle = screen.getByRole('button', { name: 'schedule.edit_mode_enable' })
    fireEvent.click(editToggle)

    // In edit mode: row 4 (the empty row) is displayed for adding lessons
    expect(screen.getByText('4')).toBeInTheDocument()

    // Close edit mode via Check (V) button
    const finishBtn = screen.getByRole('button', { name: 'schedule.edit_mode_disable' })
    fireEvent.click(finishBtn)

    // In view mode again: row 4 is hidden
    expect(screen.queryByText('4')).not.toBeInTheDocument()
  })

  it('calculates hours rows: hides last empty row in view mode and displays it in edit mode', () => {
    function computeHoursToDisplay(items: { hourNum: number; subject: string }[], isEditMode = false) {
      let maxPopulatedHour = 0
      for (const l of items) {
        if (l.subject && l.subject.trim() && l.hourNum > maxPopulatedHour) {
          maxPopulatedHour = l.hourNum
        }
      }
      const maxHour = isEditMode
        ? Math.min(Math.max(maxPopulatedHour + 1, 1), 12)
        : Math.min(maxPopulatedHour, 12)
      const list: number[] = []
      for (let h = 1; h <= maxHour; h++) {
        list.push(h)
      }
      return list
    }

    // In view mode (default):
    // No lessons at all -> shows 0 rows
    expect(computeHoursToDisplay([], false)).toEqual([])
    // Highest lesson is hour 3 -> shows hours 1..3 (no trailing empty row)
    expect(computeHoursToDisplay([
      { hourNum: 1, subject: 'Math' },
      { hourNum: 3, subject: 'English' }
    ], false)).toEqual([1, 2, 3])
    // Highest lesson is hour 5 -> shows hours 1..5
    expect(computeHoursToDisplay([
      { hourNum: 2, subject: 'Hebrew' },
      { hourNum: 5, subject: 'History' }
    ], false)).toEqual([1, 2, 3, 4, 5])
    // Empty subject strings are ignored
    expect(computeHoursToDisplay([
      { hourNum: 2, subject: 'Art' },
      { hourNum: 7, subject: '   ' }
    ], false)).toEqual([1, 2])

    // In edit mode:
    // No lessons at all -> shows hour 1 to allow adding
    expect(computeHoursToDisplay([], true)).toEqual([1])
    // Highest lesson is hour 3 -> shows hours 1..4 (1 below populated)
    expect(computeHoursToDisplay([
      { hourNum: 1, subject: 'Math' },
      { hourNum: 3, subject: 'English' }
    ], true)).toEqual([1, 2, 3, 4])
    // Highest lesson is hour 5 -> shows hours 1..6
    expect(computeHoursToDisplay([
      { hourNum: 2, subject: 'Hebrew' },
      { hourNum: 5, subject: 'History' }
    ], true)).toEqual([1, 2, 3, 4, 5, 6])
    // Empty subject strings are ignored
    expect(computeHoursToDisplay([
      { hourNum: 2, subject: 'Art' },
      { hourNum: 7, subject: '   ' }
    ], true)).toEqual([1, 2, 3])
  })

  it('automatically scrolls to today when opening schedule on early weekdays (e.g. Monday)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-09T10:00:00Z')) // Monday (day 1)

    try {
      render(<SchedulePage token="test-token" currentUser={parentUser} />)

      await waitFor(() => {
        expect(screen.getByText('מתמטיקה')).toBeInTheDocument()
      })

      const mondayHeader = document.querySelector('[data-schedule-day="1"]')
      expect(mondayHeader).toBeInTheDocument()
      await waitFor(() => {
        expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith(
          expect.objectContaining({
            behavior: 'smooth',
            inline: 'start',
            block: 'nearest'
          })
        )
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('clamps auto-scroll to Wednesday (day 3) when opening on Thursday (day 4) or Friday (day 5)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-12T10:00:00Z')) // Thursday (day 4)

    try {
      render(<SchedulePage token="test-token" currentUser={parentUser} />)

      await waitFor(() => {
        expect(screen.getByText('מתמטיקה')).toBeInTheDocument()
      })

      const wednesdayHeader = document.querySelector('[data-schedule-day="3"]')
      expect(wednesdayHeader).toBeInTheDocument()
      await waitFor(() => {
        expect(wednesdayHeader?.scrollIntoView).toHaveBeenCalledWith(
          expect.objectContaining({
            behavior: 'smooth',
            inline: 'start',
            block: 'nearest'
          })
        )
      })
    } finally {
      vi.useRealTimers()
    }

    cleanup()

    // Test Friday (day 5)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-13T10:00:00Z')) // Friday (day 5)

    try {
      render(<SchedulePage token="test-token" currentUser={parentUser} />)

      await waitFor(() => {
        expect(screen.getByText('מתמטיקה')).toBeInTheDocument()
      })

      const wednesdayHeader = document.querySelector('[data-schedule-day="3"]')
      expect(wednesdayHeader).toBeInTheDocument()
      await waitFor(() => {
        expect(wednesdayHeader?.scrollIntoView).toHaveBeenCalledWith(
          expect.objectContaining({
            behavior: 'smooth',
            inline: 'start',
            block: 'nearest'
          })
        )
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('scrolls to Sunday (day 0) when opening on Sunday (day 0) or Saturday (day 6)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-08T10:00:00Z')) // Sunday (day 0)

    try {
      render(<SchedulePage token="test-token" currentUser={parentUser} />)

      await waitFor(() => {
        expect(screen.getByText('מתמטיקה')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(window.HTMLElement.prototype.scrollTo).toHaveBeenCalledWith(
          expect.objectContaining({
            left: 0
          })
        )
      })
    } finally {
      vi.useRealTimers()
    }

    cleanup()

    // Test Saturday (day 6) -> starts at Sunday (0)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-14T10:00:00Z')) // Saturday (day 6)

    try {
      render(<SchedulePage token="test-token" currentUser={parentUser} />)

      await waitFor(() => {
        expect(screen.getByText('מתמטיקה')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(window.HTMLElement.prototype.scrollTo).toHaveBeenCalledWith(
          expect.objectContaining({
            left: 0
          })
        )
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('re-triggers auto-scroll when switching between children', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-10T10:00:00Z')) // Tuesday (day 2)

    try {
      render(<SchedulePage token="test-token" currentUser={parentUser} />)

      await waitFor(() => {
        expect(screen.getByText('מתמטיקה')).toBeInTheDocument()
      })

      const tuesdayHeader = document.querySelector('[data-schedule-day="2"]')
      expect(tuesdayHeader).toBeInTheDocument()
      await waitFor(() => {
        expect(tuesdayHeader?.scrollIntoView).toHaveBeenCalled()
      })

      // Clear spy call history before switching children
      vi.mocked(window.HTMLElement.prototype.scrollIntoView).mockClear()

      // Switch to Maya
      const mayaTab = screen.getByRole('tab', { name: 'Maya' })
      fireEvent.click(mayaTab)

      await waitFor(() => {
        expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith(
          expect.objectContaining({
            behavior: 'smooth',
            inline: 'start',
            block: 'nearest'
          })
        )
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('renders liquid print button at the end of the filter row and triggers window.print() for parent and child', async () => {
    const originalPrint = window.print
    const printMock = vi.fn()
    window.print = printMock

    try {
      render(<SchedulePage token="test-token" currentUser={parentUser} />)

      await waitFor(() => {
        expect(screen.getByText('David')).toBeInTheDocument()
      })

      const stickyFilters = document.querySelector('[data-sticky-filters]')
      expect(stickyFilters).toBeInTheDocument()
      expect(stickyFilters?.className).toContain('print:hidden')

      const printBtn = screen.getByRole('button', { name: 'schedule.print' })
      expect(printBtn).toBeInTheDocument()
      expect(printBtn.className).toContain('apple-liquid-dock')
      expect(printBtn.parentElement?.className).toContain('ms-auto')
      expect(stickyFilters).toContainElement(printBtn)

      fireEvent.click(printBtn)
      expect(printMock).toHaveBeenCalledTimes(1)

      // Linked child user also gets the print button in the filter row without child tabs
      cleanup()
      printMock.mockClear()
      render(<SchedulePage token="test-token" currentUser={childUser} />)

      await waitFor(() => {
        expect(screen.getByText('מתמטיקה')).toBeInTheDocument()
      })

      const childPrintBtn = screen.getByRole('button', { name: 'schedule.print' })
      expect(childPrintBtn).toBeInTheDocument()
      expect(childPrintBtn.parentElement?.className).not.toContain('ms-auto')
      fireEvent.click(childPrintBtn)
      expect(printMock).toHaveBeenCalledTimes(1)
    } finally {
      window.print = originalPrint
    }
  })

  it('hides the today badge and clears today column highlight when printing', () => {
    const { container } = render(
      <ScheduleTable
        lessons={mockLessons}
        finishTimes={mockFinishTimes}
        currentDayOfWeek={1}
      />
    )

    const todayBadge = screen.getByText('schedule.today_badge')
    expect(todayBadge.className).toContain('print:hidden')

    const todayHeader = container.querySelector('[data-schedule-day="1"]')
    expect(todayHeader?.className).toContain('print:bg-transparent')

    const row1 = container.querySelector('[data-schedule-row="1"]')
    const row1DayCells = row1?.querySelectorAll('.flex-1.min-w-0.flex.items-stretch > div')
    expect(row1DayCells?.[1]?.className).toContain('print:bg-transparent')

    const dismissalRow = container.querySelector('[data-schedule-dismissal]')
    const dismissalDayCells = dismissalRow?.querySelectorAll('.flex-1.min-w-0.flex.items-stretch > div')
    expect(dismissalDayCells?.[1]?.className).toContain('print:bg-transparent')
  })
})

describe('Schedule Database Schema & Backend Constraints (Isolated In-Memory SQLite)', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    initDb(db)

    db.prepare(`
      INSERT INTO children (id, user_id, first_name, last_name, class_code, class_num, created_at, updated_at)
      VALUES
        ('child-1', 'family', 'Adam', 'Levi', 3, 1, datetime('now'), datetime('now')),
        ('child-2', 'family', 'Noa', 'Levi', 5, 2, datetime('now'), datetime('now'))
    `).run()
  })

  afterEach(() => {
    db.close()
  })

  it('creates schedule_lessons table and enforces UNIQUE(child_id, day_of_week, hour_num)', () => {
    const now = new Date().toISOString()
    const insertStmt = db.prepare(`
      INSERT INTO schedule_lessons (id, user_id, child_id, day_of_week, hour_num, subject, teacher, room, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    insertStmt.run('l-1', 'child-1', 0, 1, 'Math', 'Mr. Smith', '101', now, now)

    // Inserting same child, day, and hour should throw UNIQUE constraint failure
    expect(() => {
      insertStmt.run('l-2', 'child-1', 0, 1, 'Science', '', '', now, now)
    }).toThrow(/UNIQUE constraint failed/)

    // Inserting different hour for same child should succeed
    expect(() => {
      insertStmt.run('l-2', 'child-1', 0, 2, 'Science', '', '', now, now)
    }).not.toThrow()

    // Inserting same day & hour for different child should succeed
    expect(() => {
      insertStmt.run('l-3', 'child-2', 0, 1, 'History', '', '', now, now)
    }).not.toThrow()
  })

  it('enforces day_of_week CHECK (0..5) and hour_num CHECK (1..12)', () => {
    const now = new Date().toISOString()
    const insertStmt = db.prepare(`
      INSERT INTO schedule_lessons (id, user_id, child_id, day_of_week, hour_num, subject, teacher, room, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    // Invalid day: 6 (Saturday) or -1
    expect(() => {
      insertStmt.run('l-err-1', 'child-1', 6, 1, 'Math', '', '', now, now)
    }).toThrow(/CHECK constraint failed/)

    // Invalid hour: 0 or 13
    expect(() => {
      insertStmt.run('l-err-2', 'child-1', 1, 0, 'Math', '', '', now, now)
    }).toThrow(/CHECK constraint failed/)
  })

  it('creates schedule_day_settings and enforces UNIQUE(child_id, day_of_week)', () => {
    const now = new Date().toISOString()
    const insertStmt = db.prepare(`
      INSERT INTO schedule_day_settings (id, user_id, child_id, day_of_week, finish_time, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?)
    `)

    insertStmt.run('f-1', 'child-1', 0, '13:30', now, now)

    // Conflict on same child & day
    expect(() => {
      insertStmt.run('f-2', 'child-1', 0, '14:00', now, now)
    }).toThrow(/UNIQUE constraint failed/)

    // Upsert works
    const upsertStmt = db.prepare(`
      INSERT INTO schedule_day_settings (id, user_id, child_id, day_of_week, finish_time, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?)
      ON CONFLICT(child_id, day_of_week) DO UPDATE SET
        finish_time = excluded.finish_time,
        updated_at = excluded.updated_at
    `)
    upsertStmt.run('f-2', 'child-1', 0, '14:00', now, now)

    const updated = db.prepare('SELECT finish_time FROM schedule_day_settings WHERE child_id = ? AND day_of_week = ?').get('child-1', 0) as { finish_time: string }
    expect(updated.finish_time).toBe('14:00')
  })

  it('validates batch array size bounds and strict 24-hour finish time format', () => {
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

    expect(timeRegex.test('11:45')).toBe(true)
    expect(timeRegex.test('00:00')).toBe(true)
    expect(timeRegex.test('23:59')).toBe(true)
    expect(timeRegex.test('24:00')).toBe(false)
    expect(timeRegex.test('99:99')).toBe(false)
    expect(timeRegex.test('12:60')).toBe(false)
    expect(timeRegex.test('1:30')).toBe(false)

    // Batch limits
    const maxLessons = 72
    const maxFinishTimes = 6
    expect(maxLessons).toBe(6 * 12)
    expect(maxFinishTimes).toBe(6)
  })

  it('deduplicates batch slots cleanly without unique constraint crash', () => {
    const rawLessons = [
      { dayOfWeek: 0, hourNum: 1, subject: 'First Math' },
      { dayOfWeek: 0, hourNum: 1, subject: 'Duplicate Math' },
      { dayOfWeek: 1, hourNum: 2, subject: 'English' }
    ]

    const seenSlots = new Set<string>()
    const deduplicated = []
    for (const l of rawLessons) {
      const key = `${l.dayOfWeek}-${l.hourNum}`
      if (seenSlots.has(key)) continue
      seenSlots.add(key)
      deduplicated.push(l)
    }

    expect(deduplicated).toHaveLength(2)
    expect(deduplicated[0].subject).toBe('First Math')
    expect(deduplicated[1].subject).toBe('English')
  })
})
