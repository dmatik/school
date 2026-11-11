import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { format } from 'date-fns'
import { IncidentsPage } from '../components/IncidentsPage'
import { HomeworkPage } from '../components/HomeworkPage'
import { DateBadge } from '../components/ui/date-badge'
import { DatePicker } from '../components/ui/date-picker'
import { Calendar } from '../components/ui/calendar'
import { Toast, ToastClose, ToastTitle, ToastDescription, ToastProvider, ToastViewport } from '../components/ui/toast'
import type { User } from '../types'

describe('Calendar Component', () => {
  it('renders today with distinct highlight class when unselected', () => {
    const { container } = render(<Calendar mode="single" />)
    const todayCell = container.querySelector('[data-today="true"]')
    expect(todayCell).toBeTruthy()
    expect(todayCell?.className).toContain('border-primary/60')
    expect(todayCell?.className).toContain('text-primary')
  })

  it('renders selected date cleanly without conflicting today text color', () => {
    const today = new Date(2026, 9, 30)
    const selected = new Date(2026, 9, 29)
    const { container } = render(<Calendar mode="single" selected={selected} today={today} />)
    const selectedCell = container.querySelector('[aria-selected="true"]')
    expect(selectedCell).toBeTruthy()
    expect(selectedCell?.className).toContain('bg-primary')
    expect(selectedCell?.className).toContain('text-primary-foreground')
  })
})

