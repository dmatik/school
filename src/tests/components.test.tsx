import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { format } from 'date-fns'
import { IncidentsPage } from '../components/IncidentsPage'
import { HomeworkPage } from '../components/HomeworkPage'
import { DateBadge } from '../components/ui/date-badge'
import { DatePicker } from '../components/ui/date-picker'
import { Calendar } from '../components/ui/calendar'
import { Toast, ToastClose, ToastTitle, ToastDescription, ToastProvider, ToastViewport } from '../components/ui/toast'

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

  it('renders IncidentsPage with date sections, black incident type, lesson number in brackets, and no date inside card', async () => {
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

      // Lesson hour in brackets next to subject
      expect(screen.getByText(/\(incidents\.lesson_hour\)/)).toBeInTheDocument()
      expect(screen.queryByText(/• incidents\.lesson_hour/)).not.toBeInTheDocument()

      // No calendar icon inside the card
      const card = incType.closest('.rounded-xl')
      expect(card?.querySelector('svg[class*="lucide-calendar"]')).toBeNull()
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
      expect(prefix).toHaveClass('font-bold')

      const hwText = screen.getByText('עמוד 20 תרגילים 1-5')
      expect(hwText).toBeInTheDocument()
      expect(hwText).toHaveClass('font-normal')
      expect(hwText.parentElement).toHaveClass('bg-muted/40')
      expect(hwText.parentElement).toHaveClass('dark:bg-secondary/80')
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
      expect(screen.getByText(/\(homework\.lesson_hours\)/)).toBeInTheDocument()
      // The single hour indicator should NOT be rendered
      expect(screen.queryByText(/\(homework\.lesson_hour\)/)).not.toBeInTheDocument()

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
      expect(screen.getAllByText(/\(homework\.lesson_hour\)/)).toHaveLength(2)
      expect(screen.queryByText(/\(homework\.lesson_hours\)/)).not.toBeInTheDocument()
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
      headings.forEach((heading) => {
        const headerDiv = heading.parentElement
        // Header container should contain only the heading (no calendar icon container, no count badge)
        expect(headerDiv?.querySelectorAll('span')).toHaveLength(0)
        expect(headerDiv?.querySelectorAll('svg')).toHaveLength(0)
      })
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

