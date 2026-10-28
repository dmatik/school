import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
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
})

