import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { format } from 'date-fns'
import { IncidentsPage } from '../components/IncidentsPage'
import { HomeworkPage } from '../components/HomeworkPage'
import { DateBadge } from '../components/ui/date-badge'
import { DatePicker } from '../components/ui/date-picker'
import { LiquidDatePicker } from '../components/ui/liquid-date-picker'
import { PageHeader } from '../components/ui/page-header'
import { MobileHeader, LastSyncedLabel } from '../components/ui/mobile-header'
import { SyncButton } from '../components/ui/sync-button'
import { ActionButton, EditButton, DestructiveButton } from '../components/ui/action-button'
import { AppSidebar, SidebarNavButton, type SidebarNavItem } from '../components/ui/app-sidebar'
import { LiquidDock, LiquidDockItem, type DockItem } from '../components/ui/liquid-dock'
import { SectionDateHeader } from '../components/ui/section-date-header'
import { HomeworkCard } from '../components/ui/homework-card'
import { IncidentCard } from '../components/ui/incident-card'
import { ExamCard } from '../components/ui/exam-card'
import { SelectField, SelectItem } from '../components/ui/select'
import { InfoBox, InfoItem } from '../components/ui/info-box'
import { SectionCard, SectionCardHeader, SectionCardTitle, SectionCardDescription, SectionCardContent } from '../components/ui/section-card'
import { ScheduleTable } from '../components/ui/schedule-table'
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

