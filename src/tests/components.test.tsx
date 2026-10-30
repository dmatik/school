import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { format } from 'date-fns'
import { IncidentsPage } from '../components/IncidentsPage'
import { HomeworkPage } from '../components/HomeworkPage'
import { DateBadge } from '../components/ui/date-badge'
import { DatePicker } from '../components/ui/date-picker'
import { Calendar } from '../components/ui/calendar'

describe('Calendar Component', () => {
  it('renders today with distinct highlight class when unselected', () => {
    const { container } = render(<Calendar mode="single" />)
    const todayCell = container.querySelector('[data-today="true"]')
    expect(todayCell).toBeTruthy()
    expect(todayCell?.className).toContain('[&:not([data-selected])]:border-primary/60')
    expect(todayCell?.className).toContain('[&:not([data-selected])]:text-primary')
  })

  it('renders selected date cleanly without conflicting today text color', () => {
    const today = new Date()
    const { container } = render(<Calendar mode="single" selected={today} />)
    const selectedCell = container.querySelector('[data-selected="true"]')
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
})