describe('DatePicker Component', () => {
  it('renders one-liner format with weekday and full date when date is selected', () => {
    const testDate = new Date(2026, 9, 28) // 28 Oct 2026
    render(<DatePicker date={testDate} setDate={() => {}} />)
    expect(screen.getByText(/Wednesday.*October 28|יום רביעי.*28 באוקטובר/i)).toBeInTheDocument()
  })

  it('renders placeholder when no date is selected', () => {
    render(<DatePicker setDate={() => {}} placeholder="Select a date" />)
    expect(screen.getByText("Select a date")).toBeInTheDocument()
  })

  it('opens popover and allows selecting today via Today button', () => {
    const handleSetDate = vi.fn()
    render(<DatePicker setDate={handleSetDate} placeholder="Select a date" />)

    // Open popover by clicking the trigger button
    fireEvent.click(screen.getByRole('button', { name: /Select a date/i }))

    // Today button in footer should now be visible
    const todayBtn = screen.getByRole('button', { name: /^(common\.today|Today|היום)$/i })
    expect(todayBtn).toBeInTheDocument()

    // Click Today button
    fireEvent.click(todayBtn)
    expect(handleSetDate).toHaveBeenCalled()
    const calledDate = handleSetDate.mock.calls[0][0]
    expect(calledDate).toBeInstanceOf(Date)
  })

  it('renders liquid-icon variant as neutral when unselected and highlighted when selected', () => {
    const { rerender } = render(<DatePicker variant="liquid-icon" setDate={() => {}} />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('data-date-selected', 'false')
    expect(btn.className).toContain('text-muted-foreground')
    expect(btn.className).not.toContain('!bg-primary')

    const testDate = new Date(2026, 9, 28)
    rerender(<DatePicker variant="liquid-icon" date={testDate} setDate={() => {}} />)
    expect(btn).toHaveAttribute('data-date-selected', 'true')
    expect(btn.className).toContain('!bg-primary')
    expect(btn.className).toContain('text-primary-foreground')
  })

  it('renders liquid variant with date text, responsive formatDisplay, and clear button', () => {
    const handleSetDate = vi.fn()
    const testDate = new Date(2026, 9, 28)

    // Unselected state
    const { rerender } = render(
      <DatePicker
        variant="liquid"
        setDate={handleSetDate}
        placeholder="All Dates"
      />
    )
    const triggerBtn = screen.getByRole('button', { name: /all dates/i })
    expect(triggerBtn).toHaveAttribute('data-date-selected', 'false')
    expect(triggerBtn.className).toContain('text-muted-foreground')
    expect(triggerBtn.className).not.toContain('!bg-primary')
    expect(screen.getByText('All Dates')).toBeInTheDocument()

    // Selected state with custom formatDisplay
    rerender(
      <DatePicker
        variant="liquid"
        date={testDate}
        setDate={handleSetDate}
        placeholder="All Dates"
        formatDisplay={() => ({ short: '28/10/2026', full: 'Wednesday, October 28' })}
        clearable={true}
      />
    )
    expect(triggerBtn).toHaveAttribute('data-date-selected', 'true')
    expect(triggerBtn.className).toContain('text-foreground')
    expect(triggerBtn.className).not.toContain('!bg-primary')
    expect(screen.getByText('28/10/2026')).toHaveClass('md:hidden')
    expect(screen.getByText('Wednesday, October 28')).toHaveClass('hidden md:inline')

    // Clear button should be present and clickable
    const clearBtn = screen.getByRole('button', { name: /cancel|ביטול/i })
    expect(clearBtn).toBeInTheDocument()
    fireEvent.click(clearBtn)
    expect(handleSetDate).toHaveBeenCalledWith(undefined)
  })
})

describe('DateBadge Component', () => {
  it('renders weekday and formatted date in 2 lines', () => {
    // 2026-10-28 was a Wednesday
    render(<DateBadge date="2026-10-28" />)
    // Should render a weekday and the date
    expect(screen.getByText(/Wednesday|יום רביעי/i)).toBeInTheDocument()
    expect(screen.getByText(/October 28|28 באוקטובר/i)).toBeInTheDocument()
  })

  it('renders nothing when date is null or invalid', () => {
    const { container } = render(<DateBadge date={null} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('Empty Page Views', () => {
  it('renders IncidentsPage with titles and placeholder card', () => {
    render(<IncidentsPage />)
    expect(screen.getByText('incidents.title')).toBeInTheDocument()
    expect(screen.getByText('incidents.empty_title')).toBeInTheDocument()
    expect(screen.getByText('incidents.empty_desc')).toBeInTheDocument()
    expect(screen.getByText('incidents.integration_badge')).toBeInTheDocument()
  })

  it('renders IncidentsPage with date sections, black incident type, unbracketed lesson number, and no date inside card', async () => {
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')
    const mockIncidents = [
      {
        id: 'inc-1',
        type: 'הפרעה',
        subject: 'מתמטיקה',
        teacher: 'מורה דוד',
        studentName: 'דניאל',
        date: todayStr,
        hourNum: 3,
        description: 'דיבור בשיעור'
      }
    ]

    const originalFetch = global.fetch
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/incidents')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ incidents: mockIncidents })
        })
      }
      if (url.includes('/api/webtop/config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ configured: true, linkedChildren: [] })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    }) as unknown as typeof fetch

    try {
      render(<IncidentsPage token="test-token" />)

      // Incident type rendered in black (text-foreground)
      const incType = await screen.findByText('הפרעה')
      expect(incType).toBeInTheDocument()
      expect(incType).toHaveClass('text-foreground')
      expect(incType).not.toHaveClass('text-amber-700')

      // Date section header rendered (e.g. Today) with lighter muted color
      const dateHeading = screen.getByRole('heading', { level: 2, name: 'common.today' })
      expect(dateHeading).toBeInTheDocument()
      expect(dateHeading).toHaveClass('text-muted-foreground')

      // Lesson hour indicator stacked under subject
      expect(screen.getByText(/incidents\.lesson_hour/)).toBeInTheDocument()
      expect(screen.queryByText(/• incidents\.lesson_hour/)).not.toBeInTheDocument()

      // Vertical child accent bar is removed from cards
      expect(screen.queryByTestId('incidents-card-accent')).not.toBeInTheDocument()

      // No calendar icon inside the card
      const card = incType.closest('.rounded-2xl')
      expect(card?.querySelector('svg[class*="lucide-calendar"]')).toBeNull()
    } finally {
      global.fetch = originalFetch
    }
  })

  it('renders student name badge on incident cards for parent user and hides it for child user', async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const mockIncidents = [
      {
        id: 'inc-badge-test',
        type: 'הפרעה',
        subject: 'מתמטיקה',
        teacher: 'מורה דוד',
        studentName: 'דניאל',
        date: todayStr,
        hourNum: 3
      }
    ]

    const originalFetch = global.fetch
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/incidents')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ incidents: mockIncidents })
        })
      }
      if (url.includes('/api/webtop/config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ configured: true, linkedChildren: [] })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    }) as unknown as typeof fetch

    const parentUser: User = {
      id: 'p1',
      username: 'parent',
      role: 'user',
      familyRole: 'parent',
      firstName: 'P',
      lastName: 'U'
    }

    const childUser: User = {
      id: 'c1',
      username: 'child',
      role: 'user',
      familyRole: 'child',
      linkedChildId: 'k1',
      firstName: 'C',
      lastName: 'U'
    }

    try {
      // 1. Render as Parent: student name badge is visible
      const { unmount } = render(<IncidentsPage token="test-token" currentUser={parentUser} />)
      expect(await screen.findByText('דניאל')).toBeInTheDocument()
      expect(screen.queryByTestId('incidents-card-accent')).not.toBeInTheDocument()
      unmount()

      // 2. Render as Child: student name badge is hidden
      render(<IncidentsPage token="test-token" currentUser={childUser} />)
      await screen.findByText('הפרעה')
      expect(screen.queryByText('דניאל')).not.toBeInTheDocument()
      expect(screen.queryByTestId('incidents-card-accent')).not.toBeInTheDocument()
    } finally {
      global.fetch = originalFetch
    }
  })

  it('deduplicates incidents in UI when legacy and family records have different IDs for the same Webtop event', async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const rawEvent = JSON.stringify({ eventID: 998877, eventType: 'אי הכנת ש``ב', subjectName: 'עברית' })
    const mockIncidents = [
      {
        id: 'webtop-inc-admin-default-998877',
        type: 'אי הכנת ש``ב',
        subject: 'עברית',
        teacher: 'בוקובזה סוזי',
        studentName: 'כפיר טרוסמן',
        date: todayStr,
        hourNum: 3,
        eventCode: 781543,
        rawData: rawEvent
      },
      {
        id: 'webtop-inc-family-998877',
        type: 'אי הכנת ש``ב',
        subject: 'עברית',
        teacher: 'בוקובזה סוזי',
        studentName: 'כפיר טרוסמן',
        date: todayStr,
        hourNum: 3,
        eventCode: 781543,
        rawData: rawEvent
      }
    ]

    const originalFetch = global.fetch
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/incidents')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ incidents: mockIncidents })
        })
      }
      if (url.includes('/api/webtop/config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ configured: true, linkedChildren: [] })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    }) as unknown as typeof fetch

    try {
      render(<IncidentsPage token="test-token" />)
      await waitFor(() => {
        expect(screen.getAllByText('עברית')).toHaveLength(1)
      })
      expect(screen.getAllByText('אי הכנת ש``ב')).toHaveLength(1)
    } finally {
      global.fetch = originalFetch
    }
  })

  it('renders HomeworkPage with titles and placeholder card', () => {
    render(<HomeworkPage />)
    expect(screen.getByText('homework.title')).toBeInTheDocument()
    expect(screen.getByText('homework.empty_title')).toBeInTheDocument()
    expect(screen.getByText('homework.empty_desc')).toBeInTheDocument()
    expect(screen.getByText('homework.integration_badge')).toBeInTheDocument()
  })

  it('renders Homework item with homework prefix in bold weight and text in normal weight', async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const mockHomework = [
      {
        id: 'hw-1',
        subject: 'חשבון',
        studentName: 'ילד ראשון',
        teacher: 'מורה ישראל',
        dueDate: todayStr,
        description: 'עמוד 20 תרגילים 1-5',
        lessonSubject: 'שברים',
        rawData: JSON.stringify({
          descClass: 'שברים',
          homeWork: 'עמוד 20 תרגילים 1-5'
        })
      }
    ]

    const originalFetch = global.fetch
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/homework')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ homework: mockHomework })
        })
      }
      if (url.includes('/api/webtop/config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ configured: true, linkedChildren: [] })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    }) as unknown as typeof fetch

    try {
      render(<HomeworkPage token="test-token" />)

      const prefix = await screen.findByText('homework.homework_prefix')
      expect(prefix).toBeInTheDocument()
      expect(prefix).not.toHaveClass('font-bold')

      const hwText = screen.getByText('עמוד 20 תרגילים 1-5')
      expect(hwText).toBeInTheDocument()
      expect(hwText).toHaveClass('font-normal')
      expect(hwText.parentElement).not.toHaveClass('bg-muted/40')
      expect(hwText.parentElement).toHaveClass('border-t')
    } finally {
      global.fetch = originalFetch
    }
  })

  it('consolidates duplicate lessons for same student, date, subject and identical homework text into one card', async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const mockHomework = [
      {
        id: 'hw-math-1',
        subject: 'חשבון',
        studentName: 'דניאל',
        teacher: 'מורה ישראל',
        dueDate: todayStr,
        hourNum: 2,
        completed: false,
        description: 'עמוד 45 שאלות 1-10',
        rawData: JSON.stringify({ homeWork: 'עמוד 45 שאלות 1-10' })
      },
      {
        id: 'hw-math-2',
        subject: 'חשבון',
        studentName: 'דניאל',
        teacher: 'מורה ישראל',
        dueDate: todayStr,
        hourNum: 4,
        completed: false,
        description: 'עמוד 45 שאלות 1-10',
        rawData: JSON.stringify({ homeWork: 'עמוד 45 שאלות 1-10' })
      }
    ]

    const originalFetch = global.fetch
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/homework')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ homework: mockHomework })
        })
      }
      if (url.includes('/api/webtop/config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ configured: true, linkedChildren: [] })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    }) as unknown as typeof fetch

    try {
      render(<HomeworkPage token="test-token" />)

      // Only 1 card for "חשבון" should be rendered
      await waitFor(() => {
        expect(screen.getAllByText('חשבון')).toHaveLength(1)
      })

      // The consolidated hours indicator (homework.lesson_hours) should be rendered
      expect(screen.getByText(/homework\.lesson_hours\b/)).toBeInTheDocument()
      // The single hour indicator should NOT be rendered
      expect(screen.queryByText(/homework\.lesson_hour\b/)).not.toBeInTheDocument()

      // The homework text should appear only once
      expect(screen.getAllByText('עמוד 45 שאלות 1-10')).toHaveLength(1)
    } finally {
      global.fetch = originalFetch
    }
  })

  it('renders separate cards when homework text differs between lessons', async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const mockHomework = [
      {
        id: 'hw-math-1',
        subject: 'חשבון',
        studentName: 'דניאל',
        teacher: 'מורה ישראל',
        dueDate: todayStr,
        hourNum: 2,
        completed: false,
        description: 'עמוד 45 שאלות 1-5',
        rawData: JSON.stringify({ homeWork: 'עמוד 45 שאלות 1-5' })
      },
      {
        id: 'hw-math-2',
        subject: 'חשבון',
        studentName: 'דניאל',
        teacher: 'מורה ישראל',
        dueDate: todayStr,
        hourNum: 4,
        completed: false,
        description: 'עמוד 45 שאלות 6-10',
        rawData: JSON.stringify({ homeWork: 'עמוד 45 שאלות 6-10' })
      }
    ]

    const originalFetch = global.fetch
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/homework')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ homework: mockHomework })
        })
      }
      if (url.includes('/api/webtop/config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ configured: true, linkedChildren: [] })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    }) as unknown as typeof fetch

    try {
      render(<HomeworkPage token="test-token" />)

      // 2 cards for "חשבון" should be rendered
      await waitFor(() => {
        expect(screen.getAllByText('חשבון')).toHaveLength(2)
      })

      // Both should have single hour indicators
      expect(screen.getAllByText(/homework\.lesson_hour\b/)).toHaveLength(2)
      expect(screen.queryByText(/homework\.lesson_hours\b/)).not.toBeInTheDocument()
    } finally {
      global.fetch = originalFetch
    }
  })

  it('renders date headers stating today and yesterday without badge icon or count badge, and shows all dates by default', async () => {
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    const todayStr = format(today, 'yyyy-MM-dd')
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd')

    const mockHomework = [
      {
        id: 'hw-today',
        subject: 'חשבון',
        studentName: 'דניאל',
        teacher: 'מורה ישראל',
        dueDate: todayStr,
        hourNum: 1,
        description: 'תרגיל היום',
        rawData: JSON.stringify({ homeWork: 'תרגיל היום' })
      },
      {
        id: 'hw-yesterday',
        subject: 'אנגלית',
        studentName: 'דניאל',
        teacher: 'מורה שרה',
        dueDate: yesterdayStr,
        hourNum: 2,
        description: 'תרגיל אתמול',
        rawData: JSON.stringify({ homeWork: 'תרגיל אתמול' })
      }
    ]

    const originalFetch = global.fetch
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/homework')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ homework: mockHomework })
        })
      }
      if (url.includes('/api/webtop/config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ configured: true, linkedChildren: [] })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    }) as unknown as typeof fetch

    try {
      render(<HomeworkPage token="test-token" />)

      // Both items rendered simultaneously (default is All Dates)
      await waitFor(() => {
        expect(screen.getByText('תרגיל היום')).toBeInTheDocument()
        expect(screen.getByText('תרגיל אתמול')).toBeInTheDocument()
      })

      // Section titles for today and yesterday rendered with lighter muted color
      const todayHeading = screen.getByRole('heading', { level: 2, name: 'common.today' })
      expect(todayHeading).toBeInTheDocument()
      expect(todayHeading).toHaveClass('text-muted-foreground')
      const yesterdayHeading = screen.getByRole('heading', { level: 2, name: 'common.yesterday' })
      expect(yesterdayHeading).toBeInTheDocument()
      expect(yesterdayHeading).toHaveClass('text-muted-foreground')

      // Ensure no count badge elements or calendar svg icons exist inside the day headers
      const headings = screen.getAllByRole('heading', { level: 2 })
      headings.forEach((heading: HTMLElement) => {
        const headerDiv = heading.parentElement
        // Header container should contain only the heading (no calendar icon container, no count badge)
        expect(headerDiv?.querySelectorAll('span')).toHaveLength(0)
        expect(headerDiv?.querySelectorAll('svg')).toHaveLength(0)
      })
    } finally {
      global.fetch = originalFetch
    }
  })

  it('renders student name badge on homework cards for parent user and hides it for child user', async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const mockHomework = [
      {
        id: 'hw-badge-test',
        subject: 'חשבון',
        studentName: 'דניאל',
        teacher: 'מורה ישראל',
        dueDate: todayStr,
        hourNum: 2,
        completed: false,
        description: 'תרגיל 1',
        rawData: JSON.stringify({ homeWork: 'תרגיל 1' })
      }
    ]

    const originalFetch = global.fetch
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/homework')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ homework: mockHomework })
        })
      }
      if (url.includes('/api/webtop/config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ configured: true, linkedChildren: [] })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    }) as unknown as typeof fetch

    const parentUser: User = {
      id: 'p1',
      username: 'parent',
      role: 'user',
      familyRole: 'parent',
      firstName: 'P',
      lastName: 'U'
    }

    const childUser: User = {
      id: 'c1',
      username: 'child',
      role: 'user',
      familyRole: 'child',
      linkedChildId: 'k1',
      firstName: 'C',
      lastName: 'U'
    }

    try {
      // 1. Render as Parent: student name badge is visible
      const { unmount } = render(<HomeworkPage token="test-token" currentUser={parentUser} />)
      expect(await screen.findByText('דניאל')).toBeInTheDocument()
      expect(screen.queryByTestId('homework-card-accent')).not.toBeInTheDocument()
      unmount()

      // 2. Render as Child: student name badge is hidden
      render(<HomeworkPage token="test-token" currentUser={childUser} />)
      await screen.findByText('חשבון')
      expect(screen.queryByText('דניאל')).not.toBeInTheDocument()
      expect(screen.queryByTestId('homework-card-accent')).not.toBeInTheDocument()
    } finally {
      global.fetch = originalFetch
    }
  })

  it('renders a visible clear button when search input has text and clears it on click', async () => {
    const originalFetch = global.fetch
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/homework')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            homework: [
              {
                id: 'hw-1',
                subject: 'חשבון',
                dueDate: '2026-03-01',
                description: 'תרגיל',
                rawData: JSON.stringify({ homeWork: 'תרגיל' })
              }
            ]
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ configured: true, linkedChildren: [] })
      })
    }) as unknown as typeof fetch

    try {
      render(<HomeworkPage token="test-token" />)
      await screen.findByText('חשבון')

      const searchInput = screen.getByPlaceholderText('homework.search_placeholder') as HTMLInputElement
      expect(screen.queryByLabelText('common.clear_search')).not.toBeInTheDocument()

      // Type in search input
      fireEvent.change(searchInput, { target: { value: 'חשבון' } })
      expect(searchInput.value).toBe('חשבון')

      // Clear button should now be visible
      const clearBtn = screen.getByLabelText('common.clear_search')
      expect(clearBtn).toBeInTheDocument()

      // Click clear button
      fireEvent.click(clearBtn)
      expect(searchInput.value).toBe('')
      expect(screen.queryByLabelText('common.clear_search')).not.toBeInTheDocument()
    } finally {
      global.fetch = originalFetch
    }
  })

  it('renders HomeworkPage with liquid glass child selector and round date picker', async () => {
    const originalFetch = global.fetch
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/homework')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ homework: [] })
        })
      }
      if (url.includes('/api/webtop/config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            configured: true,
            linkedChildren: [
              { id: 'k1', firstName: 'נועם', lastName: 'כהן' },
              { id: 'k2', firstName: 'מאיה', lastName: 'כהן' }
            ]
          })
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    }) as unknown as typeof fetch

    try {
      render(<HomeworkPage token="test-token" />)
      expect(await screen.findByRole('tablist', { name: /homework\.filter_child|Filter by student|סינון לפי תלמיד/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /homework\.all_short|All|הכל/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'נועם' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'מאיה' })).toBeInTheDocument()
      const dateBtn = screen.getByRole('button', { name: /common\.all_dates|All Dates|כל התאריכים/i })
      expect(dateBtn).toHaveAttribute('data-date-selected', 'false')
    } finally {
      global.fetch = originalFetch
    }
  })

  it('renders IncidentsPage with liquid glass child selector and round date picker', async () => {
    const originalFetch = global.fetch
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/incidents')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ incidents: [] })
        })
      }
      if (url.includes('/api/webtop/config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            configured: true,
            linkedChildren: [
              { id: 'k1', firstName: 'נועם', lastName: 'כהן' },
              { id: 'k2', firstName: 'מאיה', lastName: 'כהן' }
            ]
          })
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    }) as unknown as typeof fetch

    try {
      render(<IncidentsPage token="test-token" />)
      expect(await screen.findByRole('tablist', { name: /incidents\.filter_child|Filter by student|סינון לפי תלמיד/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /incidents\.all_short|All|הכל/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'נועם' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'מאיה' })).toBeInTheDocument()
      const dateBtn = screen.getByRole('button', { name: /common\.all_dates|All Dates|כל התאריכים/i })
      expect(dateBtn).toHaveAttribute('data-date-selected', 'false')
    } finally {
      global.fetch = originalFetch
    }
  })

  it('renders sticky selector filter row and non-sticky search field in HomeworkPage and IncidentsPage', async () => {
    const originalFetch = global.fetch
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/homework')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ homework: [] })
        })
      }
      if (url.includes('/api/incidents')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ incidents: [] })
        })
      }
      if (url.includes('/api/webtop/config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            configured: true,
            linkedChildren: [{ id: 'c1', firstName: 'נועם', lastName: 'כהן' }]
          })
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    }) as unknown as typeof fetch

    try {
      // 1. HomeworkPage
      const { unmount: unmountHw } = render(<HomeworkPage token="test-token" />)
      const hwSearchInput = await screen.findByPlaceholderText('homework.search_placeholder')
      const hwSearchWrapper = hwSearchInput.closest('.relative')
      expect(hwSearchWrapper?.className).not.toContain('sticky')

      const hwStickyFilters = document.querySelector('[data-sticky-filters]')
      expect(hwStickyFilters).toBeInTheDocument()
      expect(hwStickyFilters?.className).toContain('sticky')
      expect(hwStickyFilters?.className).toContain('top-0')
      expect(hwStickyFilters?.className).toContain('md:top-[61px]')
      expect(hwStickyFilters?.className).toContain('z-20')
      unmountHw()

      // 2. IncidentsPage
      render(<IncidentsPage token="test-token" />)
      const incSearchInput = await screen.findByPlaceholderText('incidents.search_placeholder')
      const incSearchWrapper = incSearchInput.closest('.relative')
      expect(incSearchWrapper?.className).not.toContain('sticky')

      const incStickyFilters = document.querySelector('[data-sticky-filters]')
      expect(incStickyFilters).toBeInTheDocument()
      expect(incStickyFilters?.className).toContain('sticky')
      expect(incStickyFilters?.className).toContain('top-0')
      expect(incStickyFilters?.className).toContain('md:top-[61px]')
      expect(incStickyFilters?.className).toContain('z-20')
    } finally {
      global.fetch = originalFetch
    }
  })
})

describe('Toast & ToastClose Component', () => {
  it('renders Toast with visible close button in the corner', () => {
    render(
      <ToastProvider>
        <Toast open={true}>
          <ToastTitle>Notification</ToastTitle>
          <ToastDescription>Task completed successfully</ToastDescription>
          <ToastClose data-testid="toast-close" />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    )

    expect(screen.getByText('Notification')).toBeInTheDocument()
    expect(screen.getByText('Task completed successfully')).toBeInTheDocument()

    const closeBtn = screen.getByTestId('toast-close')
    expect(closeBtn).toBeInTheDocument()
    expect(closeBtn).toHaveAttribute('aria-label', 'Close')
    // Should NOT have opacity-0 so it remains visible without hover
    expect(closeBtn.className).not.toContain('opacity-0')
    expect(closeBtn.className).toContain('opacity-80')
  })
})