describe('LiquidDatePicker Component', () => {
  it('renders default placeholder and data-date-selected="false" when no date is set', () => {
    render(<LiquidDatePicker setDate={() => {}} />)
    const btn = screen.getByRole('button', { name: /common\.all_dates|All Dates|כל התאריכים/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('data-date-selected', 'false')
  })

  it('renders localized date with responsive short/full labels when date is set', () => {
    const testDate = new Date(2026, 9, 28)
    render(<LiquidDatePicker date={testDate} setDate={() => {}} />)
    const btn = screen.getByRole('button', { name: /Wednesday.*October 28|יום רביעי.*28 באוקטובר/i })
    expect(btn).toHaveAttribute('data-date-selected', 'true')
    expect(screen.getByText('28/10/2026')).toHaveClass('md:hidden')
  })

  it('handles clearing selected date', () => {
    const handleSetDate = vi.fn()
    const testDate = new Date(2026, 9, 28)
    render(<LiquidDatePicker date={testDate} setDate={handleSetDate} />)
    const clearBtn = screen.getByRole('button', { name: /cancel|ביטול/i })
    expect(clearBtn).toBeInTheDocument()
    fireEvent.click(clearBtn)
    expect(handleSetDate).toHaveBeenCalledWith(undefined)
  })
})

describe('PageHeader Component', () => {
  it('renders title and data-page-title attribute', () => {
    const { container } = render(<PageHeader title="Test Title" />)
    const header = container.querySelector('[data-page-title]')
    expect(header).toBeInTheDocument()
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('renders description and action slot when provided', () => {
    render(
      <PageHeader
        title="Main Title"
        description="Subtitle info"
        actions={<button type="button">Action</button>}
      />
    )
    expect(screen.getByText('Subtitle info')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
  })
})

describe('MobileHeader Component', () => {
  it('renders title, avatar button, and action slot', () => {
    const handleAvatarClick = vi.fn()
    render(
      <MobileHeader
        title="Mobile Page"
        username="Test User"
        onAvatarClick={handleAvatarClick}
        action={<button type="button">Sync</button>}
      />
    )

    expect(screen.getByText('Mobile Page')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sync' })).toBeInTheDocument()

    const avatarBtn = screen.getByRole('button', { name: /common\.account|חשבון/i })
    expect(avatarBtn).toBeInTheDocument()
    fireEvent.click(avatarBtn)
    expect(handleAvatarClick).toHaveBeenCalledTimes(1)
  })

  it('applies border styling when scrolled', () => {
    const { container, rerender } = render(<MobileHeader title="Page" isScrolled={false} />)
    expect(container.querySelector('header')?.className).toContain('border-transparent')

    rerender(<MobileHeader title="Page" isScrolled={true} />)
    expect(container.querySelector('header')?.className).toContain('border-border/50')
  })

  it('renders last synced timestamp centered below title without expanding center container height', () => {
    const { container } = render(
      <MobileHeader
        title="שיעורי בית"
        lastSyncedAt={new Date(2026, 10, 13, 16, 20, 0)}
        username="Test User"
      />
    )
    const label = container.querySelector('[data-last-synced]')
    expect(label).toBeInTheDocument()
    expect(label?.textContent).toContain('13/11/2026 16:20')
    expect(label?.querySelector('svg')).toBeInTheDocument()
    expect(label?.parentElement?.className).toContain('h-9')
    expect(label?.parentElement?.className).toContain('flex-col')
    expect(label?.parentElement?.className).toContain('items-center')
    expect(label?.parentElement?.className).toContain('justify-center')
  })

  it('omits LastSyncedLabel when lastSyncedAt is null or invalid', () => {
    const { container, rerender } = render(<LastSyncedLabel lastSyncedAt={null} />)
    expect(container.querySelector('[data-last-synced]')).not.toBeInTheDocument()

    rerender(<LastSyncedLabel lastSyncedAt="invalid-date" />)
    expect(container.querySelector('[data-last-synced]')).not.toBeInTheDocument()
  })
})

describe('SyncButton Component', () => {
  it('renders idle sync button and triggers onClick', () => {
    const handleClick = vi.fn()
    render(<SyncButton onClick={handleClick} />)
    const btn = screen.getByRole('button', { name: /common\.sync_now|סנכרן/i })
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders spinning icon and disabled state when syncing', () => {
    render(<SyncButton syncing={true} />)
    const btn = screen.getByRole('button', { name: /common\.syncing|מסנכרן/i })
    expect(btn).toBeDisabled()
    expect(btn.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders checkmark and success classes when success=true', () => {
    render(<SyncButton success={true} summary="Synced 5 items" />)
    const btn = screen.getByRole('button', { name: /Synced 5 items|common\.sync_success|סונכרן/i })
    expect(btn.className).toContain('text-emerald-600')
  })

  it('renders outline pill variant with text and animated state changes', () => {
    const handleClick = vi.fn()
    const { rerender } = render(
      <SyncButton variant="outline" onClick={handleClick} label="סנכרן מול Webtop" />
    )
    const btn = screen.getByRole('button', { name: /סנכרן מול Webtop/i })
    expect(btn).toBeInTheDocument()
    expect(btn.className).toContain('rounded-full')
    fireEvent.click(btn)
    expect(handleClick).toHaveBeenCalledTimes(1)

    // Syncing state
    rerender(<SyncButton variant="outline" syncing={true} syncingLabel="מסנכרן כעת..." />)
    expect(screen.getByText('מסנכרן כעת...')).toBeInTheDocument()
    expect(btn).toBeDisabled()

    // Success state
    rerender(<SyncButton variant="outline" success={true} successLabel="סונכרן בהצלחה" />)
    expect(screen.getByText('סונכרן בהצלחה')).toBeInTheDocument()
    expect(btn.className).toContain('border-[#2CA58D]/50')
  })
})

describe('ActionButton, EditButton & DestructiveButton Components', () => {
  it('renders ActionButton with custom icon and triggers onClick', () => {
    const handleClick = vi.fn()
    render(
      <ActionButton onClick={handleClick}>
        ביצוע פעולה
      </ActionButton>
    )
    const btn = screen.getByRole('button', { name: /ביצוע פעולה/i })
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders EditButton with pencil icon and default text', () => {
    const handleClick = vi.fn()
    render(<EditButton onClick={handleClick} />)
    const btn = screen.getByRole('button', { name: /עריכה|common\.edit/i })
    expect(btn).toBeInTheDocument()
    expect(btn.className).toContain('text-muted-foreground')
    fireEvent.click(btn)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders DestructiveButton with trash icon and destructive styling', () => {
    const handleClick = vi.fn()
    render(
      <DestructiveButton onClick={handleClick}>
        נתק חיבור
      </DestructiveButton>
    )
    const btn = screen.getByRole('button', { name: /נתק חיבור/i })
    expect(btn).toBeInTheDocument()
    expect(btn.className).toContain('text-destructive')
    fireEvent.click(btn)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})

describe('AppSidebar Component', () => {
  const DummyIcon = ({ className }: { className?: string }) => <svg data-testid="dummy-icon" className={className} />
  const mockNavItems: SidebarNavItem[] = [
    { tab: 'homework', label: 'Homework', icon: DummyIcon },
    { tab: 'incidents', label: 'Incidents', icon: DummyIcon, badge: <span data-testid="test-badge">3</span> },
    { tab: 'settings', label: 'Settings', icon: DummyIcon },
  ]

  const mockUser = {
    username: 'johndoe',
    firstName: 'John',
    lastName: 'Doe',
    avatar: null,
    role: 'user',
  }

  it('renders app title, user display name, nav items, and version', () => {
    render(
      <AppSidebar
        currentUser={mockUser}
        activeTab="homework"
        onTabChange={vi.fn()}
        navItems={mockNavItems}
        version="1.4.2"
        syncAction={<button type="button">Sync Now</button>}
      />
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Homework')).toBeInTheDocument()
    expect(screen.getByText('Incidents')).toBeInTheDocument()
    expect(screen.getByTestId('test-badge')).toBeInTheDocument()
    expect(screen.getByText('v1.4.2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sync Now' })).toBeInTheDocument()
  })

  it('triggers onTabChange when nav item is clicked', () => {
    const handleTabChange = vi.fn()
    render(
      <AppSidebar
        currentUser={mockUser}
        activeTab="homework"
        onTabChange={handleTabChange}
        navItems={mockNavItems}
      />
    )

    const incidentsBtn = screen.getByRole('button', { name: /Incidents/i })
    fireEvent.click(incidentsBtn)
    expect(handleTabChange).toHaveBeenCalledWith('incidents')
  })

  it('triggers onProfileClick or onTabChange("account") when avatar button is clicked', () => {
    const handleTabChange = vi.fn()
    const { rerender } = render(
      <AppSidebar
        currentUser={mockUser}
        activeTab="homework"
        onTabChange={handleTabChange}
        navItems={mockNavItems}
      />
    )

    const avatarBtn = screen.getByRole('button', { name: /common\.account|חשבון/i })
    fireEvent.click(avatarBtn)
    expect(handleTabChange).toHaveBeenCalledWith('account')

    const customProfileClick = vi.fn()
    rerender(
      <AppSidebar
        currentUser={mockUser}
        activeTab="homework"
        onTabChange={handleTabChange}
        onProfileClick={customProfileClick}
        navItems={mockNavItems}
      />
    )

    fireEvent.click(avatarBtn)
    expect(customProfileClick).toHaveBeenCalledTimes(1)
  })

  it('renders SidebarNavButton with active and inactive styles', () => {
    const handleClick = vi.fn()
    const { rerender } = render(
      <SidebarNavButton
        active={false}
        onClick={handleClick}
        icon={DummyIcon}
        label="Test Item"
      />
    )

    const btn = screen.getByRole('button', { name: 'Test Item' })
    expect(btn.className).toContain('text-muted-foreground')

    rerender(
      <SidebarNavButton
        active={true}
        onClick={handleClick}
        icon={DummyIcon}
        label="Test Item"
      />
    )

    expect(btn.className).toContain('bg-primary/10')
  })
})

describe('LiquidDock Component', () => {
  const DummyIcon = ({ className }: { className?: string }) => <svg data-testid="dock-dummy-icon" className={className} />
  const mockDockItems: DockItem[] = [
    { tab: 'homework', label: 'Homework', icon: DummyIcon },
    { tab: 'incidents', label: 'Incidents', icon: DummyIcon, badge: <span data-testid="dock-badge">5</span> },
    { tab: 'exams', label: 'Exams', icon: DummyIcon },
    { tab: 'schedule', label: 'Schedule', icon: DummyIcon },
    { tab: 'settings', label: 'Settings', icon: DummyIcon },
  ]

  it('renders all navigation items, labels, and badges', () => {
    const handleTabChange = vi.fn()
    render(
      <LiquidDock
        items={mockDockItems}
        activeTab="homework"
        onTabChange={handleTabChange}
      />
    )

    expect(screen.getByText('Homework')).toBeInTheDocument()
    expect(screen.getByText('Incidents')).toBeInTheDocument()
    expect(screen.getByText('Exams')).toBeInTheDocument()
    expect(screen.getByText('Schedule')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByTestId('dock-badge')).toBeInTheDocument()
  })

  it('triggers onTabChange when dock button is clicked', () => {
    const handleTabChange = vi.fn()
    render(
      <LiquidDock
        items={mockDockItems}
        activeTab="homework"
        onTabChange={handleTabChange}
      />
    )

    const incidentsBtn = screen.getByRole('button', { name: /Incidents/i })
    fireEvent.click(incidentsBtn)
    expect(handleTabChange).toHaveBeenCalledWith('incidents')
  })

  it('renders active pill on active item and inactive styling on others', () => {
    const { container } = render(
      <LiquidDock
        items={mockDockItems}
        activeTab="homework"
        onTabChange={vi.fn()}
      />
    )

    const activePill = container.querySelector('.apple-liquid-pill')
    expect(activePill).toBeInTheDocument()

    const activeBtn = screen.getByRole('button', { name: /Homework/i })
    expect(activeBtn.className).toContain('text-primary')

    const inactiveBtn = screen.getByRole('button', { name: /Exams/i })
    expect(inactiveBtn.className).toContain('text-foreground')
  })

  it('renders LiquidDockItem independently with correct sizing for 5+ items', () => {
    const handleClick = vi.fn()
    const { rerender } = render(
      <LiquidDockItem
        active={false}
        onClick={handleClick}
        icon={DummyIcon}
        label="Tab"
        isFiveOrMore={false}
      />
    )

    const btn = screen.getByRole('button', { name: 'Tab' })
    expect(btn.className).toContain('w-[85px]')

    rerender(
      <LiquidDockItem
        active={true}
        onClick={handleClick}
        icon={DummyIcon}
        label="Tab"
        isFiveOrMore={true}
      />
    )

    expect(btn.className).toContain('w-[68px]')
    expect(btn.className).toContain('text-primary')
  })
})

describe('SectionDateHeader Component', () => {
  it('renders today, yesterday, and tomorrow relative dates', () => {
    const today = new Date()
    const yesterday = new Date(Date.now() - 86400000)
    const tomorrow = new Date(Date.now() + 86400000)

    const { rerender } = render(<SectionDateHeader date={today} />)
    expect(screen.getByText(/common\.today|היום|Today/i)).toBeInTheDocument()

    rerender(<SectionDateHeader date={yesterday} />)
    expect(screen.getByText(/common\.yesterday|אתמול|Yesterday/i)).toBeInTheDocument()

    rerender(<SectionDateHeader date={tomorrow} />)
    expect(screen.getByText(/common\.tomorrow|מחר|Tomorrow/i)).toBeInTheDocument()
  })

  it('renders localized weekday and date for specific date string', () => {
    // 2026-10-28 was a Wednesday
    render(<SectionDateHeader date="2026-10-28" />)
    expect(screen.getByText(/Wednesday|רביעי/i)).toBeInTheDocument()
    expect(screen.getByText(/28/)).toBeInTheDocument()
  })

  it('renders custom element tag when "as" prop is provided', () => {
    const { container } = render(<SectionDateHeader date="2026-10-28" as="h3" />)
    const h3 = container.querySelector('h3')
    expect(h3).toBeInTheDocument()
  })

  it('renders nothing when date is null or empty', () => {
    const { container } = render(<SectionDateHeader date={null} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('HomeworkCard Component', () => {
  it('renders subject, lesson hour subtitle, teacher, child badge, and homework text', () => {
    render(
      <HomeworkCard
        subject="Mathematics"
        lessonHour={3}
        teacher="Rachel Levi"
        childName="Itay"
        childColorId="blue"
        homeworkText="Solve exercises 1 to 10 on page 45"
      />
    )

    expect(screen.getByText('Mathematics')).toBeInTheDocument()
    expect(screen.getByText(/homework\.lesson_hour|3/i)).toBeInTheDocument()
    expect(screen.getByText('Rachel Levi')).toBeInTheDocument()
    expect(screen.getByText('Itay')).toBeInTheDocument()
    expect(screen.getByText(/Solve exercises 1 to 10 on page 45/)).toBeInTheDocument()
  })

  it('renders merged lesson hours', () => {
    render(
      <HomeworkCard
        subject="English"
        lessonHours={[2, 3]}
        teacher="Sarah Cohen"
      />
    )

    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText(/homework\.lesson_hours|2, 3/i)).toBeInTheDocument()
  })

  it('omits child badge when childName is null', () => {
    const { container } = render(
      <HomeworkCard
        subject="History"
        childName={null}
        homeworkText="Read pages 10-12"
      />
    )

    expect(container.querySelector('[data-testid="child-badge"]')).toBeNull()
    expect(screen.getByText('History')).toBeInTheDocument()
  })
})

describe('IncidentCard Component', () => {
  it('renders subject, type, lesson hour, teacher, child badge, and description', () => {
    render(
      <IncidentCard
        subject="Science"
        type="Missing Homework"
        hourNum={4}
        teacher="Yossi Avraham"
        childName="Maya"
        childColorId="emerald"
        description="Did not submit the science report"
      />
    )

    expect(screen.getByText('Science')).toBeInTheDocument()
    expect(screen.getByText(/incidents\.lesson_hour|4/i)).toBeInTheDocument()
    expect(screen.getByText('Yossi Avraham')).toBeInTheDocument()
    expect(screen.getByText('Maya')).toBeInTheDocument()
    expect(screen.getByText('Missing Homework')).toBeInTheDocument()
    expect(screen.getByText(/Did not submit the science report/)).toBeInTheDocument()
  })

  it('renders type as title when subject is omitted', () => {
    render(
      <IncidentCard
        type="Late Arrival"
        hourNum={1}
        teacher="Sara Israeli"
        description="Arrived 15 minutes late"
      />
    )

    expect(screen.getByText('Late Arrival')).toBeInTheDocument()
    expect(screen.getByText(/Arrived 15 minutes late/)).toBeInTheDocument()
  })

  it('omits child badge when childName is null', () => {
    const { container } = render(
      <IncidentCard
        subject="English"
        type="Disruption"
        childName={null}
        description="Talking without permission"
      />
    )

    expect(container.querySelector('[data-testid="child-badge"]')).toBeNull()
    expect(screen.getByText('English')).toBeInTheDocument()
  })
})

describe('ExamCard Component', () => {
  it('renders name, formatted date, grade badge, child badge, and description', () => {
    render(
      <ExamCard
        name="Mathematics Exam"
        date="2026-11-20"
        grade="95"
        childName="Itay"
        childColorId="blue"
        description="Fractions and geometry"
      />
    )

    expect(screen.getByText('Mathematics Exam')).toBeInTheDocument()
    expect(screen.getByText('20/11/2026')).toBeInTheDocument()
    expect(screen.getByText(/exams\.grade_badge|95/i)).toBeInTheDocument()
    expect(screen.getByText('Itay')).toBeInTheDocument()
    expect(screen.getByText('Fractions and geometry')).toBeInTheDocument()
  })

  it('renders edit button and calls onEdit when clicked', () => {
    const handleEdit = vi.fn()
    render(
      <ExamCard
        name="History Exam"
        date="2026-11-25"
        onEdit={handleEdit}
      />
    )

    expect(screen.getByText('History Exam')).toBeInTheDocument()
    const editBtn = screen.getByRole('button')
    fireEvent.click(editBtn)
    expect(handleEdit).toHaveBeenCalledTimes(1)
  })

  it('omits child badge when childName is null', () => {
    const { container } = render(
      <ExamCard
        name="Science Quiz"
        childName={null}
      />
    )

    expect(container.querySelector('[data-testid="child-badge"]')).toBeNull()
    expect(screen.getByText('Science Quiz')).toBeInTheDocument()
  })
})

describe('ScheduleTable Component', () => {
  const lessons = [
    { dayOfWeek: 0, hourNum: 1, subject: 'Math' },
    { dayOfWeek: 1, hourNum: 3, subject: 'English' },
  ]
  const finishTimes = [{ dayOfWeek: 0, finishTime: '13:30' }]

  it('renders 6 day headers, lesson subjects, finish times and only populated hours in view mode', () => {
    const { container } = render(
      <ScheduleTable lessons={lessons} finishTimes={finishTimes} currentDayOfWeek={0} />
    )
    expect(container.querySelectorAll('[data-schedule-day]')).toHaveLength(6)
    expect(screen.getByText('Math')).toBeInTheDocument()
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('13:30')).toBeInTheDocument()
    expect(screen.getAllByText('--:--')).toHaveLength(5)
    // Hours 1..3 rendered (highest populated is 3), no extra row
    const dismissal = container.querySelector('[data-schedule-dismissal]')
    expect(dismissal).toBeTruthy()
    const lessonRows = dismissal!.previousElementSibling!.children
    expect(lessonRows).toHaveLength(3)
  })

  it('renders one extra empty row in edit mode', () => {
    const { container } = render(
      <ScheduleTable lessons={lessons} finishTimes={finishTimes} isEditMode canEdit />
    )
    const lessonRows = container.querySelector('[data-schedule-dismissal]')!.previousElementSibling!.children
    expect(lessonRows).toHaveLength(4)
  })

  it('marks today column with a badge only for the current day', () => {
    render(<ScheduleTable lessons={lessons} finishTimes={finishTimes} currentDayOfWeek={2} />)
    expect(screen.getAllByText(/schedule\.today_badge|היום|Today/i)).toHaveLength(1)
  })

  it('invokes onLessonClick and onFinishTimeClick with the correct day/hour', () => {
    const onLessonClick = vi.fn()
    const onFinishTimeClick = vi.fn()
    const { container } = render(
      <ScheduleTable
        lessons={lessons}
        finishTimes={finishTimes}
        isEditMode
        canEdit
        onLessonClick={onLessonClick}
        onFinishTimeClick={onFinishTimeClick}
      />
    )
    fireEvent.click(screen.getByText('English'))
    expect(onLessonClick).toHaveBeenCalledWith(1, 3)

    const dismissalCells = container.querySelector('[data-schedule-dismissal]')!.children
    fireEvent.click(dismissalCells[4])
    expect(onFinishTimeClick).toHaveBeenCalledWith(4)
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

describe('SectionCard Component', () => {
  it('renders with unified container styling matching HomeworkCard, IncidentCard, and ExamCard', () => {
    const { container } = render(
      <SectionCard title="Test Title" description="Test Description">
        <div>Card Body Content</div>
      </SectionCard>
    )

    const card = container.firstChild as HTMLElement
    expect(card).toBeInTheDocument()
    expect(card.className).toContain('rounded-2xl')
    expect(card.className).toContain('bg-card')
    expect(card.className).toContain('border-border/40')
    expect(card.className).toContain('shadow-xs')
  })

  it('renders icon, title, description, and action slot in header', () => {
    render(
      <SectionCard
        title="Appearance Settings"
        description="Configure theme and language"
        icon={<span data-testid="custom-icon">Icon</span>}
        action={<button data-testid="custom-action">Edit</button>}
      >
        <div>Settings Content</div>
      </SectionCard>
    )

    expect(screen.getByText('Appearance Settings')).toBeInTheDocument()
    expect(screen.getByText('Configure theme and language')).toBeInTheDocument()
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    expect(screen.getByTestId('custom-action')).toBeInTheDocument()
    expect(screen.getByText('Settings Content')).toBeInTheDocument()
  })

  it('supports compound subcomponents for custom structure', () => {
    render(
      <SectionCard>
        <SectionCardHeader>
          <SectionCardTitle>Compound Title</SectionCardTitle>
          <SectionCardDescription>Compound Description</SectionCardDescription>
        </SectionCardHeader>
        <SectionCardContent>
          <div>Compound Content</div>
        </SectionCardContent>
      </SectionCard>
    )

    expect(screen.getByText('Compound Title')).toBeInTheDocument()
    expect(screen.getByText('Compound Description')).toBeInTheDocument()
    expect(screen.getByText('Compound Content')).toBeInTheDocument()
  })
})

describe('SelectField Component', () => {
  it('renders with optional label and secondary description in responsive layout', () => {
    render(
      <SelectField
        id="test-lang-select"
        label="Language Label"
        description="Select your preferred language"
        defaultValue="he"
        layout="responsive"
        variant="filled"
      >
        <SelectItem value="he">Hebrew</SelectItem>
        <SelectItem value="en">English</SelectItem>
      </SelectField>
    )

    expect(screen.getByText('Language Label')).toBeInTheDocument()
    expect(screen.getByText('Select your preferred language')).toBeInTheDocument()
    const combobox = screen.getByRole('combobox', { name: 'Language Label' })
    expect(combobox).toBeInTheDocument()
    expect(combobox.className).toContain('bg-muted')
  })

  it('renders in stacked layout with full width trigger below description', () => {
    const { container } = render(
      <SelectField
        id="test-theme-select"
        label="Theme Label"
        description="Choose theme"
        defaultValue="system"
        layout="stacked"
        variant="filled"
      >
        <SelectItem value="system">System</SelectItem>
      </SelectField>
    )

    expect(screen.getByText('Theme Label')).toBeInTheDocument()
    expect(screen.getByText('Choose theme')).toBeInTheDocument()
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('space-y-2')
  })

  it('renders cleanly when label and description are omitted (keeping them optional)', () => {
    render(
      <SelectField defaultValue="system" ariaLabel="Standalone Select">
        <SelectItem value="system">System</SelectItem>
      </SelectField>
    )

    const combobox = screen.getByRole('combobox', { name: 'Standalone Select' })
    expect(combobox).toBeInTheDocument()
    expect(screen.queryByRole('label')).toBeNull()
  })
})

describe('InfoBox & InfoItem Component', () => {
  it('renders grid container with elevated secondary dark background and key-value items', () => {
    const { container } = render(
      <InfoBox columns={2}>
        <InfoItem label="Webtop Username" value="KQT460" />
        <InfoItem label="Last Synced" value="11/11/2026, 18:56:07" isLtr />
      </InfoBox>
    )

    const grid = container.firstChild as HTMLElement
    expect(grid).toBeInTheDocument()
    expect(grid.className).toContain('grid')
    expect(grid.className).toContain('bg-muted/40')
    expect(grid.className).toContain('dark:bg-secondary/80')
    expect(grid.className).toContain('rounded-xl')

    expect(screen.getByText('Webtop Username')).toBeInTheDocument()
    expect(screen.getByText('KQT460')).toBeInTheDocument()
    expect(screen.getByText('Last Synced')).toBeInTheDocument()
    expect(screen.getByText('11/11/2026, 18:56:07')).toBeInTheDocument()
  })

  it('supports array items prop and custom column counts', () => {
    const { container } = render(
      <InfoBox
        columns={3}
        items={[
          { label: 'Col 1', value: 'Val 1' },
          { label: 'Col 2', value: 'Val 2' },
          { label: 'Col 3', value: 'Val 3' },
        ]}
      />
    )

    const grid = container.firstChild as HTMLElement
    expect(grid.className).toContain('sm:grid-cols-3')
    expect(screen.getByText('Col 1')).toBeInTheDocument()
    expect(screen.getByText('Val 1')).toBeInTheDocument()
    expect(screen.getByText('Col 3')).toBeInTheDocument()
  })
})




